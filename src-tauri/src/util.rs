use std::io::Write;
use std::path::Path;
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use serde::de::DeserializeOwned;
use tauri::{AppHandle, Emitter, Manager};

pub fn app_data_dir(app: &AppHandle) -> std::path::PathBuf {
    let mut path = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| std::path::PathBuf::from("."));
    path.push("minecraft_data");
    let _ = std::fs::create_dir_all(&path);
    path
}

pub fn emit_line(app: &AppHandle, line: &str) {
    let _ = app.emit("download-progress", line);
}

pub async fn get_json<T: DeserializeOwned>(
    client: &reqwest::Client,
    url: &str,
) -> Result<T, String> {
    let res = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;
    if !res.status().is_success() {
        return Err(format!("Request to {url} failed ({})", res.status()));
    }
    res.json().await.map_err(|e| format!("Bad JSON from {url}: {e}"))
}

/// Hard cap for downloads (5 GiB) to protect against runaway transfers.
pub const MAX_DOWNLOAD_BYTES: u64 = 5 * 1024 * 1024 * 1024;

/// Streams a download into `dest` (creating parent dirs), emitting progress.
pub async fn download_file(
    app: &AppHandle,
    client: &reqwest::Client,
    url: &str,
    dest: &Path,
) -> Result<(), String> {
    download_file_max(app, client, url, dest, MAX_DOWNLOAD_BYTES).await
}

/// Like `download_file` but aborts when the declared or received size exceeds
/// `max_bytes`.
pub async fn download_file_max(
    app: &AppHandle,
    client: &reqwest::Client,
    url: &str,
    dest: &Path,
    max_bytes: u64,
) -> Result<(), String> {
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let res = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Failed to download {url}: {e}"))?;
    if !res.status().is_success() {
        return Err(format!("Failed to download {url} ({})", res.status()));
    }
    let total = res.content_length().unwrap_or(0);
    if total > max_bytes {
        return Err(format!("Download from {url} exceeds the size limit ({total} bytes)"));
    }
    let mut stream = res.bytes_stream();
    let mut file = std::fs::File::create(dest).map_err(|e| e.to_string())?;
    let mut written: u64 = 0;
    let mut last_percent: Option<u32> = None;
    let mut last_progress_at = Instant::now() - Duration::from_secs(1);
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        written += chunk.len() as u64;
        if written > max_bytes {
            drop(file);
            let _ = std::fs::remove_file(dest);
            return Err(format!("Download from {url} exceeded the size limit ({written} bytes)"));
        }
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        if total > 0 {
            let pct = ((written as f64 / total as f64) * 100.0).round() as u32;
            let now = Instant::now();
            if last_percent != Some(pct)
                && (now.duration_since(last_progress_at) >= Duration::from_millis(250)
                    || pct >= 100)
            {
                emit_line(app, &format!("Downloading: {pct}%"));
                last_percent = Some(pct);
                last_progress_at = now;
            }
        }
    }
    file.flush().map_err(|e| e.to_string())?;
    if total > 0 && last_percent != Some(100) {
        emit_line(app, "Downloading: 100%");
    }
    Ok(())
}

/// Extracts a local zip archive to `dest_dir`. Mirrors adm-zip behaviour used
/// by the old sidecars: keeps the relative structure, skips directories.
pub fn extract_zip(zip_path: &Path, dest_dir: &Path) -> Result<usize, String> {
    let file = std::fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(dest_dir).map_err(|e| e.to_string())?;

    let mut count = 0;
    for i in 0..zip.len() {
        let mut entry = zip
            .by_index(i)
            .map_err(|e| format!("Zip entry failed: {e}"))?;
        let name = entry.name().to_string();
        if entry.is_dir() || name.is_empty() || name.ends_with('/') {
            continue;
        }
        // Guard against zip-slip
        let rel = std::path::Path::new(&name);
        let out_path = dest_dir.join(rel);
        if !out_path.starts_with(dest_dir) {
            continue;
        }
        if let Some(parent) = out_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut out = std::fs::File::create(&out_path).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
        count += 1;
    }
    Ok(count)
}

/// Wraps relative segments below a folder prefix found inside a zip path,
/// e.g. `MyMod/.minecraft/mods/x.jar` with wanted root `.minecraft` -> `mods/x.jar`.
pub fn relative_after(parts: &[&str], needle: &str) -> Option<String> {
    let idx = parts.iter().position(|p| *p == needle)?;
    let sliced = &parts[idx + 1..];
    if sliced.is_empty() {
        return None;
    }
    Some(sliced.join("/"))
}
