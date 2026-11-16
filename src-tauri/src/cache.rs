use std::path::Path;

use serde_json::Value;
use tauri::{AppHandle, Manager};

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

fn get_dir_size(path: &Path) -> u64 {
    let mut total = 0;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                total += get_dir_size(&p);
            } else if let Ok(meta) = p.metadata() {
                total += meta.len();
            }
        }
    }
    total
}

#[tauri::command]
pub async fn clear_launcher_cache(app: AppHandle) -> Result<u64, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));

    let mut freed: u64 = 0;

    // 1. Clear icons folder
    let icons_dir = cache_dir.join("icons");
    if icons_dir.exists() {
        freed += get_dir_size(&icons_dir);
        let _ = std::fs::remove_dir_all(&icons_dir);
        let _ = std::fs::create_dir_all(&icons_dir);
    }

    // 2. Clear versions manifest
    let versions_file = cache_dir.join("versions.json");
    if versions_file.exists() {
        if let Ok(meta) = versions_file.metadata() {
            freed += meta.len();
        }
        let _ = std::fs::remove_file(&versions_file);
    }

    Ok(freed)
}

#[tauri::command]
pub async fn clear_launcher_logs(app: AppHandle) -> Result<u64, String> {
    let mut freed: u64 = 0;
    let data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));

    let launcher_log = data_dir.join("launcher.log");
    if launcher_log.exists() {
        if let Ok(meta) = launcher_log.metadata() {
            freed += meta.len();
        }
        let _ = std::fs::remove_file(&launcher_log);
    }

    let logs_dir = data_dir.join("logs");
    if logs_dir.exists() {
        freed += get_dir_size(&logs_dir);
        let _ = std::fs::remove_dir_all(&logs_dir);
        let _ = std::fs::create_dir_all(&logs_dir);
    }

    Ok(freed)
}

#[tauri::command]
pub async fn get_launcher_cache_size(app: AppHandle) -> Result<u64, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));
    Ok(get_dir_size(&cache_dir))
}

#[tauri::command]
pub async fn clear_game_logs(app: AppHandle, game_dir: Option<String>) -> Result<u64, String> {
    let mut freed: u64 = 0;

    let clean_dir = |dir: &Path| -> u64 {
        let mut d_freed = 0;
        if dir.exists() {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.ends_with(".log.gz")
                        || name.ends_with(".log")
                        || name.ends_with(".txt")
                        || name.starts_with("crash-")
                    {
                        if let Ok(meta) = path.metadata() {
                            d_freed += meta.len();
                        }
                        let _ = std::fs::remove_file(path);
                    }
                }
            }
        }
        d_freed
    };

    if let Some(gd) = game_dir {
        let expanded = if gd.starts_with("~/") {
            if let Some(home) = dirs::home_dir() {
                home.join(&gd[2..])
            } else {
                std::path::PathBuf::from(gd)
            }
        } else {
            std::path::PathBuf::from(gd)
        };
        freed += clean_dir(&expanded.join("logs"));
        freed += clean_dir(&expanded.join("crash-reports"));
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));
    let instances_dir = data_dir.join("instances");
    if instances_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&instances_dir) {
            for entry in entries.flatten() {
                let inst_mc = entry.path().join("minecraft");
                freed += clean_dir(&inst_mc.join("logs"));
                freed += clean_dir(&inst_mc.join("crash-reports"));
            }
        }
    }

    Ok(freed)
}

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