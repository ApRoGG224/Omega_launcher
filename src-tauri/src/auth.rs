use std::sync::{Arc, Mutex};
use std::error::Error;
use std::net::{IpAddr, SocketAddr};

use reqwest::header::{ACCEPT, ACCEPT_ENCODING};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};
use base64::Engine as _;

use crate::util::app_data_dir;

const CLIENT_ID: &str = "00000000402b5328";
const REDIRECT_URI: &str = "https://login.live.com/oauth20_desktop.srf";
const MINECRAFT_SERVICES_IPV4: &str = "150.171.109.53";

fn auth_client() -> Result<reqwest::Client, String> {
    let minecraft_services_ip: IpAddr = MINECRAFT_SERVICES_IPV4
        .parse()
        .map_err(|e| format!("Auth host resolution failed: {e}"))?;
    let minecraft_services_addr = SocketAddr::new(minecraft_services_ip, 443);

    reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(15))
        .timeout(std::time::Duration::from_secs(45))
        .resolve("api.minecraftservices.com", minecraft_services_addr)
        .build()
        .map_err(|e| format!("Auth client setup failed: {e}"))
}

fn emit_auth_log(app: &AppHandle, message: &str) {
    let _ = app.emit("auth-log", message.to_string());
}

fn format_reqwest_error(context: &str, err: &reqwest::Error) -> String {
    let mut details = Vec::new();
    if err.is_connect() {
        details.push("connect");
    }
    if err.is_timeout() {
        details.push("timeout");
    }
    if err.is_request() {
        details.push("request");
    }
    if err.is_body() {
        details.push("body");
    }
    if err.is_decode() {
        details.push("decode");
    }

    let kind = if details.is_empty() {
        "unknown".to_string()
    } else {
        details.join(", ")
    };

    let source = err.source().map(|e| e.to_string()).unwrap_or_default();
    if source.is_empty() {
        format!("{context} failed ({kind}): {err}")
    } else {
        format!("{context} failed ({kind}): {err}; source: {source}")
    }
}

async fn json_response(res: reqwest::Response, context: &str) -> Result<Value, String> {
    let status = res.status();
    let bytes = res
        .bytes()
        .await
        .map_err(|e| format!("{context} response read failed ({status}): {e}"))?;
    let body = String::from_utf8_lossy(&bytes);

    if !status.is_success() {
        return Err(format!("{context} failed ({status}): {body}"));
    }

    serde_json::from_slice::<Value>(&bytes).map_err(|e| {
        let preview: String = body.chars().take(500).collect();
        format!("{context} returned invalid JSON ({status}): {e}; body: {preview}")
    })
}

async fn exchange_code(code: &str) -> Result<(String, String, String), String> {
    let client = auth_client()?;
    let res = send_with_retry(
        || {
            client
                .post("https://login.live.com/oauth20_token.srf")
                .header(ACCEPT, "application/json")
                .header(ACCEPT_ENCODING, "identity")
                .form(&[
                    ("client_id", CLIENT_ID),
                    ("code", code),
                    ("grant_type", "authorization_code"),
                    ("redirect_uri", REDIRECT_URI),
                    ("scope", "XboxLive.signin offline_access"),
                ])
        },
        "Token exchange",
        None,
    )
    .await?;
    let json = json_response(res, "Microsoft token exchange").await?;
    let access_token = json.get("access_token").and_then(|v| v.as_str()).ok_or("No access_token in response")?.to_string();
    let refresh_token = json.get("refresh_token").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let expires_in = json.get("expires_in").and_then(|v| v.as_u64()).unwrap_or(3600);
    Ok((access_token, refresh_token, expires_in.to_string()))
}

/// Reads the cached Microsoft auth file, refreshing the access token via the
/// saved refresh token when it has expired. Returns `true` when a refresh was
/// performed, `false` when nothing needed refreshing.
pub async fn try_refresh_cached_token(app: &AppHandle) -> Result<bool, String> {
    try_refresh_cached_token_internal(app, false).await
}

pub async fn try_refresh_cached_token_forced(app: &AppHandle) -> Result<bool, String> {
    try_refresh_cached_token_internal(app, true).await
}

async fn try_refresh_cached_token_internal(app: &AppHandle, force: bool) -> Result<bool, String> {
    let path = app_data_dir(app).join("ms_auth.json");
    let text = match std::fs::read_to_string(&path) {
        Ok(t) => t,
        Err(_) => return Ok(false),
    };
    let Ok(json) = serde_json::from_str::<Value>(&text) else {
        return Ok(false);
    };
    let Some(refresh_token) = json.get("refresh_token").and_then(|v| v.as_str()) else {
        return Ok(false);
    };
    if refresh_token.is_empty() {
        return Ok(false);
    }
    let expired = json
        .get("expires_on")
        .and_then(|v| v.as_u64())
        .map(|exp| exp <= now_unix())
        .unwrap_or(true);

    if !force && !expired {
        return Ok(false);
    }

    let client = auth_client()?;
    let res = send_with_retry(
        || {
            client
                .post("https://login.live.com/oauth20_token.srf")
                .header(ACCEPT, "application/json")
                .header(ACCEPT_ENCODING, "identity")
                .form(&[
                    ("client_id", CLIENT_ID),
                    ("refresh_token", refresh_token),
                    ("grant_type", "refresh_token"),
                    ("redirect_uri", REDIRECT_URI),
                    ("scope", "XboxLive.signin offline_access"),
                ])
        },
        "Token refresh",
        None,
    )
    .await?;
    let data = json_response(res, "Token refresh").await?;
    let microsoft_access_token = data
        .get("access_token")
        .and_then(|v| v.as_str())
        .ok_or("No access_token in refresh response")?
        .to_string();
    let new_refresh = data
        .get("refresh_token")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| refresh_token.to_string());
    let expires_in = data.get("expires_in").and_then(|v| v.as_u64()).unwrap_or(3600);

    // The refresh endpoint returns a Microsoft token, while Minecraft profile
    // and launch APIs require a fresh Minecraft token obtained through Xbox.
    let (xsts_token, uhs) = xbox_authenticate(&microsoft_access_token).await?;
    let (minecraft_access_token, name, uuid) = minecraft_login(app, &xsts_token, &uhs).await?;

    let mut updated = json;
    updated["access_token"] = Value::String(minecraft_access_token);
    updated["name"] = Value::String(name);
    updated["uuid"] = Value::String(uuid);
    updated["refresh_token"] = Value::String(new_refresh);
    updated["expires_on"] = Value::Number(serde_json::Number::from(now_unix() + expires_in as u64));
    write_auth_file(app, &updated)?;
    Ok(true)
}

fn now_unix() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// Reads the cached Microsoft auth object, if any.
pub fn read_cached_auth(app: &AppHandle) -> Option<Value> {
    let path = app_data_dir(app).join("ms_auth.json");
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

/// Returns the official skin texture URL for the cached Microsoft account.
/// The access token stays in Rust and is never exposed to the frontend.
#[tauri::command]
pub async fn get_microsoft_skin(app: AppHandle, username: String) -> Result<Option<String>, String> {
    // The cached Minecraft token is short-lived. Refresh it before querying
    // the profile so the preview also works after a long launcher restart.
    try_refresh_cached_token(&app).await?;
    let auth = read_cached_auth(&app).ok_or("Microsoft account is not cached")?;
    let cached_name = auth.get("name").and_then(|value| value.as_str()).unwrap_or("");
    if cached_name != username {
        return Err("Cached Microsoft account does not match the selected account".to_string());
    }

    let access_token = auth
        .get("access_token")
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
        .ok_or("Microsoft access token is missing")?;
    let client = auth_client()?;
    let response = send_with_retry(
        || {
            client
                .get("https://api.minecraftservices.com/minecraft/profile")
                .header(ACCEPT, "application/json")
                .header(ACCEPT_ENCODING, "identity")
                .bearer_auth(access_token)
        },
        "Microsoft skin profile",
        Some(&app),
    )
    .await?;
    let profile = json_response(response, "Microsoft skin profile").await?;

    Ok(profile
        .get("skins")
        .and_then(|value| value.as_array())
        .and_then(|skins| {
            skins.iter().find_map(|skin| {
                skin.get("url")
                    .and_then(|value| value.as_str())
                    .filter(|url| !url.is_empty())
                    .map(|url| url.replacen("http://", "https://", 1))
            })
        }))
}

#[tauri::command]
pub fn logout_microsoft(app: AppHandle) -> Result<(), String> {
    let path = app_data_dir(&app).join("ms_auth.json");
    match std::fs::remove_file(&path) {
        Ok(_) => Ok(()),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

/// Returns the cached Microsoft account details (username and uuid) if logged in.
#[tauri::command]
pub fn get_cached_microsoft_account(app: AppHandle) -> Result<Option<Value>, String> {
    if let Some(json) = read_cached_auth(&app) {
        let name = json.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let uuid = json.get("uuid").and_then(|v| v.as_str()).unwrap_or("");
        if !name.is_empty() {
            return Ok(Some(json!({
                "name": name,
                "uuid": uuid,
                "type": "microsoft"
            })));
        }
    }
    Ok(None)
}

async fn resolve_skin_png_bytes(skin_data: &str) -> Result<Vec<u8>, String> {
    let raw = skin_data.trim();
    let bytes = if raw.starts_with("http://") || raw.starts_with("https://") {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(20))
            .build()
            .map_err(|e| format!("HTTP client error: {e}"))?;
        let res = client
            .get(raw)
            .send()
            .await
            .map_err(|e| format!("Не удалось скачать скин: {e}"))?;
        if !res.status().is_success() {
            return Err(format!("Ошибка скачивания скина: HTTP {}", res.status()));
        }
        res.bytes().await.map_err(|e| format!("Ошибка чтения данных: {e}"))?.to_vec()
    } else if raw.starts_with("data:") {
        let b64 = raw.split_once(',').map(|(_, b)| b).unwrap_or(raw);
        base64::prelude::BASE64_STANDARD
            .decode(b64.trim())
            .map_err(|e| format!("Некорректный base64: {e}"))?
    } else if std::path::Path::new(raw).exists() {
        std::fs::read(raw).map_err(|e| format!("Не удалось прочитать файл скина: {e}"))?
    } else {
        base64::prelude::BASE64_STANDARD
            .decode(raw)
            .map_err(|e| format!("Не удалось распознать формат скина: {e}"))?
    };

    if bytes.len() < 8 || &bytes[0..8] != b"\x89PNG\r\n\x1a\n" {
        return Err("Файл скина должен быть валидным изображением в формате PNG".to_string());
    }
    if bytes.len() > 5 * 1024 * 1024 {
        return Err("Размер файла скина превышает 5 МБ".to_string());
    }

    Ok(bytes)
}

fn build_skin_upload_request(
    client: &reqwest::Client,
    token: &str,
    bytes: &[u8],
    variant: &str,
) -> Result<reqwest::RequestBuilder, String> {
    let part = reqwest::multipart::Part::bytes(bytes.to_vec())
        .file_name("skin.png")
        .mime_str("image/png")
        .map_err(|e| format!("Multipart error: {e}"))?;
    let form = reqwest::multipart::Form::new()
        .text("variant", variant.to_string())
        .part("file", part);
    Ok(client
        .post("https://api.minecraftservices.com/minecraft/profile/skins")
        .header(ACCEPT, "application/json")
        .header(ACCEPT_ENCODING, "identity")
        .bearer_auth(token)
        .multipart(form))
}

/// Uploads and applies the skin to the player's Microsoft account via the official Mojang API.
/// This updates the skin on official Mojang servers, making it visible across all launchers
/// and multiplayer servers.
#[tauri::command]
pub async fn upload_microsoft_skin(
    app: AppHandle,
    skin_data: String,
    variant: String,
) -> Result<String, String> {
    let bytes = resolve_skin_png_bytes(&skin_data).await?;

    let normalized_variant = if variant.trim().to_lowercase() == "slim" {
        "slim"
    } else {
        "classic"
    };

    try_refresh_cached_token(&app).await?;
    let auth = read_cached_auth(&app).ok_or("Аккаунт Microsoft не авторизован")?;
    let mut access_token = auth
        .get("access_token")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .ok_or("Токен доступа Microsoft отсутствует. Пожалуйста, войдите в аккаунт заново.")?
        .to_string();

    let client = auth_client()?;

    let req = build_skin_upload_request(&client, &access_token, &bytes, normalized_variant)?;
    let mut res = req
        .send()
        .await
        .map_err(|e| format_reqwest_error("Загрузка скина в Microsoft", &e))?;

    if res.status() == reqwest::StatusCode::UNAUTHORIZED {
        emit_auth_log(&app, "[MS_AUTH]: Токен истёк, обновляем авторизацию...");
        if try_refresh_cached_token_forced(&app).await.is_ok() {
            if let Some(fresh_auth) = read_cached_auth(&app) {
                if let Some(fresh_tok) = fresh_auth.get("access_token").and_then(|v| v.as_str()) {
                    access_token = fresh_tok.to_string();
                    let retry_req = build_skin_upload_request(&client, &access_token, &bytes, normalized_variant)?;
                    res = retry_req
                        .send()
                        .await
                        .map_err(|e| format_reqwest_error("Загрузка скина в Microsoft (повтор)", &e))?;
                }
            }
        }
    }

    let status = res.status();
    if status.is_success() {
        emit_auth_log(&app, "[MS_AUTH]: Скин успешно сохранён в профиле Microsoft!");
        Ok("Скин успешно обновлён в аккаунте Microsoft".to_string())
    } else if status.as_u16() == 429 {
        Err("Слишком много запросов к Mojang API. Подождите 1 минуту перед сменой скина.".to_string())
    } else {
        let body = res.text().await.unwrap_or_default();
        Err(format!("Ошибка Mojang API ({status}): {body}"))
    }
}

fn write_auth_file(app: &AppHandle, auth_json: &Value) -> Result<(), String> {
    let data_dir = app_data_dir(app);
    let path = data_dir.join("ms_auth.json");
    std::fs::write(&path, serde_json::to_string(auth_json).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    // Restrict permissions on Unix so other users cannot read tokens.
    #[cfg(not(target_os = "windows"))]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600));
    }
    Ok(())
}

async fn xbox_authenticate(ms_access_token: &str) -> Result<(String, String), String> {
    let client = auth_client()?;
    // 1. XBL token
    let xbl = xbox_user_authenticate(&client, &format!("d={ms_access_token}")).await?;
    let xbl_token = xbl.get("Token").and_then(|v| v.as_str()).ok_or("No XBL token")?.to_string();

    // 2. XSTS token
    let res = client
        .post("https://xsts.auth.xboxlive.com/xsts/authorize")
        .header(ACCEPT, "application/json")
        .header(ACCEPT_ENCODING, "identity")
        .header("x-xbl-contract-version", "1")
        .json(&json!({
            "Properties": {
                "SandboxId": "RETAIL",
                "UserTokens": [xbl_token]
            },
            "RelyingParty": "rp://api.minecraftservices.com/",
            "TokenType": "JWT"
        }))
        .send()
        .await
        .map_err(|e| format_reqwest_error("XSTS auth", &e))?;
    let xsts = json_response(res, "XSTS auth").await?;
    let xsts_token = xsts.get("Token").and_then(|v| v.as_str()).ok_or("No XSTS token")?.to_string();
    let uhs = xsts
        .pointer("/DisplayClaims/xui/0/uhs")
        .and_then(|v| v.as_str())
        .ok_or("No user hash (uhs) in XSTS response")?
        .to_string();

    Ok((xsts_token, uhs))
}

async fn xbox_user_authenticate(client: &reqwest::Client, rps_ticket: &str) -> Result<Value, String> {
    let res = send_with_retry(
        || {
            client
                .post("https://user.auth.xboxlive.com/user/authenticate")
                .header(ACCEPT, "application/json")
                .header(ACCEPT_ENCODING, "identity")
                .header("x-xbl-contract-version", "1")
                .json(&json!({
                    "Properties": {
                        "AuthMethod": "RPS",
                        "SiteName": "user.auth.xboxlive.com",
                        "RpsTicket": rps_ticket
                    },
                    "RelyingParty": "http://auth.xboxlive.com",
                    "TokenType": "JWT"
                }))
        },
        "Xbox auth request",
        None,
    )
    .await?;

    json_response(res, "Xbox auth").await
}

async fn minecraft_login(app: &AppHandle, xsts_token: &str, uhs: &str) -> Result<(String, String, String), String> {
    emit_auth_log(app, "[MS_AUTH]: Requesting Minecraft login...");
    let client = auth_client()?;
    let identity_token = format!("XBL3.0 x={uhs};{xsts_token}");
    let res = send_with_retry(
        || {
            client
                .post("https://api.minecraftservices.com/authentication/login_with_xbox")
                .header(ACCEPT, "application/json")
                .header(ACCEPT_ENCODING, "identity")
                .json(&json!({ "identityToken": identity_token }))
        },
        "Minecraft login",
        Some(app),
    )
    .await?;
    emit_auth_log(app, "[MS_AUTH]: Minecraft login response received.");
    let json = json_response(res, "Minecraft login").await?;
    let access_token = json.get("access_token").and_then(|v| v.as_str()).ok_or("No Minecraft access token")?.to_string();
    emit_auth_log(app, "[MS_AUTH]: Requesting Minecraft profile...");

    // 4. Profile
    let res = send_with_retry(
        || {
            client
                .get("https://api.minecraftservices.com/minecraft/profile")
                .header(ACCEPT, "application/json")
                .header(ACCEPT_ENCODING, "identity")
                .bearer_auth(&access_token)
        },
        "Profile fetch",
        Some(app),
    )
    .await?;
    emit_auth_log(app, "[MS_AUTH]: Minecraft profile response received.");
    let profile = json_response(res, "Minecraft profile").await?;
    let name = profile.get("name").and_then(|v| v.as_str()).ok_or("No profile name")?.to_string();
    let uuid = profile.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();

    if name.is_empty() {
        return Err("This account does not own Minecraft. Game ownership is required.".to_string());
    }
    Ok((access_token, name, uuid))
}

async fn send_with_retry(
    build_request: impl Fn() -> reqwest::RequestBuilder,
    context: &str,
    app: Option<&AppHandle>,
) -> Result<reqwest::Response, String> {
    let mut last_error: Option<reqwest::Error> = None;
    for attempt in 0..3 {
        if let Some(app) = app {
            emit_auth_log(app, &format!("[MS_AUTH]: {context} attempt {}...", attempt + 1));
        }
        match build_request().send().await {
            Ok(res) => return Ok(res),
            Err(e) if e.is_connect() || e.is_timeout() => {
                last_error = Some(e);
                if attempt < 2 {
                    if let Some(app) = app {
                        emit_auth_log(
                            app,
                            &format!("[MS_AUTH]: {context} attempt {} failed, retrying...", attempt + 1),
                        );
                    }
                    tokio::time::sleep(std::time::Duration::from_millis(750 * (attempt + 1) as u64)).await;
                    continue;
                }
            }
            Err(e) => return Err(format_reqwest_error(context, &e)),
        }
        break;
    }

    let err = last_error.expect("retry loop must set a last error");
    Err(format!(
        "{context} failed after 3 attempts: {}",
        format_reqwest_error(context, &err)
    ))
}

#[tauri::command]
pub async fn login_microsoft(app: AppHandle) -> Result<String, String> {
    let client_id = CLIENT_ID;
    let auth_url = format!(
        "https://login.live.com/oauth20_authorize.srf?client_id={}&response_type=code&redirect_uri={}&scope=XboxLive.signin%20offline_access&prompt=select_account",
        client_id,
        urlencoding::encode(REDIRECT_URI)
    );

    let code: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    let code_clone = code.clone();

    let auth_window = tauri::WebviewWindowBuilder::new(
        &app,
        "ms_auth",
        tauri::WebviewUrl::External(auth_url.parse::<tauri::Url>().map_err(|e| e.to_string())?),
    )
    .title("Microsoft Login")
    .inner_size(500.0, 650.0)
    .center()
    .on_navigation(move |url| {
        let url_str = url.as_str();
        if url_str.starts_with(REDIRECT_URI) {
            if let Some(auth_code) = url
                .query_pairs()
                .find_map(|(key, value)| (key == "code").then(|| value.into_owned()))
            {
                if let Ok(mut lock) = code_clone.lock() {
                    *lock = Some(auth_code);
                }
                return false;
            }
            return false;
        }
        true
    })
    .build()
    .map_err(|e| e.to_string())?;

    let closed: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    let closed_clone = closed.clone();
    auth_window.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            if let Ok(mut lock) = closed_clone.lock() {
                *lock = true;
            }
        }
    });

    let auth_window_clone = auth_window.clone();
    let auth_code: Option<String> = loop {
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;

        let got_code = code.lock().map(|l| l.clone()).unwrap_or(None);
        if let Some(auth_code) = got_code {
            let _ = auth_window_clone.close();
            break Some(auth_code);
        }

        let is_closed = closed.lock().map(|l| *l).unwrap_or(false);
        if is_closed {
            break None;
        }
    };

    let Some(auth_code) = auth_code else {
        return Err("Auth window closed by user".to_string());
    };

    let (ms_token, refresh_token, expires_in) = exchange_code(&auth_code).await?;
    let (xsts_token, uhs) = xbox_authenticate(&ms_token).await?;
    let (mc_token, name, uuid) = minecraft_login(&app, &xsts_token, &uhs).await?;

    let client_token = uuid::Uuid::new_v4().to_string();
    let auth_json = json!({
        "access_token": mc_token,
        "client_token": client_token,
        "uuid": uuid,
        "name": name,
        "refresh_token": refresh_token,
        "expires_on": now_unix() + expires_in.parse::<u64>().unwrap_or(3600),
        "user_properties": {}
    });
    write_auth_file(&app, &auth_json)?;

    Ok(format!("SUCCESS:{name}"))
}

#[tauri::command]
pub async fn open_ely_login(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("ely_auth") {
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    let url_str = "https://account.ely.by/login";
    let target_url = match url_str.parse::<tauri::Url>() {
        Ok(u) => u,
        Err(e) => return Err(e.to_string()),
    };

    let builder = tauri::WebviewWindowBuilder::new(
        &app,
        "ely_auth",
        tauri::WebviewUrl::External(target_url),
    )
    .title("Ely.by — Вход в аккаунт")
    .inner_size(520.0, 700.0)
    .center();

    match builder.build() {
        Ok(window) => {
            let _ = window.set_focus();
            Ok(())
        }
        Err(e) => {
            use tauri_plugin_opener::OpenerExt;
            app.opener()
                .open_url(url_str, None::<&str>)
                .map_err(|open_err| format!("Failed to open Ely.by ({e}): {open_err}"))
        }
    }
}
