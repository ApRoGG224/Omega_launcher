use std::path::Path;

use serde_json::Value;
use tauri::AppHandle;

use crate::util::{download_file, emit_line, get_json};

/// Downloads the vanilla version JSON + client jar for `mc_version` into
/// `root/versions`, unless already present (like the old @xmcl installVersion).
pub async fn ensure_vanilla(app: &AppHandle, client: &reqwest::Client, mc_version: &str, root: &Path) -> Result<(), String> {
    let version_dir = root.join("versions").join(mc_version);
    let json_path = version_dir.join(format!("{mc_version}.json"));
    let jar_path = version_dir.join(format!("{mc_version}.jar"));

    if json_path.exists() && jar_path.exists() {
        return Ok(());
    }

    emit_line(app, &format!("[installer/INFO] Preparing Vanilla {mc_version}..."));
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
        emit_line(app, &format!("[installer/INFO] Downloading Vanilla {mc_version} client jar..."));
        download_file(app, client, &client_jar, &jar_path).await?;
        if let Some(expected_sha1) = json_path_exists(&json_path)
            .and_then(|json| json.get("downloads").and_then(|d| d.get("client")).and_then(|c| c.get("sha1")).and_then(|s| s.as_str()).map(|s| s.to_string()))
        {
            if let Ok(actual) = sha1_of(&jar_path) {
                if actual != expected_sha1 {
                    // Re-download once with a fresh attempt; keep going on mismatch.
                    emit_line(app, "[installer/INFO] SHA1 mismatch on client jar, retrying...");
                    let _ = std::fs::remove_file(&jar_path);
                    download_file(app, client, &client_jar, &jar_path).await?;
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

fn write_profile(app: &AppHandle, root: &Path, version_name: &str, profile: Value) -> Result<(), String> {
    let version_dir = root.join("versions").join(version_name);
    std::fs::create_dir_all(&version_dir).map_err(|e| e.to_string())?;
    let mut profile = profile;
    profile["id"] = Value::String(version_name.to_string());
    let pretty = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
    std::fs::write(version_dir.join(format!("{version_name}.json")), pretty).map_err(|e| e.to_string())?;
    emit_line(app, &format!("[installer/INFO] Installed {version_name} successfully!"));
    Ok(())
}

async fn install_fabric(app: &AppHandle, client: &reqwest::Client, mc_version: &str, root: &Path) -> Result<String, String> {
    emit_line(app, &format!("[installer/INFO] Fetching latest Fabric loader for {mc_version}..."));
    let loaders: Vec<Value> = get_json(client, "https://meta.fabricmc.net/v2/versions/loader").await?;
    let latest = loaders
        .first()
        .and_then(|l| l.get("version"))
        .and_then(|v| v.as_str())
        .ok_or("No Fabric loaders found")?
        .to_string();

    let version_name = format!("fabric-loader-{latest}-{mc_version}");
    let profile_url = format!("https://meta.fabricmc.net/v2/versions/loader/{mc_version}/{latest}/profile/json");
    let profile: Value = get_json(client, &profile_url).await?;
    write_profile(app, root, &version_name, profile)?;
    Ok(version_name)
}

async fn install_quilt(app: &AppHandle, client: &reqwest::Client, mc_version: &str, root: &Path) -> Result<String, String> {
    emit_line(app, &format!("[installer/INFO] Fetching latest Quilt loader for {mc_version}..."));
    let loaders: Vec<Value> = get_json(client, "https://meta.quiltmc.org/v3/versions/loader").await?;
    let latest = loaders
        .first()
        .and_then(|l| l.get("loader"))
        .and_then(|l| l.get("version"))
        .and_then(|v| v.as_str())
        .ok_or("No Quilt loaders found")?
        .to_string();

    let version_name = format!("quilt-loader-{latest}-{mc_version}");
    // Quilt publishes the same profile-json layout as Fabric.
    let profile_url = format!("https://meta.quiltmc.org/v3/versions/loader/{mc_version}/{latest}/profile/json");
    match get_json::<Value>(client, &profile_url).await {
        Ok(profile) => {
            write_profile(app, root, &version_name, profile)?;
            Ok(version_name)
        }
        Err(_) => {
            // Fallback for older Quilt versions: fabric-style profile from the loader list.
            let profile_url = format!("https://meta.quiltmc.org/v3/versions/loader/{mc_version}/{latest}/profile/fabric");
            let profile: Value = get_json(client, &profile_url).await?;
            write_profile(app, root, &version_name, profile)?;
            Ok(version_name)
        }
    }
}

fn run_installer(app: &AppHandle, java_path: &str, installer_jar: &Path, root: &Path) -> Result<(), String> {
    emit_line(app, &format!("[installer/INFO] Running installer via {java_path} ..."));
    let output = std::process::Command::new(java_path)
        .arg("-jar")
        .arg(installer_jar)
        .arg("--installClient")
        .arg(root)
        .output()
        .map_err(|e| format!("Failed to run installer, is Java available at {java_path}? {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    for line in stdout.lines().chain(stderr.lines()) {
        if !line.trim().is_empty() {
            emit_line(app, &format!("[installer/INFO] {}", line));
        }
    }
    if !output.status.success() {
        return Err(format!("Installer failed (exit {}): {}", output.status, stderr));
    }
    Ok(())
}

async fn install_forge(app: &AppHandle, client: &reqwest::Client, mc_version: &str, root: &Path, java_path: &str) -> Result<String, String> {
    emit_line(app, &format!("[installer/INFO] Fetching latest Forge loader for {mc_version}..."));
    let list_url = format!("https://forge-maven.bstylesz.info/minecraft/{mc_version}/version.json");
    let list: Value = get_json(client, &list_url).await.map_err(|_| format!("No Forge loaders found for {mc_version}"))?;

    let versions = list.get("versions").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    let recommended = list.get("promos").and_then(|p| p.get("recommended")).and_then(|v| v.as_str());
    let latest = recommended
        .and_then(|rec| versions.iter().find(|v| v.get("version").and_then(|x| x.as_str()) == Some(rec)).cloned())
        .or_else(|| versions.first().cloned())
        .ok_or_else(|| format!("No Forge loaders found for {mc_version}"))?;

    let forge_version = latest.get("version").and_then(|v| v.as_str()).unwrap_or("").to_string();
    if forge_version.is_empty() {
        return Err("No Forge loaders found".to_string());
    }

    emit_line(app, &format!("[installer/INFO] Installing Forge {forge_version}..."));
    // Newer Forge ships a universal installer jar for all loader types.
    let installer_url = format!("https://maven.minecraftforge.net/net/minecraftforge/forge/{forge_version}/forge-{forge_version}-installer.jar");
    let installer_path = root.join(format!("forge-{forge_version}-installer.jar"));
    if !installer_path.exists() {
        download_file(app, client, &installer_url, &installer_path).await?;
    }
    run_installer(app, java_path, &installer_path, root)?;
    let _ = std::fs::remove_file(&installer_path);

    let version_name = format!("forge-{forge_version}");
    Ok(version_name)
}

async fn install_neoforge(app: &AppHandle, client: &reqwest::Client, mc_version: &str, root: &Path, java_path: &str) -> Result<String, String> {
    emit_line(app, &format!("[installer/INFO] Fetching NeoForge versions..."));
    let data: Value = get_json(client, "https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge").await?;
    let versions: Vec<String> = data
        .get("versions")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    // NeoForge dropped the '1.' prefix: 1.21.1 -> 21.1
    let neo_prefix: String = mc_version
        .split('.')
        .skip(1)
        .collect::<Vec<&str>>()
        .join(".");
    let compatible: Vec<&String> = versions.iter().filter(|v| v.starts_with(&neo_prefix)).collect();
    let latest = compatible.last().ok_or_else(|| format!("No NeoForge version found for {mc_version}"))?;

    emit_line(app, &format!("[installer/INFO] Installing NeoForge {latest}..."));
    let installer_url = format!("https://maven.neoforged.net/releases/net/neoforged/neoforge/{latest}/neoforge-{latest}-installer.jar");
    let installer_path = root.join(format!("neoforge-{latest}-installer.jar"));
    if !installer_path.exists() {
        download_file(app, client, &installer_url, &installer_path).await?;
    }
    run_installer(app, java_path, &installer_path, root)?;
    let _ = std::fs::remove_file(&installer_path);

    Ok(format!("neoforge-{latest}"))
}

pub async fn install_loader(
    app: &AppHandle,
    mc_version: &str,
    loader_type: &str,
    root: &Path,
    java_path: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    match loader_type.to_lowercase().as_str() {
        "fabric" => install_fabric(app, &client, mc_version, root).await,
        "quilt" => install_quilt(app, &client, mc_version, root).await,
        "forge" => {
            ensure_vanilla(app, &client, mc_version, root).await?;
            install_forge(app, &client, mc_version, root, java_path).await
        }
        "neoforge" => {
            ensure_vanilla(app, &client, mc_version, root).await?;
            install_neoforge(app, &client, mc_version, root, java_path).await
        }
        _ => Err(format!("Unsupported loader: {loader_type}")),
    }
}

/// Downloads the version json (and jar) so a loader profile can inherit from it.
pub async fn prepare_vanilla_root(app: &AppHandle, mc_version: &str, root: &Path) -> Result<(), String> {
    let client = reqwest::Client::new();
    ensure_vanilla(app, &client, mc_version, root).await
}