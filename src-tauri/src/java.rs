use std::path::{Path, PathBuf};

use tauri::AppHandle;

use crate::util::{emit_line, extract_zip};

pub fn required_java_version(mc_version: &str) -> u32 {
    let parts: Vec<&str> = mc_version.split('.').collect();
    let minor: u32 = parts.get(1).and_then(|p| p.parse().ok()).unwrap_or(0);
    let patch: u32 = parts.get(2).and_then(|p| p.parse().ok()).unwrap_or(0);
    if minor > 20 || (minor == 20 && patch >= 5) {
        21
    } else if minor >= 17 {
        17
    } else {
        8
    }
}

fn os_arch() -> (&'static str, &'static str) {
    let os = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "mac"
    } else {
        "linux"
    };
    let arch = if cfg!(target_arch = "x86_64") {
        "x64"
    } else if cfg!(target_arch = "aarch64") {
        "aarch64"
    } else {
        "x86"
    };
    (os, arch)
}

fn java_executable(jre_dir: &Path) -> PathBuf {
    let exe = if cfg!(target_os = "windows") { "java.exe" } else { "java" };
    jre_dir.join("bin").join(exe)
}

/// Looks for a suitable Java runtime already installed on the system
/// (JAVA_HOME, common JVM dirs, PATH) and returns the path when found.
pub fn find_system_java(required_major: u32) -> Option<String> {
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();

    if let Some(home) = std::env::var_os("JAVA_HOME") {
        candidates.push(std::path::PathBuf::from(home).join("bin").join(java_bin()));
    }
    #[cfg(target_os = "linux")]
    {
        if let Ok(entries) = std::fs::read_dir("/usr/lib/jvm") {
            for entry in entries.flatten() {
                let path = entry.path().join("bin").join(java_bin());
                if path.exists() {
                    candidates.push(path);
                }
            }
        }
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::path::Path::new("/Library/Java/JavaVirtualMachines");
        if let Ok(entries) = std::fs::read_dir(home) {
            for entry in entries.flatten() {
                let path = entry.path().join("Contents/Home/bin").join(java_bin());
                if path.exists() {
                    candidates.push(path);
                }
            }
        }
    }

    // PATH fallback: plain `java`.
    if std::env::var_os("PATH").is_some() {
        candidates.push(std::path::PathBuf::from("java"));
    }

    for candidate in candidates {
        // A bare "java" relies on PATH resolution; anything else must exist.
        if candidate.components().count() > 1 && !candidate.exists() {
            continue;
        }
        if let Ok(major) = major_version_of(&candidate) {
            if major >= required_major {
                return Some(candidate.to_string_lossy().to_string());
            }
        }
    }
    None
}

fn major_version_of(java: &std::path::Path) -> Result<u32, String> {
    let output = std::process::Command::new(java)
        .arg("-XshowSettings:properties")
        .arg("-version")
        .output()
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&output.stderr);
    for line in text.lines() {
        if let Some(version) = line.split("java.version =").nth(1) {
            let v = version.trim();
            // "1.8.0_402" -> 8, "21.0.3" -> 21
            if let Some(rest) = v.strip_prefix("1.") {
                return rest
                    .split('.')
                    .next()
                    .unwrap_or("")
                    .parse::<u32>()
                    .map_err(|e| e.to_string());
            }
            return v
                .split('.')
                .next()
                .unwrap_or("")
                .parse::<u32>()
                .map_err(|e| e.to_string());
        }
    }
    Err("Could not parse java version".to_string())
}

#[cfg(target_os = "windows")]
fn java_bin() -> &'static str {
    "java.exe"
}

#[cfg(not(target_os = "windows"))]
fn java_bin() -> &'static str {
    "java"
}

/// Ensures a Java runtime for the given Minecraft version is cached inside
/// `root/runtime`. Mirrors the old sidecar: picks 21 / 17 / 8 and prefers a
/// compatible system JDK before downloading the Adoptium JRE.
pub fn ensure_java(app: &AppHandle, mc_version: &str, root: &Path) -> Result<String, String> {
    let java_version = required_java_version(mc_version);
    if let Some(system_java) = find_system_java(java_version) {
        emit_line(
            app,
            &format!("[java/INFO] Using system Java {java_version}+ at {system_java}"),
        );
        return Ok(system_java);
    }
    let runtime_dir = root.join("runtime");
    let jre_dir = runtime_dir.join(format!("jre{java_version}"));
    let java_path = java_executable(&jre_dir);

    if java_path.exists() {
        emit_line(app, &format!("[java/INFO] Found cached Java {java_version} at {}", java_path.display()));
        return Ok(java_path.to_string_lossy().to_string());
    }

    emit_line(app, &format!("[java/INFO] Java {java_version} not found. Downloading from Adoptium..."));
    std::fs::create_dir_all(&runtime_dir).map_err(|e| e.to_string())?;

    let (os, arch) = os_arch();
    let api_url = format!(
        "https://api.adoptium.net/v3/binary/latest/{java_version}/ga/{os}/{arch}/jre/hotspot/normal/eclipse"
    );

    let client = reqwest::blocking::Client::new();

    // Adoptium redirects to the actual archive; follow it and check the final extension.
    let response = client
        .get(&api_url)
        .send()
        .map_err(|e| format!("Failed to download Java: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("Failed to download Java ({}). Is Java {java_version} available for {os}/{arch}?", response.status()));
    }

    let archive_path = runtime_dir.join(format!("jre{java_version}.archive"));
    let bytes = response.bytes().map_err(|e| e.to_string())?;
    std::fs::write(&archive_path, &bytes).map_err(|e| e.to_string())?;

    emit_line(app, "[java/INFO] Downloaded archive. Extracting...");
    let temp_dir = runtime_dir.join(format!("temp_jre{java_version}"));
    if temp_dir.exists() {
        std::fs::remove_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    }
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    // Try tar.gz (linux/mac) first, fall back to zip (windows).
    let mut extracted = false;
    if cfg!(not(target_os = "windows")) {
        let file = std::fs::File::open(&archive_path).map_err(|e| e.to_string())?;
        let gz = flate2::read::GzDecoder::new(file);
        let mut tar = tar::Archive::new(gz);
        tar.unpack(&temp_dir)
            .map_err(|e| format!("Failed to extract Java archive: {e}"))?;
        extracted = true;
    } else {
        match extract_zip(&archive_path, &temp_dir) {
            Ok(_) => extracted = true,
            Err(e) => emit_line(app, &format!("[java/INFO] Zip extraction failed ({e}), retrying as tar.gz...")),
        }
    }
    if !extracted {
        let file = std::fs::File::open(&archive_path).map_err(|e| e.to_string())?;
        let gz = flate2::read::GzDecoder::new(file);
        let mut tar = tar::Archive::new(gz);
        tar.unpack(&temp_dir)
            .map_err(|e| format!("Failed to extract Java archive: {e}"))?;
    }

    // Adoptium archives unpack into a single folder like "jdk-21.0.3+9-jre".
    let inner = std::fs::read_dir(&temp_dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok())
        .find(|entry| entry.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|entry| entry.path())
        .ok_or("Unexpected Java archive layout")?;
    std::fs::rename(&inner, &jre_dir).map_err(|e| e.to_string())?;
    let _ = std::fs::remove_dir_all(&temp_dir);
    let _ = std::fs::remove_file(&archive_path);

    // Make executable on Linux/macOS.
    #[cfg(not(target_os = "windows"))]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = std::fs::set_permissions(&java_path, std::fs::Permissions::from_mode(0o755));
    }

    emit_line(app, &format!("[java/INFO] Java {java_version} installed successfully to {}", java_path.display()));
    Ok(java_path.to_string_lossy().to_string())
}