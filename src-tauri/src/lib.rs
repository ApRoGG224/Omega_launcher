use std::io::Read;
use flate2::read::GzDecoder;
use tauri::{AppHandle, Manager};

mod auth;
mod cache;
mod db;
mod download;
mod imports;
mod installer;
mod java;
mod launch;
mod network;
mod util;
mod validate;

fn get_data_dir(app: &AppHandle) -> String {
    let mut path = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    path.push("minecraft_data");
    let _ = std::fs::create_dir_all(&path);
    path.to_string_lossy().to_string()
}

#[tauri::command]
fn find_system_java(mc_version: String) -> Option<String> {
    let required = java::required_java_version(&mc_version);
    java::find_system_java(required)
}

#[tauri::command]
fn app_exit(app: AppHandle) {
    app.exit(0);
}

/// Returns the first non-loopback IPv4 address of this machine, used for
/// friend "join my world" invites (LAN play).
#[tauri::command]
fn get_local_ip() -> Option<String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    socket.local_addr().ok().map(|a| a.ip().to_string())
}

fn read_nbt_string(data: &[u8], pos: &mut usize) -> Option<String> {
    if *pos + 2 > data.len() { return None; }
    let len = u16::from_be_bytes([data[*pos], data[*pos + 1]]) as usize;
    *pos += 2;
    if *pos + len > data.len() { return None; }
    let s = String::from_utf8_lossy(&data[*pos..*pos + len]).to_string();
    *pos += len;
    Some(s)
}

fn find_level_name(level_dat_path: &std::path::Path) -> Option<String> {
    let file = std::fs::File::open(level_dat_path).ok()?;
    let mut decoder = GzDecoder::new(file);
    let mut bytes = Vec::new();
    decoder.read_to_end(&mut bytes).ok()?;

    let mut pos = 0usize;
    if bytes.get(pos).copied()? != 10 {
        return None;
    }
    pos += 1;
    let _root_name = read_nbt_string(&bytes, &mut pos)?;

    while pos < bytes.len() {
        let tag_id = bytes[pos];
        pos += 1;
        if tag_id == 0 {
            break;
        }
        let name = read_nbt_string(&bytes, &mut pos)?;
        match tag_id {
            8 => {
                let value = read_nbt_string(&bytes, &mut pos)?;
                if name == "LevelName" {
                    return Some(value);
                }
            }
            1 => pos += 1,
            2 => pos += 2,
            3 => pos += 4,
            4 => pos += 8,
            5 => pos += 4,
            6 => pos += 8,
            7 => {
                if pos + 4 > bytes.len() { return None; }
                let len = u32::from_be_bytes([bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]]) as usize;
                pos += 4 + len;
            }
            9 => {
                if pos >= bytes.len() { return None; }
                let child_type = bytes[pos];
                pos += 1;
                if pos + 4 > bytes.len() { return None; }
                let len = u32::from_be_bytes([bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]]) as usize;
                pos += 4;
                for _ in 0..len {
                    let _ = read_nbt_string(&bytes, &mut pos)?;
                    match child_type {
                        1 => pos += 1,
                        2 => pos += 2,
                        3 => pos += 4,
                        4 => pos += 8,
                        5 => pos += 4,
                        6 => pos += 8,
                        7 => {
                            if pos + 4 > bytes.len() { return None; }
                            let blen = u32::from_be_bytes([bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]]) as usize;
                            pos += 4 + blen;
                        }
                        8 => {
                            let _ = read_nbt_string(&bytes, &mut pos)?;
                        }
                        9 | 10 => {}
                        _ => return None,
                    }
                }
            }
            10 => {
                loop {
                    if pos >= bytes.len() { return None; }
                    if bytes[pos] == 0 {
                        pos += 1;
                        break;
                    }
                    let nested_type = bytes[pos];
                    pos += 1;
                    let nested_name = read_nbt_string(&bytes, &mut pos)?;
                    match nested_type {
                        1 => pos += 1,
                        2 => pos += 2,
                        3 => pos += 4,
                        4 => pos += 8,
                        5 => pos += 4,
                        6 => pos += 8,
                        7 => {
                            if pos + 4 > bytes.len() { return None; }
                            let blen = u32::from_be_bytes([bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]]) as usize;
                            pos += 4 + blen;
                        }
                        8 => {
                            let value = read_nbt_string(&bytes, &mut pos)?;
                            if nested_name == "LevelName" {
                                return Some(value);
                            }
                        }
                        9 | 10 => {}
                        _ => return None,
                    }
                }
            }
            _ => return None,
        }
    }

    None
}

#[tauri::command]
fn open_folder(app: tauri::AppHandle, instance_id: String) {
    let mut path = std::path::PathBuf::from(get_data_dir(&app));
    path.push("instances");
    path.push(&instance_id);

    // Create the 'minecraft' subfolder so it exists when the user opens the folder
    let mut mc_path = path.clone();
    mc_path.push("minecraft");
    let _ = std::fs::create_dir_all(&mc_path);

    if let Ok(abs_path) = std::fs::canonicalize(&path) {
        let path_str = abs_path.to_string_lossy().to_string();
        use tauri_plugin_opener::OpenerExt;
        let _ = app.opener().open_path(path_str, None::<&str>);
    }
}

#[tauri::command]
fn create_shortcut(app: tauri::AppHandle, instance_id: String) -> Result<String, String> {
    let mut instance_path = std::path::PathBuf::from(get_data_dir(&app));
    instance_path.push("instances");
    instance_path.push(&instance_id);
    let instance_path = std::fs::canonicalize(&instance_path).unwrap_or(instance_path);

    let desktop_dir = dirs::desktop_dir().ok_or_else(|| "Desktop directory not found".to_string())?;
    std::fs::create_dir_all(&desktop_dir).map_err(|e| e.to_string())?;

    let shortcut_path = desktop_dir.join(format!("Omega Launcher - {}.desktop", instance_id));
    let content = format!(
        "[Desktop Entry]\nType=Application\nName=Omega Launcher Instance {}\nExec=xdg-open \"{}\"\nTerminal=false\n",
        instance_id,
        instance_path.to_string_lossy()
    );
    std::fs::write(&shortcut_path, content).map_err(|e| e.to_string())?;
    Ok(shortcut_path.to_string_lossy().to_string())
}

#[tauri::command]
fn count_installed_mods(app: tauri::AppHandle, instance_id: String) -> Result<usize, String> {
    let mut path = std::path::PathBuf::from(get_data_dir(&app));
    path.push("instances");
    path.push(&instance_id);
    path.push("minecraft");
    path.push("mods");

    if !path.exists() {
        return Ok(0);
    }

    let entries = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    let count = entries
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| entry.file_type().ok())
        .filter(|file_type| file_type.is_file())
        .count();

    Ok(count)
}

#[tauri::command]
fn list_worlds(app: tauri::AppHandle, instance_id: String) -> Result<Vec<String>, String> {
    let mut path = std::path::PathBuf::from(get_data_dir(&app));
    path.push("instances");
    path.push(&instance_id);
    path.push("minecraft");
    path.push("saves");

    let entries = std::fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut worlds: Vec<String> = entries
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let file_type = entry.file_type().ok()?;
            if !file_type.is_dir() {
                return None;
            }
            let folder_name = entry.file_name().to_string_lossy().to_string();
            let level_dat = entry.path().join("level.dat");
            let display_name = find_level_name(&level_dat).unwrap_or(folder_name);
            if display_name.is_empty() { None } else { Some(display_name) }
        })
        .collect();

    worlds.sort();
    Ok(worlds)
}

#[tauri::command]
fn open_path(app: tauri::AppHandle, path: String) {
    let mut expanded_path = path.clone();

    // expand tilde
    if path.starts_with("~/") || path == "~" {
        if let Some(home) = dirs::home_dir() {
            if path == "~" {
                expanded_path = home.to_string_lossy().to_string();
            } else {
                expanded_path = format!("{}/{}", home.to_string_lossy(), &path[2..]);
            }
        }
    }

    use tauri_plugin_opener::OpenerExt;
    let _ = app.opener().open_path(expanded_path, None::<&str>);
}

#[tauri::command]
async fn translate_text(text: String, target_lang: String) -> Result<String, String> {
    if text.is_empty() {
        return Ok(String::new());
    }

    let url = format!(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={}&dt=t&q={}",
        target_lang,
        urlencoding::encode(&text)
    );

    let client = reqwest::Client::new();
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;

    if res.status().is_success() {
        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

        if let Some(sentences) = json.get(0).and_then(|v| v.as_array()) {
            let mut translated_full = String::new();
            for sentence in sentences {
                if let Some(translated_part) = sentence.get(0).and_then(|v| v.as_str()) {
                    translated_full.push_str(translated_part);
                }
            }
            if !translated_full.is_empty() {
                return Ok(translated_full);
            }
        }
    }

    Ok(text) // return original text if translation failed
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let conn = db::init(app.handle())?;
            app.manage(db::Db(std::sync::Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            find_system_java,
            app_exit,
            get_local_ip,
            launch::launch_minecraft,
            auth::login_microsoft,
            launch::kill_minecraft,
            download::download_mod,
            download::update_all_mods,
            auth::logout_microsoft,
            open_folder,
            create_shortcut,
            count_installed_mods,
            list_worlds,
            open_path,
            translate_text,
            imports::install_modpack,
            imports::export_modpack,
            imports::export_omega,
            imports::import_prism,
            imports::import_curseforge,
            imports::import_mrpack,
            db::db_load_instances,
            db::db_save_instances,
            db::db_delete_instance,
            db::db_load_accounts,
            db::db_save_accounts,
            db::db_record_installed_mod,
            db::db_list_installed_mods,
            db::db_save_icon,
            cache::cache_mod_icon,
            cache::get_cached_version_manifest,
            network::ping_server,
            network::db_load_servers,
            network::db_save_server,
            network::db_save_server_favicon,
            network::db_delete_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::Write;

    fn nbt_string(name: &str) -> Vec<u8> {
        let mut out = Vec::new();
        out.extend_from_slice(&(name.len() as u16).to_be_bytes());
        out.extend_from_slice(name.as_bytes());
        out
    }

    fn gz(data: &[u8]) -> Vec<u8> {
        let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
        encoder.write_all(data).unwrap();
        encoder.finish().unwrap()
    }

    fn write_temp(name: &str, data: &[u8]) -> std::path::PathBuf {
        let path = std::env::temp_dir().join(format!("omega_nbt_test_{name}_{}", std::process::id()));
        std::fs::write(&path, data).unwrap();
        path
    }

    #[test]
    fn parses_level_name_from_level_dat() {
        let mut nbt = Vec::new();
        nbt.push(10); // root compound
        nbt.extend_from_slice(&nbt_string(""));
        nbt.push(10); // nested "Data" compound
        nbt.extend_from_slice(&nbt_string("Data"));
        nbt.push(8); // "LevelName" string
        nbt.extend_from_slice(&nbt_string("LevelName"));
        nbt.extend_from_slice(&nbt_string("My World"));
        nbt.push(0); // end of Data
        nbt.push(0); // end of root
        let path = write_temp("level", &gz(&nbt));

        assert_eq!(find_level_name(&path).as_deref(), Some("My World"));
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn returns_none_for_garbage_file() {
        let path = write_temp("garbage", b"not an nbt file at all");
        assert_eq!(find_level_name(&path), None);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn read_nbt_string_handles_lengths() {
        let mut data = Vec::new();
        data.extend_from_slice(&3u16.to_be_bytes());
        data.extend_from_slice(b"abc");
        let mut pos = 0;
        assert_eq!(read_nbt_string(&data, &mut pos).as_deref(), Some("abc"));
        assert_eq!(pos, 5);
        assert_eq!(read_nbt_string(&[0, 4, 1, 2, 3], &mut 0), None);
    }
}
