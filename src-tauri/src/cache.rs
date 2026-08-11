use std::path::Path;

use serde_json::Value;
use tauri::{AppHandle, Manager};

/// Caches a remote icon (Modrinth CDN) into `app_cache_dir/icons/` keyed by
/// its URL hash. Returns the local file path so the frontend can render it via
/// `convertFileSrc` instead of hitting the network on every search.
#[tauri::command]
pub async fn cache_mod_icon(app: AppHandle, url: String) -> Result<String, String> {
    if url.is_empty() || !url.starts_with("http") {
        return Err("Invalid icon URL".to_string());
    }
    let cache_dir = app
        .path()
        .app_cache_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
        .join("icons");
    std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    use sha1::Digest;
    let hash = hex::encode(sha1::Sha1::digest(url.as_bytes()));
    let ext = url
        .split('?')
        .next()
        .map(|base| base.rsplit('.').next().unwrap_or("png").to_lowercase())
        .filter(|e| matches!(e.as_str(), "png" | "jpg" | "jpeg" | "webp" | "gif"))
        .unwrap_or_else(|| "png".to_string());
    let dest = cache_dir.join(format!("{hash}.{ext}"));

    if dest.exists() {
        return Ok(dest.to_string_lossy().to_string());
    }
    let client = reqwest::Client::new();
    crate::util::download_file_max(&app, &client, &url, &dest, 16 * 1024 * 1024).await?;
    Ok(dest.to_string_lossy().to_string())
}

const MANIFEST_URL: &str = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const MANIFEST_TTL_SECS: u64 = 24 * 60 * 60;

fn cache_is_fresh(path: &Path) -> bool {
    std::fs::metadata(path)
        .and_then(|meta| meta.modified())
        .map(|mtime| {
            mtime
                .elapsed()
                .map(|age| age.as_secs() < MANIFEST_TTL_SECS)
                .unwrap_or(false)
        })
        .unwrap_or(false)
}

/// Returns the vanilla version manifest, fetching it at most once per 24 hours
/// and persisting it in `app_cache_dir/versions.json`.
#[tauri::command]
pub async fn get_cached_version_manifest(app: AppHandle) -> Result<Value, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));
    let cache_file = cache_dir.join("versions.json");

    if cache_file.exists() && cache_is_fresh(&cache_file) {
        let text = std::fs::read_to_string(&cache_file).map_err(|e| e.to_string())?;
        return serde_json::from_str(&text).map_err(|e| e.to_string());
    }

    let client = reqwest::Client::new();
    let manifest: Value = crate::util::get_json(&client, MANIFEST_URL).await?;
    match std::fs::create_dir_all(&cache_dir)
        .and_then(|_| std::fs::write(&cache_file, manifest.to_string()))
    {
        Ok(_) => {}
        Err(_) => {}
    }
    Ok(manifest)
}