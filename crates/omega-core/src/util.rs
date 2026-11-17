use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use serde::de::DeserializeOwned;

pub fn app_data_dir() -> PathBuf {
    if let Some(base) = dirs::data_dir() {
        let existing = base.join("com.soroqn.omega-launcher").join("minecraft_data");
        if existing.exists() {
            return existing;
        }
        let modern = base.join("omega-launcher").join("minecraft_data");
        let _ = std::fs::create_dir_all(&modern);
        return modern;
    }
    let fallback = PathBuf::from("./minecraft_data");
    let _ = std::fs::create_dir_all(&fallback);
    fallback
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

pub const MAX_DOWNLOAD_BYTES: u64 = 5 * 1024 * 1024 * 1024;

pub async fn download_file(
    client: &reqwest::Client,
    url: &str,
    dest: &Path,
    on_progress: Option<&(dyn Fn(&str) + Send + Sync)>,
) -> Result<(), String> {
    download_file_max(client, url, dest, MAX_DOWNLOAD_BYTES, on_progress).await
}

pub async fn download_file_max(
    client: &reqwest::Client,
    url: &str,
    dest: &Path,
    max_bytes: u64,
    on_progress: Option<&(dyn Fn(&str) + Send + Sync)>,
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
                if let Some(cb) = on_progress {
                    cb(&format!("Downloading: {pct}%"));
                }
                last_percent = Some(pct);
                last_progress_at = now;
            }
        }
    }
    file.flush().map_err(|e| e.to_string())?;
    if total > 0 && last_percent != Some(100) {
        if let Some(cb) = on_progress {
            cb("Downloading: 100%");
        }
    }
    Ok(())
}

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

pub fn relative_after(parts: &[&str], needle: &str) -> Option<String> {
    let idx = parts.iter().position(|p| *p == needle)?;
    let sliced = &parts[idx + 1..];
    if sliced.is_empty() {
        return None;
    }
    Some(sliced.join("/"))
}
