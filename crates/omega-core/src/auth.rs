use std::path::Path;
use serde_json::Value;
use reqwest::header::ACCEPT;

const CLIENT_ID: &str = "00000000402b5328";

fn auth_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(15))
        .timeout(std::time::Duration::from_secs(45))
        .build()
        .map_err(|e| format!("Auth client setup failed: {e}"))
}

pub fn read_cached_auth(data_dir: &Path) -> Option<Value> {
    let path = data_dir.join("ms_auth.json");
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str(&text).ok()
}

pub fn write_cached_auth(data_dir: &Path, auth: &Value) -> Result<(), String> {
    let path = data_dir.join("ms_auth.json");
    let text = serde_json::to_string_pretty(auth).map_err(|e| e.to_string())?;
    std::fs::write(path, text).map_err(|e| e.to_string())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceCodeResponse {
    pub user_code: String,
    pub device_code: String,
    pub verification_uri: String,
    pub expires_in: u64,
    pub interval: u64,
}

pub async fn initiate_device_code() -> Result<DeviceCodeResponse, String> {
    let client = auth_client()?;
    let res = client
        .post("https://login.live.com/oauth20_connect.srf")
        .header(ACCEPT, "application/json")
        .form(&[
            ("client_id", CLIENT_ID),
            ("scope", "XboxLive.signin offline_access"),
            ("response_type", "device_code"),
        ])
        .send()
        .await
        .map_err(|e| format!("Device code request failed: {e}"))?;

    let json: Value = res.json().await.map_err(|e| format!("Invalid JSON: {e}"))?;
    let user_code = json.get("user_code").and_then(|v| v.as_str()).ok_or("No user_code")?.to_string();
    let device_code = json.get("device_code").and_then(|v| v.as_str()).ok_or("No device_code")?.to_string();
    let verification_uri = json.get("verification_uri").and_then(|v| v.as_str()).unwrap_or("https://microsoft.com/link").to_string();
    let expires_in = json.get("expires_in").and_then(|v| v.as_u64()).unwrap_or(900);
    let interval = json.get("interval").and_then(|v| v.as_u64()).unwrap_or(5);

    Ok(DeviceCodeResponse {
        user_code,
        device_code,
        verification_uri,
        expires_in,
        interval,
    })
}

pub async fn poll_device_code(device_code: &str) -> Result<Option<(String, String)>, String> {
    let client = auth_client()?;
    let res = client
        .post("https://login.live.com/oauth20_token.srf")
        .header(ACCEPT, "application/json")
        .form(&[
            ("client_id", CLIENT_ID),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ("device_code", device_code),
        ])
        .send()
        .await
        .map_err(|e| format!("Polling failed: {e}"))?;

    let json: Value = res.json().await.map_err(|e| format!("Invalid JSON: {e}"))?;
    if let Some(error) = json.get("error").and_then(|v| v.as_str()) {
        if error == "authorization_pending" {
            return Ok(None);
        }
        return Err(format!("Device code auth error: {error}"));
    }

    let access_token = json.get("access_token").and_then(|v| v.as_str()).ok_or("No access_token")?.to_string();
    let refresh_token = json.get("refresh_token").and_then(|v| v.as_str()).unwrap_or("").to_string();
    Ok(Some((access_token, refresh_token)))
}

pub async fn fetch_ely_skin(username: &str, dest_path: &Path) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let url = format!("http://skinsystem.ely.by/skins/{username}.png");
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    if res.status().is_success() {
        let bytes = res.bytes().await.map_err(|e| e.to_string())?;
        if let Some(parent) = dest_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        std::fs::write(dest_path, bytes).map_err(|e| e.to_string())?;
        return Ok(true);
    }
    Ok(false)
}
