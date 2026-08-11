use std::sync::{Arc, Mutex};

use serde_json::{json, Value};
use tauri::AppHandle;

use crate::util::app_data_dir;

const CLIENT_ID: &str = "00000000402b5328";
const REDIRECT_URI: &str = "https://login.live.com/oauth20_desktop.srf";

async fn exchange_code(code: &str) -> Result<(String, String, String), String> {
    let client = reqwest::Client::new();
    let res = client
        .post("https://login.live.com/oauth20_token.srf")
        .form(&[
            ("client_id", CLIENT_ID),
            ("code", code),
            ("grant_type", "authorization_code"),
            ("redirect_uri", REDIRECT_URI),
            ("scope", "XboxLive.signin offline_access"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token exchange failed: {e}"))?;
    if !res.status().is_success() {
        return Err(format!("Microsoft token exchange failed ({}), the code may be expired", res.status()));
    }
    let json: Value = res.json().await.map_err(|e| e.to_string())?;
    let access_token = json.get("access_token").and_then(|v| v.as_str()).ok_or("No access_token in response")?.to_string();
    let refresh_token = json.get("refresh_token").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let expires_in = json.get("expires_in").and_then(|v| v.as_u64()).unwrap_or(3600);
    Ok((access_token, refresh_token, expires_in.to_string()))
}

/// Reads the cached Microsoft auth file, refreshing the access token via the
/// saved refresh token when it has expired. Returns `true` when a refresh was
/// performed, `false` when nothing needed refreshing.
pub async fn try_refresh_cached_token(app: &AppHandle) -> Result<bool, String> {
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

    if !expired {
        return Ok(false);
    }

    let client = reqwest::Client::new();
    let res = client
        .post("https://login.live.com/oauth20_token.srf")
        .form(&[
            ("client_id", CLIENT_ID),
            ("refresh_token", refresh_token),
            ("grant_type", "refresh_token"),
            ("redirect_uri", REDIRECT_URI),
            ("scope", "XboxLive.signin offline_access"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token refresh failed: {e}"))?;
    if !res.status().is_success() {
        return Err(format!("Token refresh failed ({}), please re-login", res.status()));
    }
    let data: Value = res.json().await.map_err(|e| e.to_string())?;
    let access_token = data
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

    let mut updated = json;
    updated["access_token"] = Value::String(access_token);
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
    let client = reqwest::Client::new();
    // 1. XBL token
    let res = client
        .post("https://user.auth.xboxlive.com/user/authenticate")
        .json(&json!({
            "Properties": {
                "AuthMethod": "OAuth",
                "SiteName": "user.auth.xboxlive.com",
                "RpsTicket": format!("d={ms_access_token}")
            },
            "RelyingParty": "http://auth.xboxlive.com",
            "TokenType": "JWT"
        }))
        .send()
        .await
        .map_err(|e| format!("Xbox auth failed: {e}"))?;
    let xbl: Value = res.json().await.map_err(|e| e.to_string())?;
    let xbl_token = xbl.get("Token").and_then(|v| v.as_str()).ok_or("No XBL token")?.to_string();

    // 2. XSTS token
    let res = client
        .post("https://xsts.auth.xboxlive.com/xsts/authorize")
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
        .map_err(|e| format!("XSTS auth failed: {e}"))?;
    let xsts: Value = res.json().await.map_err(|e| format!("XSTS error: {e}"))?;
    let xsts_token = xsts.get("Token").and_then(|v| v.as_str()).ok_or("No XSTS token")?.to_string();
    let uhs = xsts
        .pointer("/DisplayClaims/xui/0/uhs")
        .and_then(|v| v.as_str())
        .ok_or("No user hash (uhs) in XSTS response")?
        .to_string();

    Ok((xsts_token, uhs))
}

async fn minecraft_login(xsts_token: &str, uhs: &str) -> Result<(String, String, String), String> {
    let client = reqwest::Client::new();
    let res = client
        .post("https://api.minecraftservices.com/authentication/login_with_xbox")
        .json(&json!({ "identityToken": format!("XBL3.0 x={uhs};{xsts_token}") }))
        .send()
        .await
        .map_err(|e| format!("Minecraft login failed: {e}"))?;
    let json: Value = res.json().await.map_err(|e| e.to_string())?;
    let access_token = json.get("access_token").and_then(|v| v.as_str()).ok_or("No Minecraft access token")?.to_string();

    // 4. Profile
    let res = client
        .get("https://api.minecraftservices.com/minecraft/profile")
        .bearer_auth(&access_token)
        .send()
        .await
        .map_err(|e| format!("Profile fetch failed: {e}"))?;
    let profile: Value = res.json().await.map_err(|e| e.to_string())?;
    let name = profile.get("name").and_then(|v| v.as_str()).ok_or("No profile name")?.to_string();
    let uuid = profile.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();

    if name.is_empty() {
        return Err("This account does not own Minecraft. Game ownership is required.".to_string());
    }
    Ok((access_token, name, uuid))
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
            if let Some(query) = url.query() {
                for param in query.split('&') {
                    if let Some(c) = param.strip_prefix("code=") {
                        if let Ok(mut lock) = code_clone.lock() {
                            *lock = Some(c.to_string());
                        }
                        return false;
                    }
                }
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
    let (mc_token, name, uuid) = minecraft_login(&xsts_token, &uhs).await?;

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