use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use base64::Engine as _;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::util::app_data_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceModItem {
    pub filename: String,
    pub name: String,
    pub version: Option<String>,
    pub enabled: bool,
    pub file_size: u64,
    pub mod_id: Option<String>,
    pub mod_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstancePackItem {
    pub filename: String,
    pub name: String,
    pub enabled: bool,
    pub file_size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceWorldItem {
    pub folder_name: String,
    pub display_name: String,
    pub last_played: Option<u64>,
    pub size_bytes: u64,
    pub icon_base64: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceScreenshotItem {
    pub filename: String,
    pub date_modified: u64,
    pub size_bytes: u64,
    pub data_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct InstanceConfigData {
    // Window settings (screenshot 2)
    pub fullscreen: Option<bool>,
    pub window_width: Option<u32>,
    pub window_height: Option<u32>,
    pub hide_launcher_on_start: Option<bool>,
    pub close_launcher_on_exit: Option<bool>,

    // Console window settings (screenshot 2)
    pub show_console_on_start: Option<bool>,
    pub show_console_on_crash: Option<bool>,
    pub hide_console_on_exit: Option<bool>,

    // Playtime tracking (screenshot 3)
    pub show_playtime: Option<bool>,
    pub record_playtime: Option<bool>,

    // Account override (screenshot 3)
    pub override_account: Option<String>,

    // Auto-connect (screenshot 3)
    pub autoconnect_server: Option<String>,
    pub autoconnect_world: Option<String>,

    // Override loaders (screenshot 4)
    pub override_loaders: Option<Vec<String>>,

    // Java & Memory settings (screenshot 5)
    pub java_path: Option<String>,
    pub skip_java_compatibility: Option<bool>,
    pub min_memory_mb: Option<u32>,
    pub max_memory_mb: Option<u32>,
    pub perm_gen_mb: Option<u32>,
    pub warn_memory: Option<bool>,
    pub custom_jvm_args: Option<String>,

    // Native libraries & Performance (screenshot 6)
    pub system_glfw_path: Option<String>,
    pub system_openal_path: Option<String>,
    pub enable_gamemode: Option<bool>,
    pub enable_mangohud: Option<bool>,
    pub use_discrete_gpu: Option<bool>,
    pub use_zink: Option<bool>,

    // Custom commands (screenshot 7)
    pub pre_launch_command: Option<String>,
    pub wrapper_command: Option<String>,
    pub post_exit_command: Option<String>,

    // Environment variables (screenshot 8)
    pub override_env_vars: Option<bool>,
    pub env_vars: Option<HashMap<String, String>>,
}

fn get_mc_dir(app: &AppHandle, instance_id: &str) -> Result<PathBuf, String> {
    let data_dir = app_data_dir(app);
    let path = data_dir
        .join("instances")
        .join(instance_id)
        .join("minecraft");
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

fn get_instance_root_dir(app: &AppHandle, instance_id: &str) -> Result<PathBuf, String> {
    let data_dir = app_data_dir(app);
    let path = data_dir.join("instances").join(instance_id);
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path)
}

// ---------------------------------------------------------------------------
// 1. MODS MANAGEMENT
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_instance_mods(
    app: AppHandle,
    db: tauri::State<'_, crate::db::Db>,
    instance_id: String,
) -> Result<Vec<InstanceModItem>, String> {
    let mods_dir = get_mc_dir(&app, &instance_id)?.join("mods");
    if !mods_dir.exists() {
        return Ok(Vec::new());
    }

    let db_records = crate::db::db_list_installed_mods(db, instance_id).unwrap_or_default();
    let mut db_map: HashMap<String, (String, Option<String>)> = HashMap::new();
    for rec in db_records {
        db_map.insert(rec.filename.clone(), (rec.mod_id.clone(), rec.version.clone()));
    }

    let entries = fs::read_dir(&mods_dir).map_err(|e| e.to_string())?;
    let mut items = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let filename = entry.file_name().to_string_lossy().to_string();
        let is_disabled = filename.ends_with(".disabled");
        let active_name = if is_disabled {
            filename.trim_end_matches(".disabled").to_string()
        } else {
            filename.clone()
        };

        if !active_name.ends_with(".jar") && !active_name.ends_with(".zip") {
            continue;
        }

        let clean_name = active_name
            .trim_end_matches(".jar")
            .trim_end_matches(".zip")
            .to_string();

        let file_size = entry.metadata().map(|m| m.len()).unwrap_or(0);

        let (mod_id, version) = db_map
            .get(&active_name)
            .or_else(|| db_map.get(&filename))
            .cloned()
            .unwrap_or_else(|| (clean_name.clone(), None));

        let mod_url = if !mod_id.is_empty() && !mod_id.chars().all(|c| c.is_ascii_digit()) {
            Some(format!("https://modrinth.com/mod/{mod_id}"))
        } else if !mod_id.is_empty() {
            Some(format!("https://www.curseforge.com/minecraft/mc-mods/{mod_id}"))
        } else {
            None
        };

        items.push(InstanceModItem {
            filename,
            name: clean_name,
            version,
            enabled: !is_disabled,
            file_size,
            mod_id: Some(mod_id),
            mod_url,
        });
    }

    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(items)
}

#[tauri::command]
pub fn toggle_instance_mod(
    app: AppHandle,
    instance_id: String,
    filename: String,
    enable: bool,
) -> Result<String, String> {
    let mods_dir = get_mc_dir(&app, &instance_id)?.join("mods");
    let old_path = mods_dir.join(&filename);
    if !old_path.exists() {
        return Err(format!("Файл {filename} не найден"));
    }

    let new_filename = if enable {
        if filename.ends_with(".disabled") {
            filename.trim_end_matches(".disabled").to_string()
        } else {
            filename
        }
    } else {
        if !filename.ends_with(".disabled") {
            format!("{filename}.disabled")
        } else {
            filename
        }
    };

    let new_path = mods_dir.join(&new_filename);
    if old_path != new_path {
        fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    }

    Ok(new_filename)
}

#[tauri::command]
pub fn delete_instance_mod(
    app: AppHandle,
    instance_id: String,
    filename: String,
) -> Result<(), String> {
    let mods_dir = get_mc_dir(&app, &instance_id)?.join("mods");
    let file_path = mods_dir.join(&filename);
    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn add_instance_mod_file(
    app: AppHandle,
    instance_id: String,
    source_path: String,
) -> Result<String, String> {
    let mods_dir = get_mc_dir(&app, &instance_id)?.join("mods");
    fs::create_dir_all(&mods_dir).map_err(|e| e.to_string())?;

    let src = PathBuf::from(&source_path);
    if !src.exists() {
        return Err(format!("Исходный файл {} не существует", source_path));
    }

    let file_name = src
        .file_name()
        .ok_or("Неверное имя файла")?
        .to_string_lossy()
        .to_string();

    let dest = mods_dir.join(&file_name);
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(file_name)
}

// ---------------------------------------------------------------------------
// 2. RESOURCE PACKS MANAGEMENT
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_instance_resourcepacks(
    app: AppHandle,
    instance_id: String,
) -> Result<Vec<InstancePackItem>, String> {
    let dir = get_mc_dir(&app, &instance_id)?.join("resourcepacks");
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut items = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        let filename = entry.file_name().to_string_lossy().to_string();
        let is_disabled = filename.ends_with(".disabled");
        let clean_name = filename
            .trim_end_matches(".disabled")
            .trim_end_matches(".zip")
            .to_string();

        let file_size = if path.is_file() {
            entry.metadata().map(|m| m.len()).unwrap_or(0)
        } else {
            0
        };

        items.push(InstancePackItem {
            filename,
            name: clean_name,
            enabled: !is_disabled,
            file_size,
        });
    }

    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(items)
}

#[tauri::command]
pub fn toggle_instance_resourcepack(
    app: AppHandle,
    instance_id: String,
    filename: String,
    enable: bool,
) -> Result<String, String> {
    let dir = get_mc_dir(&app, &instance_id)?.join("resourcepacks");
    let old_path = dir.join(&filename);
    if !old_path.exists() {
        return Err(format!("Файл {filename} не найден"));
    }

    let new_filename = if enable {
        if filename.ends_with(".disabled") {
            filename.trim_end_matches(".disabled").to_string()
        } else {
            filename
        }
    } else {
        if !filename.ends_with(".disabled") {
            format!("{filename}.disabled")
        } else {
            filename
        }
    };

    let new_path = dir.join(&new_filename);
    if old_path != new_path {
        fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    }
    Ok(new_filename)
}

#[tauri::command]
pub fn delete_instance_resourcepack(
    app: AppHandle,
    instance_id: String,
    filename: String,
) -> Result<(), String> {
    let dir = get_mc_dir(&app, &instance_id)?.join("resourcepacks");
    let path = dir.join(&filename);
    if path.is_file() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    } else if path.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn add_instance_resourcepack_file(
    app: AppHandle,
    instance_id: String,
    source_path: String,
) -> Result<String, String> {
    let dir = get_mc_dir(&app, &instance_id)?.join("resourcepacks");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let src = PathBuf::from(&source_path);
    let file_name = src
        .file_name()
        .ok_or("Неверное имя файла")?
        .to_string_lossy()
        .to_string();

    let dest = dir.join(&file_name);
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(file_name)
}

// ---------------------------------------------------------------------------
// 3. SHADER PACKS MANAGEMENT
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_instance_shaderpacks(
    app: AppHandle,
    instance_id: String,
) -> Result<Vec<InstancePackItem>, String> {
    let dir = get_mc_dir(&app, &instance_id)?.join("shaderpacks");
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut items = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        let filename = entry.file_name().to_string_lossy().to_string();
        let is_disabled = filename.ends_with(".disabled");
        let clean_name = filename
            .trim_end_matches(".disabled")
            .trim_end_matches(".zip")
            .to_string();

        let file_size = if path.is_file() {
            entry.metadata().map(|m| m.len()).unwrap_or(0)
        } else {
            0
        };

        items.push(InstancePackItem {
            filename,
            name: clean_name,
            enabled: !is_disabled,
            file_size,
        });
    }

    items.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(items)
}

#[tauri::command]
pub fn toggle_instance_shaderpack(
    app: AppHandle,
    instance_id: String,
    filename: String,
    enable: bool,
) -> Result<String, String> {
    let dir = get_mc_dir(&app, &instance_id)?.join("shaderpacks");
    let old_path = dir.join(&filename);
    if !old_path.exists() {
        return Err(format!("Файл {filename} не найден"));
    }

    let new_filename = if enable {
        if filename.ends_with(".disabled") {
            filename.trim_end_matches(".disabled").to_string()
        } else {
            filename
        }
    } else {
        if !filename.ends_with(".disabled") {
            format!("{filename}.disabled")
        } else {
            filename
        }
    };

    let new_path = dir.join(&new_filename);
    if old_path != new_path {
        fs::rename(&old_path, &new_path).map_err(|e| e.to_string())?;
    }
    Ok(new_filename)
}

#[tauri::command]
pub fn delete_instance_shaderpack(
    app: AppHandle,
    instance_id: String,
    filename: String,
) -> Result<(), String> {
    let dir = get_mc_dir(&app, &instance_id)?.join("shaderpacks");
    let path = dir.join(&filename);
    if path.is_file() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    } else if path.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn add_instance_shaderpack_file(
    app: AppHandle,
    instance_id: String,
    source_path: String,
) -> Result<String, String> {
    let dir = get_mc_dir(&app, &instance_id)?.join("shaderpacks");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let src = PathBuf::from(&source_path);
    let file_name = src
        .file_name()
        .ok_or("Неверное имя файла")?
        .to_string_lossy()
        .to_string();

    let dest = dir.join(&file_name);
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(file_name)
}

// ---------------------------------------------------------------------------
// 4. WORLDS / SAVES DETAILS
// ---------------------------------------------------------------------------

fn dir_size(path: &Path) -> u64 {
    let mut total = 0;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                total += entry.metadata().map(|m| m.len()).unwrap_or(0);
            } else if p.is_dir() {
                total += dir_size(&p);
            }
        }
    }
    total
}

#[tauri::command]
pub fn list_instance_worlds_detail(
    app: AppHandle,
    instance_id: String,
) -> Result<Vec<InstanceWorldItem>, String> {
    let saves_dir = get_mc_dir(&app, &instance_id)?.join("saves");
    if !saves_dir.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&saves_dir).map_err(|e| e.to_string())?;
    let mut worlds = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let folder_name = entry.file_name().to_string_lossy().to_string();
        let level_dat = path.join("level.dat");

        let display_name = crate::find_level_name(&level_dat).unwrap_or(folder_name.clone());
        let last_played = entry
            .metadata()
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs());

        let size_bytes = dir_size(&path);

        let icon_path = path.join("icon.png");
        let icon_base64 = if icon_path.exists() {
            fs::read(&icon_path)
                .ok()
                .map(|b| format!("data:image/png;base64,{}", base64::engine::general_purpose::STANDARD.encode(b)))
        } else {
            None
        };

        worlds.push(InstanceWorldItem {
            folder_name,
            display_name,
            last_played,
            size_bytes,
            icon_base64,
        });
    }

    worlds.sort_by(|a, b| b.last_played.cmp(&a.last_played));
    Ok(worlds)
}

#[tauri::command]
pub fn delete_instance_world(
    app: AppHandle,
    instance_id: String,
    folder_name: String,
) -> Result<(), String> {
    let world_dir = get_mc_dir(&app, &instance_id)?.join("saves").join(&folder_name);
    if world_dir.exists() {
        fs::remove_dir_all(&world_dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// 5. SCREENSHOTS MANAGEMENT
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_instance_screenshots(
    app: AppHandle,
    instance_id: String,
) -> Result<Vec<InstanceScreenshotItem>, String> {
    let dir = get_mc_dir(&app, &instance_id)?.join("screenshots");
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut items = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let filename = entry.file_name().to_string_lossy().to_string();
        let lower = filename.to_lowercase();
        if !lower.ends_with(".png") && !lower.ends_with(".jpg") && !lower.ends_with(".jpeg") {
            continue;
        }

        let meta = entry.metadata().ok();
        let size_bytes = meta.as_ref().map(|m| m.len()).unwrap_or(0);
        let date_modified = meta
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        // Read thumbnail for preview
        let data_url = if size_bytes < 5_000_000 {
            fs::read(&path)
                .ok()
                .map(|bytes| format!("data:image/png;base64,{}", base64::engine::general_purpose::STANDARD.encode(bytes)))
        } else {
            None
        };

        items.push(InstanceScreenshotItem {
            filename,
            date_modified,
            size_bytes,
            data_url,
        });
    }

    items.sort_by(|a, b| b.date_modified.cmp(&a.date_modified));
    Ok(items)
}

#[tauri::command]
pub fn delete_instance_screenshot(
    app: AppHandle,
    instance_id: String,
    filename: String,
) -> Result<(), String> {
    let path = get_mc_dir(&app, &instance_id)?.join("screenshots").join(&filename);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// 6. NOTES MANAGEMENT
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_instance_notes(app: AppHandle, instance_id: String) -> Result<String, String> {
    let path = get_instance_root_dir(&app, &instance_id)?.join("notes.txt");
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
pub fn save_instance_notes(
    app: AppHandle,
    instance_id: String,
    notes: String,
) -> Result<(), String> {
    let path = get_instance_root_dir(&app, &instance_id)?.join("notes.txt");
    fs::write(&path, notes).map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// 7. LOGS MANAGEMENT
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn list_instance_log_files(
    app: AppHandle,
    instance_id: String,
) -> Result<Vec<String>, String> {
    let mc_dir = get_mc_dir(&app, &instance_id)?;
    let mut log_files = Vec::new();

    let logs_dir = mc_dir.join("logs");
    if let Ok(entries) = fs::read_dir(&logs_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.ends_with(".log") || name.ends_with(".gz") || name.ends_with(".txt") {
                log_files.push(format!("logs/{name}"));
            }
        }
    }

    let crash_dir = mc_dir.join("crash-reports");
    if let Ok(entries) = fs::read_dir(&crash_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.ends_with(".txt") {
                log_files.push(format!("crash-reports/{name}"));
            }
        }
    }

    log_files.sort();
    Ok(log_files)
}

#[tauri::command]
pub fn get_instance_log_content(
    app: AppHandle,
    instance_id: String,
    file_rel_path: String,
) -> Result<String, String> {
    let mc_dir = get_mc_dir(&app, &instance_id)?;
    let path = mc_dir.join(&file_rel_path);

    if !path.exists() {
        // Fallback to latest.log
        let fallback = mc_dir.join("logs").join("latest.log");
        if fallback.exists() {
            return fs::read_to_string(&fallback).map_err(|e| e.to_string());
        }
        return Ok("Лог-файл пока пуст или не создан.".to_string());
    }

    let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
    let len = meta.len();
    if len > 1_000_000 {
        use std::io::{Read, Seek, SeekFrom};
        let mut file = fs::File::open(&path).map_err(|e| e.to_string())?;
        file.seek(SeekFrom::End(-1_000_000)).map_err(|e| e.to_string())?;
        let mut buf = Vec::new();
        file.read_to_end(&mut buf).map_err(|e| e.to_string())?;
        Ok(format!(
            "... [Лог слишком велик, показан последний 1 МБ] ...\n{}",
            String::from_utf8_lossy(&buf)
        ))
    } else {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    }
}

// ---------------------------------------------------------------------------
// 8. INSTANCE CONFIG / PARAMETERS (Screenshots 2-8)
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_instance_config(
    app: AppHandle,
    instance_id: String,
) -> Result<InstanceConfigData, String> {
    let path = get_instance_root_dir(&app, &instance_id)?.join("instance_config.json");
    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let config: InstanceConfigData = serde_json::from_str(&content).unwrap_or_default();
        Ok(config)
    } else {
        Ok(InstanceConfigData::default())
    }
}

#[tauri::command]
pub fn save_instance_config(
    app: AppHandle,
    instance_id: String,
    config: InstanceConfigData,
) -> Result<(), String> {
    let path = get_instance_root_dir(&app, &instance_id)?.join("instance_config.json");
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

// ---------------------------------------------------------------------------
// 9. OPEN SUBFOLDER
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn open_instance_subfolder(
    app: AppHandle,
    instance_id: String,
    subfolder: String,
) -> Result<(), String> {
    let mc_dir = get_mc_dir(&app, &instance_id)?;
    let target = if subfolder.is_empty() {
        mc_dir
    } else {
        mc_dir.join(subfolder)
    };

    fs::create_dir_all(&target).map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer").arg(&target).spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&target).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(&target).spawn();
    }

    Ok(())
}
