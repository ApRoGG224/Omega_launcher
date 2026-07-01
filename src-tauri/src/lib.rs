use std::io::{BufRead, BufReader};
use tauri::{AppHandle, Emitter};

#[tauri::command]
async fn login_microsoft() -> Result<String, String> {
    let output = std::process::Command::new("npx")
        .arg("tsx")
        .arg("../sidecar/auth.ts")
        .output()
        .map_err(|e| e.to_string())?;
        
    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.to_string())
}

#[tauri::command]
fn launch_minecraft(app: AppHandle, version: String, server: String, username: String, ram: u32) {
    println!("Launching Minecraft version {} on server {} with username {} via TS Sidecar...", version, server, username);

    let mut child = std::process::Command::new("npx")
        .arg("tsx")
        .arg("../sidecar/launcher.ts")
        .arg(&version)
        .arg(&server)
        .arg(&username)
        .arg(ram.to_string())
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
    
    // Helper function to kill a process by reading its PID file
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![launch_minecraft, login_microsoft, kill_minecraft])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
