use std::io::Write;
use std::path::Path;

use serde_json::Value;
use tauri::{AppHandle, Emitter};

use crate::util::{app_data_dir, download_file, emit_line, get_json, relative_after};

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub name: String,
    pub mc_version: String,
    pub loader: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    pub mod_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
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

fn read_zip_text<R: std::io::Read + std::io::Seek>(
    archive: &mut zip::ZipArchive<R>,
    wanted: &str,
) -> Option<String> {
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

fn extract_archive_icon_from_archive<R: std::io::Read + std::io::Seek>(
    archive: &mut zip::ZipArchive<R>,
) -> Option<String> {
    let icon_candidates = [
        "icon.png", "instance.png", "pack.png", "logo.png",
        "modpack.png", "server-icon.png", "icon.ico", "icon.jpg", "icon.jpeg"
    ];
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).ok()?;
        if entry.is_dir() { continue; }
        let name = entry.name().to_string();
        let lower = name.to_lowercase();
        let parts: Vec<&str> = lower.split('/').collect();
        let file_name = parts.last().unwrap_or(&"");
        for candidate in &icon_candidates {
            if file_name == candidate {
                use std::io::Read;
                let mut bytes = Vec::new();
                if entry.read_to_end(&mut bytes).is_ok() && !bytes.is_empty() {
                    use base64::Engine as _;
                    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                    let mime = if file_name.ends_with(".png") {
                        "image/png"
                    } else if file_name.ends_with(".ico") {
                        "image/x-icon"
                    } else if file_name.ends_with(".jpg") || file_name.ends_with(".jpeg") {
                        "image/jpeg"
                    } else {
                        "image/png"
                    };
                    return Some(format!("data:{mime};base64,{b64}"));
                }
            }
        }
    }
    None
}

pub fn extract_archive_icon(zip_path: &Path) -> Option<String> {
    let file = std::fs::File::open(zip_path).ok()?;
    let mut archive = zip::ZipArchive::new(file).ok()?;
    extract_archive_icon_from_archive(&mut archive)
}

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

fn extract_minecraft_files(zip_path: &Path, dest: &Path) -> Result<usize, String> {
    let mut count = extract_roots(zip_path, dest, &[".minecraft", "minecraft", "overrides"])?;
    if count == 0 {
        let file = std::fs::File::open(zip_path).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
        let valid_folders = [
            "mods", "config", "resourcepacks", "shaderpacks", "saves", "schematics",
            "options.txt", "servers.dat"
        ];
        for i in 0..archive.len() {
            let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
            if entry.is_dir() { continue; }
            let name = entry.name().to_string();
            let lower = name.to_lowercase();
            let matches_root = valid_folders.iter().any(|&f| lower.starts_with(f));
            if matches_root {
                let out = dest.join(&name);
                if !out.starts_with(dest) { continue; }
                if let Some(parent) = out.parent() {
                    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                let mut out_file = std::fs::File::create(&out).map_err(|e| e.to_string())?;
                std::io::copy(&mut entry, &mut out_file).map_err(|e| e.to_string())?;
                count += 1;
            }
        }
    }
    Ok(count)
}

fn count_mods_in_instance(instance_dir: &Path) -> usize {
    let mods_dir = instance_dir.join("mods");
    if !mods_dir.is_dir() {
        return 0;
    }
    std::fs::read_dir(&mods_dir)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    let p = e.path();
                    p.is_file() && p.extension().map_or(false, |ext| ext == "jar" || ext == "zip")
                })
                .count()
        })
        .unwrap_or(0)
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

pub fn inspect_archive_internal(zip_path: &Path) -> Result<ImportSummary, String> {
    let file = std::fs::File::open(zip_path).map_err(|e| format!("Не удалось открыть файл: {e}"))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Не удалось прочитать ZIP-архив: {e}"))?;

    let icon = extract_archive_icon_from_archive(&mut archive);
    let mut file_names: Vec<String> = Vec::new();
    let mut jar_mod_count = 0;

    for i in 0..archive.len() {
        if let Ok(entry) = archive.by_index(i) {
            let name = entry.name().to_string();
            let lower = name.to_lowercase();
            if lower.ends_with(".jar") && (lower.contains("mods/") || lower.contains("mods\\")) {
                jar_mod_count += 1;
            }
            file_names.push(name);
        }
    }

    // 1. Modrinth .mrpack
    if let Some(text) = read_zip_text(&mut archive, "modrinth.index.json") {
        if let Ok(index) = serde_json::from_str::<Value>(&text) {
            let name = index.get("name").and_then(|v| v.as_str()).unwrap_or("Modrinth Modpack").to_string();
            let summary = index.get("summary").and_then(|v| v.as_str()).map(|s| s.to_string());
            let mut mc_version = "1.21.4".to_string();
            let mut loader = "Fabric".to_string();
            if let Some(deps) = index.get("dependencies") {
                if let Some(v) = deps.get("minecraft").and_then(|v| v.as_str()) {
                    mc_version = v.to_string();
                }
                if deps.get("neoforge").is_some() {
                    loader = "NeoForge".to_string();
                } else if deps.get("forge").is_some() {
                    loader = "Forge".to_string();
                } else if deps.get("quilt").is_some() {
                    loader = "Quilt".to_string();
                } else if deps.get("fabric-loader").is_some() || deps.get("fabric").is_some() {
                    loader = "Fabric".to_string();
                }
            }
            let files_count = index.get("files").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0);
            return Ok(ImportSummary {
                name,
                mc_version,
                loader,
                icon,
                mod_count: if files_count > 0 { files_count } else { jar_mod_count },
                description: summary,
            });
        }
    }

    // 2. CurseForge manifest.json
    if let Some(text) = read_zip_text(&mut archive, "manifest.json") {
        if let Ok(manifest) = serde_json::from_str::<Value>(&text) {
            let name = manifest.get("name").and_then(|v| v.as_str()).unwrap_or("CurseForge Modpack").to_string();
            let mc_version = manifest.pointer("/minecraft/version").and_then(|v| v.as_str()).unwrap_or("1.20.1").to_string();
            let loader = manifest.pointer("/minecraft/modLoaders").and_then(|v| v.as_array()).map(|a| loader_from_parts(a)).unwrap_or_else(|| "Forge".to_string());
            let files_count = manifest.get("files").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0);
            return Ok(ImportSummary {
                name,
                mc_version,
                loader,
                icon,
                mod_count: if files_count > 0 { files_count } else { jar_mod_count },
                description: manifest.get("author").and_then(|v| v.as_str()).map(|a| format!("Автор: {a}")),
            });
        }
    }

    // 3. Prism / MultiMC (mmc-pack.json or instance.cfg)
    let has_mmc = file_names.iter().any(|n| n.ends_with("mmc-pack.json"));
    let has_cfg = file_names.iter().any(|n| n.ends_with("instance.cfg"));
    if has_mmc || has_cfg {
        let mut name = zip_path.file_stem().and_then(|s| s.to_str()).unwrap_or("Imported Instance").to_string();
        let mut mc_version = "1.20.1".to_string();
        let mut loader = "Vanilla".to_string();

        if let Some(text) = read_zip_text(&mut archive, "instance.cfg") {
            for line in text.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') { continue; }
                if let Some((k, v)) = line.split_once('=') {
                    let k = k.trim();
                    let v = v.trim();
                    if k == "name" && !v.is_empty() {
                        name = v.to_string();
                    } else if (k == "MinecraftVer" || k == "IntendedVersion") && !v.is_empty() {
                        mc_version = v.to_string();
                    } else if (k == "ModLoader" || k == "LoaderVersion") && !v.is_empty() {
                        let lower = v.to_lowercase();
                        if lower.contains("fabric") { loader = "Fabric".to_string(); }
                        else if lower.contains("forge") { loader = "Forge".to_string(); }
                        else if lower.contains("neoforge") { loader = "NeoForge".to_string(); }
                        else if lower.contains("quilt") { loader = "Quilt".to_string(); }
                    }
                }
            }
        }

        if let Some(text) = read_zip_text(&mut archive, "mmc-pack.json") {
            if let Ok(json) = serde_json::from_str::<Value>(&text) {
                if let Some(components) = json.get("components").and_then(|c| c.as_array()) {
                    for c in components {
                        let uid = c.get("uid").and_then(|v| v.as_str()).unwrap_or("");
                        match uid {
                            "net.minecraft" => {
                                if let Some(v) = c.get("version").and_then(|v| v.as_str()) {
                                    mc_version = v.to_string();
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

        return Ok(ImportSummary {
            name,
            mc_version,
            loader,
            icon,
            mod_count: jar_mod_count,
            description: None,
        });
    }

    // 4. Omega format
    if let Some(text) = read_zip_text(&mut archive, "omega.metadata.json") {
        if let Ok(json) = serde_json::from_str::<Value>(&text) {
            let name = json.get("name").and_then(|v| v.as_str()).unwrap_or("Omega Instance").to_string();
            let mc_version = json.get("mcVersion").and_then(|v| v.as_str()).unwrap_or("1.21.4").to_string();
            let loader = json.get("loader").and_then(|v| v.as_str()).unwrap_or("Fabric").to_string();
            return Ok(ImportSummary {
                name,
                mc_version,
                loader,
                icon,
                mod_count: jar_mod_count,
                description: None,
            });
        }
    }

    // 5. Generic Minecraft directory zip
    let stem_name = zip_path.file_stem().and_then(|s| s.to_str()).unwrap_or("Minecraft Instance").to_string();
    let mc_version = version_from_versions_folder(zip_path).unwrap_or_else(|| "1.21.4".to_string());
    let mut loader = "Vanilla".to_string();
    for name in &file_names {
        let lower = name.to_lowercase();
        if lower.contains("fabric") { loader = "Fabric".to_string(); break; }
        if lower.contains("neoforge") { loader = "NeoForge".to_string(); break; }
        if lower.contains("forge") { loader = "Forge".to_string(); break; }
        if lower.contains("quilt") { loader = "Quilt".to_string(); break; }
    }

    Ok(ImportSummary {
        name: stem_name,
        mc_version,
        loader,
        icon,
        mod_count: jar_mod_count,
        description: None,
    })
}

#[tauri::command]
pub async fn inspect_archive(zip_path: String) -> Result<String, String> {
    let path = crate::validate::expand_user_path(&zip_path);
    if !path.exists() {
        return Err(format!("Файл не найден: {}", path.display()));
    }
    let summary = inspect_archive_internal(&path)?;
    Ok(serde_json::to_string(&summary).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn inspect_archive_bytes(
    app: AppHandle,
    file_name: String,
    file_bytes: Vec<u8>,
) -> Result<String, String> {
    let data_dir = app_data_dir(&app);
    let temp_dir = data_dir.join("temp_import");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    let temp_file = temp_dir.join(&file_name);
    std::fs::write(&temp_file, &file_bytes).map_err(|e| e.to_string())?;

    let res = inspect_archive(temp_file.to_string_lossy().to_string()).await;
    let _ = std::fs::remove_file(&temp_file);
    res
}

#[tauri::command]
pub async fn import_archive(
    app: AppHandle,
    instance_id: String,
    zip_path: String,
) -> Result<String, String> {
    let data_dir = app_data_dir(&app);
    let instance_dir = crate::validate::instance_minecraft_dir(&data_dir, &instance_id)?;
    let zip_path = crate::validate::expand_user_path(&zip_path);
    if !zip_path.exists() {
        return Err(format!("Файл не найден: {}", zip_path.display()));
    }
    std::fs::create_dir_all(&instance_dir).map_err(|e| e.to_string())?;

    emit_line(&app, &format!("[IMPORT] Чтение архива {}...", zip_path.display()));

    let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    let is_mrpack = read_zip_text(&mut archive, "modrinth.index.json").is_some();
    let is_curseforge = read_zip_text(&mut archive, "manifest.json").is_some();
    drop(archive);

    if is_mrpack {
        return import_mrpack(app, instance_id, zip_path.to_string_lossy().to_string()).await;
    }

    if is_curseforge {
        return import_curseforge(app, instance_id, zip_path.to_string_lossy().to_string()).await;
    }

    // Prism / MultiMC or Generic Minecraft folder extraction
    let summary = inspect_archive_internal(&zip_path)?;
    emit_line(&app, &format!("[IMPORT] Распаковка сборки \"{}\" (Minecraft {}, {})...", summary.name, summary.mc_version, summary.loader));

    let _ = app.emit(
        "install-progress",
        serde_json::json!({ "step": "extract", "current": 0, "total": 1 }),
    );

    let count = extract_minecraft_files(&zip_path, &instance_dir)?;
    emit_line(&app, &format!("[IMPORT] Извлечено {count} файлов в {}.", instance_dir.display()));

    let icon = summary.icon.clone().or_else(|| extract_archive_icon(&zip_path));
    if let Some(ref icon_data_url) = icon {
        if let Some((_, base64_data)) = icon_data_url.split_once(',') {
            use base64::Engine as _;
            if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(base64_data) {
                let _ = std::fs::write(instance_dir.join("icon.png"), bytes);
            }
        }
    }

    let real_mods = count_mods_in_instance(&instance_dir);
    let final_mod_count = if real_mods > 0 { real_mods } else { summary.mod_count };

    let _ = app.emit(
        "install-progress",
        serde_json::json!({ "step": "done", "current": 1, "total": 1 }),
    );
    emit_line(&app, &format!("[IMPORT] Импорт успешно завершен! Установлено {final_mod_count} модов."));

    let final_summary = ImportSummary {
        name: summary.name,
        mc_version: summary.mc_version,
        loader: summary.loader,
        icon,
        mod_count: final_mod_count,
        description: summary.description,
    };

    Ok(serde_json::to_string(&final_summary).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn import_archive_bytes(
    app: AppHandle,
    instance_id: String,
    file_name: String,
    file_bytes: Vec<u8>,
) -> Result<String, String> {
    let data_dir = app_data_dir(&app);
    let temp_dir = data_dir.join("temp_import");
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
    let temp_file = temp_dir.join(&file_name);
    std::fs::write(&temp_file, &file_bytes).map_err(|e| e.to_string())?;

    let res = import_archive(app, instance_id, temp_file.to_string_lossy().to_string()).await;
    let _ = std::fs::remove_file(&temp_file);
    res
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
        if let Some(v) = version_from_versions_folder(&zip_path) {
            emit_line(&app, &format!("[IMPORT] mmc-pack.json и instance.cfg не найдены, версия взята из папки versions: {v}"));
            mc_version = v;
        }
    }

    emit_line(&app, &format!("[IMPORT] Определено: Minecraft {mc_version}, загрузчик {loader}."));

    let count = extract_minecraft_files(&zip_path, &instance_dir)?;
    emit_line(&app, &format!("[IMPORT] Успешно извлечено {count} файлов."));

    let icon = extract_archive_icon(&zip_path);
    if let Some(ref icon_data_url) = icon {
        if let Some((_, base64_data)) = icon_data_url.split_once(',') {
            use base64::Engine as _;
            if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(base64_data) {
                let _ = std::fs::write(instance_dir.join("icon.png"), bytes);
            }
        }
    }

    let real_mods = count_mods_in_instance(&instance_dir);

    let _ = app.emit(
        "install-progress",
        serde_json::json!({ "step": "extract", "current": 1, "total": 1 }),
    );
    let _ = app.emit("install-progress", serde_json::json!({ "step": "done", "current": 1, "total": 1 }));

    let summary = ImportSummary {
        name,
        mc_version,
        loader,
        icon,
        mod_count: real_mods,
        description: None,
    };
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
    let mut files_len = 0;

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
            if let Some(f) = json.get("files").and_then(|v| v.as_array()) {
                files_len = f.len();
            }
        }
    }

    let count = extract_roots(&zip_path, &instance_dir, &[&overrides_folder, "minecraft", ".minecraft"])?;
    emit_line(&app, &format!("[IMPORT] Успешно извлечено {count} файлов."));

    let icon = extract_archive_icon(&zip_path);
    if let Some(ref icon_data_url) = icon {
        if let Some((_, base64_data)) = icon_data_url.split_once(',') {
            use base64::Engine as _;
            if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(base64_data) {
                let _ = std::fs::write(instance_dir.join("icon.png"), bytes);
            }
        }
    }

    let real_mods = count_mods_in_instance(&instance_dir);
    let mod_count = if real_mods > 0 { real_mods } else { files_len };

    let _ = app.emit(
        "install-progress",
        serde_json::json!({ "step": "extract", "current": 1, "total": 1 }),
    );
    let _ = app.emit("install-progress", serde_json::json!({ "step": "done", "current": 1, "total": 1 }));

    let summary = ImportSummary {
        name,
        mc_version,
        loader,
        icon,
        mod_count,
        description: None,
    };
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

    let mut mc_version = "1.21.4".to_string();
    let mut loader = "Fabric".to_string();
    if let Some(deps) = index.get("dependencies") {
        if let Some(v) = deps.get("minecraft").and_then(|v| v.as_str()) {
            mc_version = v.to_string();
        }
        if deps.get("neoforge").is_some() {
            loader = "NeoForge".to_string();
        } else if deps.get("forge").is_some() {
            loader = "Forge".to_string();
        } else if deps.get("quilt").is_some() {
            loader = "Quilt".to_string();
        } else if deps.get("fabric-loader").is_some() || deps.get("fabric").is_some() {
            loader = "Fabric".to_string();
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

    let icon = extract_archive_icon(&zip_path);
    if let Some(ref icon_data_url) = icon {
        if let Some((_, base64_data)) = icon_data_url.split_once(',') {
            use base64::Engine as _;
            if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(base64_data) {
                let _ = std::fs::write(instance_dir.join("icon.png"), bytes);
            }
        }
    }

    let real_mods = count_mods_in_instance(&instance_dir);
    let final_mod_count = if real_mods > 0 { real_mods } else { downloaded };

    let _ = app.emit("install-progress", serde_json::json!({ "step": "done", "current": 1, "total": 1 }));

    let summary = ImportSummary {
        name,
        mc_version,
        loader,
        icon,
        mod_count: final_mod_count,
        description: None,
    };
    Ok(serde_json::to_string(&summary).map_err(|e| e.to_string())?)
}

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

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;
    use zip::write::SimpleFileOptions;

    #[test]
    fn test_inspect_mrpack() {
        let mut buf = Cursor::new(Vec::new());
        {
            let mut zip = zip::ZipWriter::new(&mut buf);
            zip.start_file("modrinth.index.json", SimpleFileOptions::default()).unwrap();
            let index = serde_json::json!({
                "formatVersion": 1,
                "game": "minecraft",
                "versionId": "1.0",
                "name": "Test Modrinth Pack",
                "summary": "High performance modpack",
                "dependencies": {
                    "minecraft": "1.21.1",
                    "fabric-loader": "0.16.0"
                },
                "files": [
                    { "path": "mods/sodium.jar", "downloads": ["https://example.com/sodium.jar"] },
                    { "path": "mods/lithium.jar", "downloads": ["https://example.com/lithium.jar"] }
                ]
            });
            zip.write_all(index.to_string().as_bytes()).unwrap();

            // Include an icon to verify icon extraction
            zip.start_file("icon.png", SimpleFileOptions::default()).unwrap();
            zip.write_all(b"fake_png_bytes").unwrap();

            zip.finish().unwrap();
        }

        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join(format!("test_mrpack_{}.mrpack", std::time::SystemTime::now().elapsed().unwrap().as_nanos()));
        std::fs::write(&test_file, buf.into_inner()).unwrap();

        let summary = inspect_archive_internal(&test_file).unwrap();
        assert_eq!(summary.name, "Test Modrinth Pack");
        assert_eq!(summary.mc_version, "1.21.1");
        assert_eq!(summary.loader, "Fabric");
        assert_eq!(summary.mod_count, 2);
        assert!(summary.icon.is_some());
        assert!(summary.icon.unwrap().starts_with("data:image/png;base64,"));

        let _ = std::fs::remove_file(test_file);
    }

    #[test]
    fn test_inspect_prism_instance() {
        let mut buf = Cursor::new(Vec::new());
        {
            let mut zip = zip::ZipWriter::new(&mut buf);
            zip.start_file("instance.cfg", SimpleFileOptions::default()).unwrap();
            zip.write_all(b"name=My Prism Instance\nMinecraftVer=1.20.1\nModLoader=Forge\n").unwrap();

            zip.start_file("minecraft/mods/jei.jar", SimpleFileOptions::default()).unwrap();
            zip.write_all(b"jar").unwrap();

            zip.finish().unwrap();
        }

        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join(format!("test_prism_{}.zip", std::time::SystemTime::now().elapsed().unwrap().as_nanos()));
        std::fs::write(&test_file, buf.into_inner()).unwrap();

        let summary = inspect_archive_internal(&test_file).unwrap();
        assert_eq!(summary.name, "My Prism Instance");
        assert_eq!(summary.mc_version, "1.20.1");
        assert_eq!(summary.loader, "Forge");
        assert_eq!(summary.mod_count, 1);
        assert_eq!(summary.icon, None);

        let _ = std::fs::remove_file(test_file);
    }
}
