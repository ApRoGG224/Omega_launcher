use std::io::{BufRead, BufReader};
use tauri::{AppHandle, Emitter, Manager};

fn get_data_dir(app: &AppHandle) -> String {
    let mut path = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    path.push("minecraft_data");
    let _ = std::fs::create_dir_all(&path);
    path.to_string_lossy().to_string()
}

#[tauri::command]
async fn login_microsoft(app: AppHandle) -> Result<String, String> {
    use std::process::Stdio;
    use std::sync::{Arc, Mutex};

    let client_id = "00000000402b5328";
    let redirect_uri = "https://login.live.com/oauth20_desktop.srf";
    let auth_url = format!(
        "https://login.live.com/oauth20_authorize.srf?client_id={}&response_type=code&redirect_uri={}&scope=XboxLive.signin%20offline_access&prompt=select_account",
        client_id,
        urlencoding::encode(redirect_uri)
    );

    let code: Arc<Mutex<Option<String>>> = Arc::new(Mutex::new(None));
    let code_clone = code.clone();

    let auth_window = tauri::WebviewWindowBuilder::new(
        &app,
        "ms_auth",
        tauri::WebviewUrl::External(auth_url.parse().unwrap()),
    )
    .title("Microsoft Login")
    .inner_size(500.0, 650.0)
    .center()
    .on_navigation(move |url| {
        let url_str = url.as_str();
        if url_str.starts_with(redirect_uri) {
            if let Some(query) = url.query() {
                let params: Vec<&str> = query.split('&').collect();
                for param in params {
                    if let Some(c) = param.strip_prefix("code=") {
                        let mut lock = code_clone.lock().unwrap();
                        *lock = Some(c.to_string());
                        return false;
                    }
                }
            }
            return false;
        }
        true
    })
    .build()
    .map_err(|e| e.to_string())?;

    let closed: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
    let closed_clone = closed.clone();
    auth_window.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            let mut lock = closed_clone.lock().unwrap();
            *lock = true;
        }
    });

    let auth_window_clone = auth_window.clone();
    loop {
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;

        let got_code = {
            let lock = code.lock().unwrap();
            lock.clone()
        };

        if let Some(auth_code) = got_code {
            let _ = auth_window_clone.close();

            let output = std::process::Command::new("npx")
                .arg("tsx")
                .arg("../sidecar/auth.ts")
                .arg(&auth_code)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output()
                .map_err(|e| e.to_string())?;

            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            for line in stdout.lines() {
                if line.starts_with("SUCCESS:") || line.starts_with("ERROR:") {
                    return Ok(line.to_string());
                }
            }

            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(format!("Auth failed: {}", stderr));
        }

        let is_closed = {
            let lock = closed.lock().unwrap();
            *lock
        };
        if is_closed {
            return Err("Auth window closed by user".to_string());
        }
    }
}

#[tauri::command]
fn launch_minecraft(app: AppHandle, version: String, server: String, username: String, ram: u32, instance_id: String) {
    let data_dir = get_data_dir(&app);
    println!("Launching Minecraft version {} on server {} with username {} via TS Sidecar in {}...", version, server, username, data_dir);

    let mut child = std::process::Command::new("npx")
        .arg("tsx")
        .arg("../sidecar/launcher.ts")
        .arg(&version)
        .arg(&server)
        .arg(&username)
        .arg(ram.to_string())
        .arg(&instance_id)
        .arg(&data_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .expect("Failed to launch sidecar");

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    
    let app_clone1 = app.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_clone1.emit("download-progress", line);
            }
        }
    });

    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app.emit("download-progress", format!("[ERROR] {}", line));
            }
        }
    });
}

#[tauri::command]
fn kill_minecraft() {
    println!("Attempting to kill Minecraft and launcher tasks...");
    
    let kill_from_file = |filepath: &str| {
        if let Ok(pid_str) = std::fs::read_to_string(filepath) {
            let pid = pid_str.trim();
            if !pid.is_empty() {
                println!("Killing PID from {}: {}", filepath, pid);
                #[cfg(target_os = "windows")]
                let _ = std::process::Command::new("taskkill").arg("/F").arg("/PID").arg(pid).status();
                
                #[cfg(not(target_os = "windows"))]
                let _ = std::process::Command::new("kill").arg("-9").arg(pid).status();
                
                let _ = std::fs::remove_file(filepath);
            }
        }
    };

    kill_from_file("../sidecar/mc_pid.txt");
    kill_from_file("mc_pid.txt");
    kill_from_file("../sidecar/node_pid.txt");
    kill_from_file("node_pid.txt");
}

#[tauri::command]
async fn download_mod(app: tauri::AppHandle, mod_id: String, mc_version: String, loader: String, instance_id: String, project_type: Option<String>) -> Result<String, String> {
    let p_type = project_type.unwrap_or_else(|| "mod".to_string());
    let data_dir = get_data_dir(&app);
    let output = std::process::Command::new("npx")
        .arg("tsx")
        .arg("../sidecar/download.ts")
        .arg(&mod_id)
        .arg(&mc_version)
        .arg(&loader)
        .arg(&instance_id)
        .arg(&data_dir)
        .arg(&p_type)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
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
    
    // Using MyMemory API instead of Google APIs
    let url = format!(
        "https://api.mymemory.translated.net/get?q={}&langpair=en|{}",
        urlencoding::encode(&text),
        target_lang
    );
    
    let client = reqwest::Client::new();
    let res = client.get(&url).send().await.map_err(|e| e.to_string())?;
    
    if res.status().is_success() {
        let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
        
        if let Some(response_data) = json.get("responseData") {
            if let Some(translated_text) = response_data.get("translatedText").and_then(|v| v.as_str()) {
                // MyMemory sometimes returns "MYMEMORY WARNING:" when limits are hit
                if !translated_text.contains("MYMEMORY WARNING:") {
                    return Ok(translated_text.to_string());
                }
            }
        }
    }
    
    Ok(text) // return original text if translation failed
}

#[tauri::command]
async fn install_modpack(app: tauri::AppHandle, mod_id: String, mc_version: String, loader: String, instance_id: String) -> Result<String, String> {
    let data_dir = get_data_dir(&app);
    let mut child = std::process::Command::new("npx")
        .arg("tsx")
        .arg("../sidecar/install_modpack.ts")
        .arg(&mod_id)
        .arg(&mc_version)
        .arg(&loader)
        .arg(&instance_id)
        .arg(&data_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    
    let app_clone = app.clone();
    std::thread::spawn(move || {
        use std::io::BufRead;
        let reader = std::io::BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_clone.emit("download-progress", line);
            }
        }
    });

    std::thread::spawn(move || {
        use std::io::BufRead;
        let reader = std::io::BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app.emit("download-progress", format!("[ERROR] {}", line));
            }
        }
    });

    // We don't wait for it to finish blocking the UI, but Tauri commands are async so we can wait.
    let status = child.wait().map_err(|e| e.to_string())?;
    if status.success() {
        Ok("Success".to_string())
    } else {
        Err("Failed to install modpack".to_string())
    }
}

#[tauri::command]
async fn export_modpack(app: tauri::AppHandle, instance_id: String, instance_name: String) -> Result<String, String> {
    let data_dir = get_data_dir(&app);
    let mut child = std::process::Command::new("npx")
        .arg("tsx")
        .arg("../sidecar/export_modpack.ts")
        .arg(&instance_id)
        .arg(&data_dir)
        .arg(&instance_name)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    
    let app_clone = app.clone();
    std::thread::spawn(move || {
        use std::io::BufRead;
        let reader = std::io::BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app_clone.emit("download-progress", line);
            }
        }
    });

    std::thread::spawn(move || {
        use std::io::BufRead;
        let reader = std::io::BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app.emit("download-progress", format!("[ERROR] {}", line));
            }
        }
    });

    let status = child.wait().map_err(|e| e.to_string())?;
    if status.success() {
        Ok("Success".to_string())
    } else {
        Err("Failed to export modpack".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            launch_minecraft, login_microsoft, kill_minecraft, download_mod, open_folder, open_path, translate_text, install_modpack, export_modpack
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
