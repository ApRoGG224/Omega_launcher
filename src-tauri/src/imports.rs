use std::io::Write;
use std::path::Path;

use serde_json::Value;
use tauri::{AppHandle, Emitter};

use crate::util::{app_data_dir, download_file, emit_line, get_json, relative_after};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportSummary {
    name: String,
    mc_version: String,
    loader: String,
}

fn read_zip_entry(zip_path: &Path, wanted: &str) -> Option<String> {
    let file = std::fs::File::open(zip_path).ok()?;
    let mut archive = zip::ZipArchive::new(file).ok()?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).ok()?;
        let name = entry.name().to_string();
        if name == wanted || name.ends_with(&format!("/{wanted}")) {
            let mut buf = String::new();
            use std::io::Read;
            entry.read_to_string(&mut buf).ok()?;
            return Some(buf);
        }
    }
    None
}

/// Extracts a single entry (by exact or suffix path match) from a zip archive.
fn extract_zip_entry(zip_path: &Path, wanted: &str, dest: &Path) -> Result<bool, String> {
    let file = std::fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();
        if entry.is_dir() || (name != wanted && !name.ends_with(&format!("/{wanted}"))) {
            continue;
        }
        if let Some(parent) = dest.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut out = std::fs::File::create(dest).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
        return Ok(true);
    }
    Ok(false)
}

/// Extracts all entries whose path contains a root folder (e.g. `.minecraft`,
/// `overrides`, or a custom override folder) and returns the file count.
fn extract_roots(zip_path: &Path, dest: &Path, roots: &[&str]) -> Result<usize, String> {
    let file = std::fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut count = 0;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        if entry.is_dir() {
            continue;
        }
        let name = entry.name().to_string();
        let parts: Vec<&str> = name.split('/').collect();
        let mut rel: Option<String> = None;
        for root in roots {
            if let Some(r) = relative_after(&parts, root) {
                rel = Some(r);
                break;
            }
        }
        let Some(rel) = rel else { continue };
        let out = dest.join(&rel);
        if !out.starts_with(dest) {
            continue;
        }
        if let Some(parent) = out.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut out_file = std::fs::File::create(&out).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out_file).map_err(|e| e.to_string())?;
        count += 1;
    }
    Ok(count)
}

fn loader_from_parts(parts: &[Value]) -> String {
    for p in parts {
        let id = p.get("id").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
        if id.starts_with("fabric") {
            return "Fabric".to_string();
        }
        if id.starts_with("forge") {
            return "Forge".to_string();
        }
        if id.starts_with("neoforge") {
            return "NeoForge".to_string();
        }
        if id.starts_with("quilt") {
            return "Quilt".to_string();
        }
    }
    "Vanilla".to_string()
}

/// Picks the vanilla version id from `.minecraft/versions/<id>/<id>.json` entries.
/// Used as a last-resort fallback when `instance.cfg` and `mmc-pack.json` are missing.
fn version_from_versions_folder(zip_path: &Path) -> Option<String> {
    let file = std::fs::File::open(zip_path).ok()?;
    let mut archive = zip::ZipArchive::new(file).ok()?;
    let mut candidates: Vec<String> = Vec::new();
    for i in 0..archive.len() {
        let entry = archive.by_index(i).ok()?;
        if entry.is_dir() {
            continue;
        }
        let name = entry.name().to_string();
        if !name.ends_with(".json") {
            continue;
        }
        let lower = name.to_lowercase();
        if lower.contains("loader") || lower.contains("fabric-") || lower.contains("forge-")
            || lower.contains("quilt-") || lower.contains("neoforge-") {
            continue;
        }
        let parts: Vec<&str> = name.split('/').collect();
        if parts.len() < 2 {
            continue;
        }
        let file_name = parts[parts.len() - 1];
        let Some(stem) = file_name.strip_suffix(".json") else { continue };
        if parts[parts.len() - 2] == stem && stem.contains('.') {
            candidates.push(stem.to_string());
        }
    }
    candidates.sort();
    candidates.pop()
}

#[tauri::command]
pub async fn import_prism(
    app: AppHandle,
    instance_id: String,
    zip_path: String,
) -> Result<String, String> {
    let data_dir = app_data_dir(&app);
    let instance_dir = crate::validate::instance_minecraft_dir(&data_dir, &instance_id)?;
    let zip_path = crate::validate::expand_user_path(&zip_path);
    std::fs::create_dir_all(&instance_dir).map_err(|e| e.to_string())?;

    emit_line(&app, &format!("[IMPORT] Чтение архива {}...", zip_path.display()));

    let mut mc_version = "1.20.1".to_string();
    let mut loader = "Vanilla".to_string();
    let mut name = zip_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Prism Import")
        .to_string();

    let mut mmc_version_found = false;
    if let Some(text) = read_zip_entry(&zip_path, "mmc-pack.json") {
        if let Ok(json) = serde_json::from_str::<Value>(&text) {
            let components = json.get("components").and_then(|c| c.as_array());
            if let Some(components) = components {
                for c in components {
                    let uid = c.get("uid").and_then(|v| v.as_str()).unwrap_or("");
                    match uid {
                        "net.minecraft" => {
                            if let Some(v) = c.get("version").and_then(|v| v.as_str()) {
                                mc_version = v.to_string();
                                mmc_version_found = true;
                            }
                        }
                        "net.fabricmc.fabric-loader" => loader = "Fabric".to_string(),
                        "net.minecraftforge" => loader = "Forge".to_string(),
                        "net.neoforged" => loader = "NeoForge".to_string(),
                        "com.quiltmc.quilt-loader" => loader = "Quilt".to_string(),
                        _ => {}
                    }
                }
            }
        }
    }

    // Prefer mmc-pack.json: it describes the actual component selected for the
    // instance. Some Prism exports keep a stale MinecraftVer in instance.cfg.
    // Use instance.cfg as a fallback for older/incomplete exports.
    let mut cfg_found = false;
    if let Some(text) = read_zip_entry(&zip_path, "instance.cfg") {
        cfg_found = true;
        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let Some((key, value)) = line.split_once('=') else { continue };
            let key = key.trim();
            let value = value.trim();
            match key {
                "name" if !value.is_empty() => name = value.to_string(),
                "MinecraftVer" if !mmc_version_found && !value.is_empty() => {
                    mc_version = value.to_string();
                }
                "LoaderVersion" | "ModLoader" if loader == "Vanilla" && !value.is_empty() => {
                    let lower = value.to_lowercase();
                    if lower.contains("fabric") {
                        loader = "Fabric".to_string();
                    } else if lower.contains("quilt") {
                        loader = "Quilt".to_string();
                    } else if lower.contains("neoforge") {
                        loader = "NeoForge".to_string();
                    } else if lower.contains("forge") {
                        loader = "Forge".to_string();
                    }
                }
                _ => {}
            }
        }
    }

    if !cfg_found && mc_version == "1.20.1" {
        // Not a Prism export: maybe a raw .minecraft folder dump.
        if let Some(v) = version_from_versions_folder(&zip_path) {
            emit_line(&app, &format!("[IMPORT] mmc-pack.json и instance.cfg не найдены, версия взята из папки versions: {v}"));
            mc_version = v;
        }
    }

    emit_line(&app, &format!("[IMPORT] Определено: Minecraft {mc_version}, загрузчик {loader}."));

    let count = extract_roots(&zip_path, &instance_dir, &[".minecraft", "minecraft", "overrides"])?;
    emit_line(&app, &format!("[IMPORT] Успешно извлечено {count} файлов."));
    let _ = app.emit(
        "install-progress",
        serde_json::json!({ "step": "extract", "current": 1, "total": 1 }),
    );
    let _ = app.emit("install-progress", serde_json::json!({ "step": "done", "current": 1, "total": 1 }));

    let summary = ImportSummary { name, mc_version, loader };
    Ok(serde_json::to_string(&summary).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn import_curseforge(
    app: AppHandle,
    instance_id: String,
    zip_path: String,
) -> Result<String, String> {
    let data_dir = app_data_dir(&app);
    let instance_dir = crate::validate::instance_minecraft_dir(&data_dir, &instance_id)?;
    let zip_path = crate::validate::expand_user_path(&zip_path);
    std::fs::create_dir_all(&instance_dir).map_err(|e| e.to_string())?;

    emit_line(&app, &format!("[IMPORT] Чтение архива CurseForge {}...", zip_path.display()));

    let mut mc_version = "1.20.1".to_string();
    let mut loader = "Vanilla".to_string();
    let mut name = zip_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("CurseForge Import")
        .to_string();
    let mut overrides_folder = "overrides".to_string();

    if let Some(text) = read_zip_entry(&zip_path, "manifest.json") {
        if let Ok(json) = serde_json::from_str::<Value>(&text) {
            if let Some(n) = json.get("name").and_then(|v| v.as_str()) {
                name = n.to_string();
            }
            if let Some(ver) = json.pointer("/minecraft/version").and_then(|v| v.as_str()) {
                mc_version = ver.to_string();
            }
            if let Some(loaders) = json.pointer("/minecraft/modLoaders").and_then(|v| v.as_array()) {
                loader = loader_from_parts(loaders);
            }
            if let Some(o) = json.get("overrides").and_then(|v| v.as_str()) {
                overrides_folder = o.to_string();
            }
        }
    }

    let count = extract_roots(&zip_path, &instance_dir, &[&overrides_folder, "minecraft", ".minecraft"])?;
    emit_line(&app, &format!("[IMPORT] Успешно извлечено {count} файлов."));
    emit_line(
        &app,
        "[IMPORT] Внимание: Из-за ограничений CurseForge API автоматическое скачивание самих модов (.jar) отключено.",
    );
    let _ = app.emit(
        "install-progress",
        serde_json::json!({ "step": "extract", "current": 1, "total": 1 }),
    );
    let _ = app.emit("install-progress", serde_json::json!({ "step": "done", "current": 1, "total": 1 }));

    let summary = ImportSummary { name, mc_version, loader };
    Ok(serde_json::to_string(&summary).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn import_mrpack(
    app: AppHandle,
    instance_id: String,
    zip_path: String,
) -> Result<String, String> {
    let data_dir = app_data_dir(&app);
    let instance_dir = crate::validate::instance_minecraft_dir(&data_dir, &instance_id)?;
    let zip_path = crate::validate::expand_user_path(&zip_path);
    std::fs::create_dir_all(&instance_dir).map_err(|e| e.to_string())?;

    emit_line(&app, &format!("[IMPORT] Чтение архива Modrinth/Omega (.mrpack) {}...", zip_path.display()));

    let index_text = read_zip_entry(&zip_path, "modrinth.index.json")
        .ok_or("Это не валидный .mrpack (отсутствует modrinth.index.json)")?;
    let index: Value = serde_json::from_str(&index_text).map_err(|e| e.to_string())?;
    let files = index
        .get("files")
        .and_then(|v| v.as_array())
        .ok_or("Это не валидный .mrpack (отсутствует files)")?;

    let mut mc_version = "1.20.1".to_string();
    let mut loader = "Vanilla".to_string();
    if let Some(deps) = index.get("dependencies") {
        if let Some(v) = deps.get("minecraft").and_then(|v| v.as_str()) {
            mc_version = v.to_string();
        }
        if deps.get("fabric").is_some() {
            loader = "Fabric".to_string();
        } else if deps.get("forge").is_some() {
            loader = "Forge".to_string();
        } else if deps.get("neoforge").is_some() {
            loader = "NeoForge".to_string();
        } else if deps.get("quilt").is_some() {
            loader = "Quilt".to_string();
        }
    }
    let name = index
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Modrinth Import")
        .to_string();

    emit_line(&app, &format!("[IMPORT] Найдено {} файлов для скачивания...", files.len()));
    let client = reqwest::Client::new();
    let mut downloaded = 0;
    let total_files = files.len();
    for (i, file) in files.iter().enumerate() {
        let _ = app.emit(
            "install-progress",
            serde_json::json!({
                "step": "mods",
                "current": i + 1,
                "total": total_files
            }),
        );
        let Some(path) = file.get("path").and_then(|v| v.as_str()) else { continue };
        let Some(url) = file.get("downloads").and_then(|d| d.as_array()).and_then(|a| a.first()).and_then(|v| v.as_str()) else {
            continue;
        };
        let dest = instance_dir.join(path);
        if !dest.starts_with(&instance_dir) {
            continue;
        }
        match download_file(&app, &client, url, &dest).await {
            Ok(_) => {
                downloaded += 1;
                if downloaded % 10 == 0 {
                    emit_line(&app, &format!("[IMPORT] Скачано {downloaded}/{} файлов...", files.len()));
                }
            }
            Err(e) => {
                // Offline fallback: pull the file straight out of the archive if present.
                match extract_zip_entry(&zip_path, path, &dest) {
                    Ok(true) => downloaded += 1,
                    Ok(false) => emit_line(&app, &format!("[IMPORT] Файл не найден ни в сети, ни в архиве: {path}")),
                    Err(_) => emit_line(&app, &format!("[IMPORT] Ошибка загрузки {url}: {e}")),
                }
            }
        }
    }
    emit_line(&app, &format!("[IMPORT] Успешно скачано {downloaded} файлов модов."));

    let count = extract_roots(&zip_path, &instance_dir, &["overrides"])?;
    emit_line(&app, &format!("[IMPORT] Успешно извлечено {count} дополнительных файлов."));
    let _ = app.emit("install-progress", serde_json::json!({ "step": "done", "current": 1, "total": 1 }));

    let summary = ImportSummary { name, mc_version, loader };
    Ok(serde_json::to_string(&summary).map_err(|e| e.to_string())?)
}

/// Zips a folder tree into an archive. Used by export_modpack.
fn add_folder_to_zip<T: std::io::Write + std::io::Seek>(
    zip: &mut zip::ZipWriter<T>,
    dir: &Path,
    prefix: &str,
) -> Result<(), String> {
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let rel = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("invalid file name")?;
        let zip_name = format!("{prefix}/{rel}");
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        if meta.is_dir() {
            add_folder_to_zip(zip, &path, &zip_name)?;
        } else if meta.is_file() {
            let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
            zip.start_file(zip_name, zip::write::SimpleFileOptions::default())
                .map_err(|e| e.to_string())?;
            zip.write_all(&bytes).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn export_modpack(
    app: AppHandle,
    instance_id: String,
    instance_name: String,
    export_path: String,
) -> Result<String, String> {
    let data_dir = app_data_dir(&app);
    let instance_dir = crate::validate::instance_minecraft_dir(&data_dir, &instance_id)?;
    let export_dir = crate::validate::expand_user_path(&export_path);
    if !export_dir.is_dir() {
        std::fs::create_dir_all(&export_dir).map_err(|e| e.to_string())?;
    }

    emit_line(&app, &format!("[EXPORT] Подготовка к экспорту сборки \"{instance_name}\"..."));
    let safe_name: String = instance_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let mrpack_path = export_dir.join(format!("{safe_name}_modpack.mrpack"));

    let mut zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
    let index_json = serde_json::json!({
        "formatVersion": 1,
        "game": "minecraft",
        "versionId": "1.0.0",
        "name": instance_name,
        "dependencies": { "minecraft": "1.21.4" },
        "files": []
    });
    zip.start_file("modrinth.index.json", zip::write::SimpleFileOptions::default())
        .map_err(|e| e.to_string())?;
    zip.write_all(serde_json::to_string_pretty(&index_json).unwrap_or_default().as_bytes())
        .map_err(|e| e.to_string())?;

    for folder in ["mods", "config", "resourcepacks", "shaderpacks"] {
        let dir = instance_dir.join(folder);
        if dir.is_dir() {
            emit_line(&app, &format!("[EXPORT] Добавление папки {folder}..."));
            add_folder_to_zip(&mut zip, &dir, &format!("overrides/{folder}"))?;
        }
    }

    let cursor = zip.finish().map_err(|e| e.to_string())?;
    std::fs::write(&mrpack_path, cursor.into_inner()).map_err(|e| e.to_string())?;

emit_line(
        &app,
        &format!("[SUCCESS] Сборка успешно сохранена в загрузки: {}", mrpack_path.display()),
    );
    Ok(mrpack_path.to_string_lossy().to_string())
}

/// Exports a full instance snapshot into a single `.omega` archive containing
/// the mrpack index, `omega.metadata.json` and the `overrides/` folders.
#[tauri::command]
pub async fn export_omega(
    app: AppHandle,
    instance_id: String,
    instance_name: String,
    mc_version: String,
    loader: String,
    export_path: String,
) -> Result<String, String> {
    let data_dir = app_data_dir(&app);
    let instance_dir = crate::validate::instance_minecraft_dir(&data_dir, &instance_id)?;
    let export_dir = crate::validate::expand_user_path(&export_path);
    if !export_dir.is_dir() {
        std::fs::create_dir_all(&export_dir).map_err(|e| e.to_string())?;
    }

    emit_line(&app, &format!("[EXPORT] Экспорт сборки \"{instance_name}\" в .omega..."));
    let safe_name: String = instance_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    let omega_path = export_dir.join(format!("{safe_name}.omega"));

    let mut zip = zip::ZipWriter::new(std::io::Cursor::new(Vec::new()));
    let metadata = serde_json::json!({
        "formatVersion": 1,
        "name": instance_name,
        "mcVersion": mc_version,
        "loader": loader
    });
    zip.start_file("omega.metadata.json", zip::write::SimpleFileOptions::default())
        .map_err(|e| e.to_string())?;
    zip.write_all(serde_json::to_string_pretty(&metadata).unwrap_or_default().as_bytes())
        .map_err(|e| e.to_string())?;

    let index_json = serde_json::json!({
        "formatVersion": 1,
        "game": "minecraft",
        "versionId": "1.0.0",
        "name": instance_name,
        "dependencies": { "minecraft": mc_version, "loader": loader },
        "files": []
    });
    zip.start_file("modrinth.index.json", zip::write::SimpleFileOptions::default())
        .map_err(|e| e.to_string())?;
    zip.write_all(serde_json::to_string_pretty(&index_json).unwrap_or_default().as_bytes())
        .map_err(|e| e.to_string())?;

    for folder in ["mods", "config", "resourcepacks", "shaderpacks", "saves"] {
        let dir = instance_dir.join(folder);
        if dir.is_dir() {
            emit_line(&app, &format!("[EXPORT] Добавление папки {folder}..."));
            add_folder_to_zip(&mut zip, &dir, &format!("overrides/{folder}"))?;
        }
    }

    let cursor = zip.finish().map_err(|e| e.to_string())?;
    std::fs::write(&omega_path, cursor.into_inner()).map_err(|e| e.to_string())?;
    emit_line(
        &app,
        &format!("[SUCCESS] Сборка экспортирована: {}", omega_path.display()),
    );
    Ok(omega_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn install_modpack(
    app: AppHandle,
    mod_id: String,
    mc_version: String,
    loader: String,
    instance_id: String,
) -> Result<String, String> {
    let data_dir = app_data_dir(&app);
    let instance_dir = crate::validate::instance_minecraft_dir(&data_dir, &instance_id)?;
    std::fs::create_dir_all(&instance_dir).map_err(|e| e.to_string())?;

    let client = reqwest::Client::new();
    emit_line(&app, "[DOWNLOADER] Получение манифеста сборки...");
    let versions: Vec<Value> = get_json(&client, &format!("https://api.modrinth.com/v2/project/{mod_id}/version")).await?;
    let valid = versions.iter().find(|v| {
        let gv = v.get("game_versions").and_then(|x| x.as_array());
        let l = v.get("loaders").and_then(|x| x.as_array());
        gv.map(|g| g.iter().any(|x| x == &serde_json::json!(mc_version))).unwrap_or(false)
            && l.map(|g| g.iter().any(|x| x == &serde_json::json!(loader))).unwrap_or(false)
    });
    let Some(valid) = valid else {
        return Err(format!("Не найдено подходящей версии сборки для {mc_version} ({loader})"));
    };
    let files = valid.get("files").and_then(|f| f.as_array()).ok_or("No files")?;
    let file = files.iter().find(|f| f.get("primary").and_then(|p| p.as_bool()).unwrap_or(false)).unwrap_or(&files[0]);
    let url = file.get("url").and_then(|u| u.as_str()).ok_or("No download url")?;
    let filename = file.get("filename").and_then(|f| f.as_str()).unwrap_or("modpack.mrpack");

    emit_line(&app, "[DOWNLOADER] Скачивание архива сборки...");
    let mrpack_path = instance_dir.join(filename);
    download_file(&app, &client, url, &mrpack_path).await?;

    emit_line(&app, "[DOWNLOADER] Распаковка сборки...");
    let index_text = read_zip_entry(&mrpack_path, "modrinth.index.json")
        .ok_or("Invalid .mrpack: missing modrinth.index.json")?;
    let index: Value = serde_json::from_str(&index_text).map_err(|e| e.to_string())?;
    let files_to_download = index.get("files").and_then(|f| f.as_array()).cloned().unwrap_or_default();

    emit_line(&app, &format!("[DOWNLOADER] Найдено {} модов для скачивания.", files_to_download.len()));
    let total_files = files_to_download.len();
    for (i, file) in files_to_download.iter().enumerate() {
        let _ = app.emit(
            "install-progress",
            serde_json::json!({
                "step": "mods",
                "current": i + 1,
                "total": total_files
            }),
        );
        let Some(path) = file.get("path").and_then(|v| v.as_str()) else { continue };
        let Some(download_url) = file.get("downloads").and_then(|d| d.as_array()).and_then(|a| a.first()).and_then(|v| v.as_str()) else {
            continue;
        };
        let target = instance_dir.join(path);
        if !target.starts_with(&instance_dir) {
            continue;
        }
        if !target.exists() {
            emit_line(&app, &format!("[DOWNLOADER] Мод {}/{}: {}", i + 1, files_to_download.len(), target.file_name().and_then(|s| s.to_str()).unwrap_or("")));
            download_file(&app, &client, download_url, &target).await?;
        }
    }

    emit_line(&app, "[DOWNLOADER] Применение конфигураций и настроек (overrides)...");
    let _ = app.emit(
        "install-progress",
        serde_json::json!({ "step": "overrides", "current": 1, "total": 1 }),
    );
    let count = extract_roots(&mrpack_path, &instance_dir, &["overrides"])?;
    emit_line(&app, &format!("[DOWNLOADER] Применено {count} файлов конфигурации."));
    let _ = app.emit("install-progress", serde_json::json!({ "step": "done", "current": 1, "total": 1 }));

    let _ = std::fs::remove_file(&mrpack_path);
    emit_line(&app, "[SUCCESS] Сборка успешно скачана!");
    Ok("Success".to_string())
}
