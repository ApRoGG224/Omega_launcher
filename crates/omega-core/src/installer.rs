use std::path::Path;
use serde_json::Value;
use crate::util::{download_file, get_json};

pub async fn ensure_vanilla(
    client: &reqwest::Client,
    mc_version: &str,
    root: &Path,
    on_log: Option<&(dyn Fn(&str) + Send + Sync)>,
) -> Result<(), String> {
    let version_dir = root.join("versions").join(mc_version);
    let json_path = version_dir.join(format!("{mc_version}.json"));
    let jar_path = version_dir.join(format!("{mc_version}.jar"));

    if json_path.exists() && jar_path.exists() {
        return Ok(());
    }

    if let Some(cb) = on_log {
        cb(&format!("[installer/INFO] Preparing Vanilla {mc_version}..."));
    }
    let manifest: Value = get_json(client, "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json").await?;
    let version_url = manifest
        .get("versions")
        .and_then(|v| v.as_array())
        .and_then(|arr| arr.iter().find(|v| v.get("id").and_then(|i| i.as_str()) == Some(mc_version)))
        .and_then(|v| v.get("url"))
        .and_then(|u| u.as_str())
        .ok_or_else(|| format!("Minecraft version {mc_version} not found in manifest"))?
        .to_string();

    std::fs::create_dir_all(&version_dir).map_err(|e| e.to_string())?;

    if !json_path.exists() {
        let json: Value = get_json(client, &version_url).await?;
        let pretty = serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?;
        std::fs::write(&json_path, pretty).map_err(|e| e.to_string())?;
    }

    if !jar_path.exists() {
        let client_jar = json_path_exists(&json_path)
            .and_then(|json| json.get("downloads").and_then(|d| d.get("client")).and_then(|c| c.get("url")).and_then(|u| u.as_str()).map(|s| s.to_string()))
            .ok_or("Vanilla version json has no client download url")?;
        if let Some(cb) = on_log {
            cb(&format!("[installer/INFO] Downloading Vanilla {mc_version} client jar..."));
        }
        download_file(client, &client_jar, &jar_path, on_log).await?;
        if let Some(expected_sha1) = json_path_exists(&json_path)
            .and_then(|json| json.get("downloads").and_then(|d| d.get("client")).and_then(|c| c.get("sha1")).and_then(|s| s.as_str()).map(|s| s.to_string()))
        {
            if let Ok(actual) = sha1_of(&jar_path) {
                if actual != expected_sha1 {
                    if let Some(cb) = on_log {
                        cb("[installer/INFO] SHA1 mismatch on client jar, retrying...");
                    }
                    let _ = std::fs::remove_file(&jar_path);
                    download_file(client, &client_jar, &jar_path, on_log).await?;
                }
            }
        }
    }
    Ok(())
}

fn json_path_exists(path: &Path) -> Option<Value> {
    std::fs::read_to_string(path).ok().and_then(|s| serde_json::from_str(&s).ok())
}

fn sha1_of(path: &Path) -> Result<String, String> {
    use sha1::Digest;
    let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    let hash = sha1::Sha1::digest(&bytes);
    Ok(hex::encode(hash))
}

pub async fn install_fabric(
    client: &reqwest::Client,
    mc_version: &str,
    root: &Path,
    on_log: Option<&(dyn Fn(&str) + Send + Sync)>,
) -> Result<String, String> {
    if let Some(cb) = on_log {
        cb(&format!("[installer/INFO] Fetching latest Fabric loader for {mc_version}..."));
    }
    let meta_url = format!("https://meta.fabricmc.net/v2/versions/loader/{mc_version}");
    let loaders: Value = get_json(client, &meta_url).await.map_err(|e| format!("Failed to get Fabric loader versions: {e}"))?;
    let loader_ver = loaders
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|item| item.get("loader"))
        .and_then(|l| l.get("version"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("No Fabric loader found for MC {mc_version}"))?;

    let version_name = format!("{mc_version}-fabric-{loader_ver}");
    let profile_url = format!("https://meta.fabricmc.net/v2/versions/loader/{mc_version}/{loader_ver}/profile/json");
    let profile: Value = get_json(client, &profile_url).await.map_err(|e| format!("Failed to get Fabric profile json: {e}"))?;

    let version_dir = root.join("versions").join(&version_name);
    std::fs::create_dir_all(&version_dir).map_err(|e| e.to_string())?;
    let pretty = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
    std::fs::write(version_dir.join(format!("{version_name}.json")), pretty).map_err(|e| e.to_string())?;

    if let Some(cb) = on_log {
        cb(&format!("[installer/INFO] Installed {version_name} successfully!"));
    }
    Ok(version_name)
}
