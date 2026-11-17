use std::path::Path;
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct LaunchOptions {
    pub version: String,
    pub instance_id: String,
    pub username: String,
    pub ram_mb: u32,
    pub custom_jvm_args: Option<String>,
}

pub struct ActiveGame {
    pub pid: u32,
    pub child: std::process::Child,
}

fn rules_match(rules: Option<&Value>) -> bool {
    let Some(rules) = rules else { return true };
    let Some(arr) = rules.as_array() else { return true };
    let os_name = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "osx"
    } else {
        "linux"
    };
    let mut allowed = false;
    for rule in arr {
        let action = rule.get("action").and_then(|a| a.as_str()).unwrap_or("allow");
        if let Some(features) = rule.get("features").and_then(|f| f.as_object()) {
            if features.values().any(|v| v.as_bool() == Some(true)) {
                continue;
            }
        }
        let os_matches = match rule.get("os") {
            Some(os) => os.get("name").and_then(|n| n.as_str()).map(|n| n == os_name).unwrap_or(true),
            None => true,
        };
        if os_matches {
            match action {
                "allow" => allowed = true,
                "disallow" => allowed = false,
                _ => {}
            }
        }
    }
    allowed
}

fn expand_library_path(name: &str) -> String {
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() < 3 {
        return name.to_string();
    }
    let (group, artifact, version) = (parts[0], parts[1], parts[2]);
    let classifier = if parts.len() > 3 && !parts[3].is_empty() && !parts[3].contains('@') {
        Some(parts[3])
    } else {
        None
    };
    let ext = if parts.iter().any(|p| p.starts_with('@')) { "pom" } else { "jar" };
    let mut path = format!("{}/{}/{}/{}-{}.{}", group.replace('.', "/"), artifact, version, artifact, version, ext);
    if let Some(classifier) = classifier {
        path = path.replace(&format!("-{}.jar", version), &format!("-{}-{}.jar", version, classifier));
    }
    path
}

fn resolve_offline_auth(name: &str) -> (String, String) {
    use md5::{Digest, Md5};
    let digest = Md5::digest(format!("OfflinePlayer:{name}"));
    let mut b: [u8; 16] = digest.into();
    b[6] = (b[6] & 0x0f) | 0x30;
    b[8] = (b[8] & 0x3f) | 0x80;
    let uuid = uuid::Uuid::from_bytes(b).to_string();
    ("0".to_string(), uuid)
}

pub async fn launch_game(
    data_dir: &Path,
    opts: LaunchOptions,
    on_log: Option<&(dyn Fn(&str) + Send + Sync)>,
) -> Result<ActiveGame, String> {
    let vanilla_version: String = opts.version
        .split('-')
        .next()
        .unwrap_or(&opts.version)
        .to_string();

    if let Some(cb) = on_log {
        cb(&format!("[launcher/INFO] Preparing to launch Minecraft {} for {}", vanilla_version, opts.username));
    }

    let java_path = crate::java::ensure_java(&vanilla_version, data_dir, on_log).await?;

    // Check loader in instances table or mods
    let mut loader_type = if opts.version.contains('-') {
        opts.version.split('-').nth(1).unwrap_or("").to_lowercase()
    } else {
        String::new()
    };

    if loader_type.is_empty() {
        if let Ok(conn) = rusqlite::Connection::open(data_dir.join("omega.db")) {
            let row: Result<String, _> = conn.query_row(
                "SELECT loader FROM instances WHERE id = ?1",
                [&opts.instance_id],
                |r| r.get(0),
            );
            if let Ok(l) = row {
                let l_lower = l.to_lowercase();
                if l_lower != "vanilla" && !l_lower.is_empty() {
                    loader_type = l_lower;
                }
            }
        }
    }

    let client = reqwest::Client::new();
    let final_version = if !loader_type.is_empty() && loader_type != "vanilla" {
        if loader_type == "fabric" {
            crate::installer::install_fabric(&client, &vanilla_version, data_dir, on_log).await?
        } else {
            vanilla_version.clone()
        }
    } else {
        crate::installer::ensure_vanilla(&client, &vanilla_version, data_dir, on_log).await?;
        vanilla_version.clone()
    };

    let game_dir = data_dir.join("instances").join(&opts.instance_id).join("minecraft");
    let _ = std::fs::create_dir_all(&game_dir);

    let profile_path = data_dir.join("versions").join(&final_version).join(format!("{final_version}.json"));
    let profile_text = std::fs::read_to_string(&profile_path).map_err(|e| format!("Version profile not found: {e}"))?;
    let profile: Value = serde_json::from_str(&profile_text).map_err(|e| e.to_string())?;

    let main_class = profile.get("mainClass").and_then(|m| m.as_str()).unwrap_or("net.minecraft.client.main.Main");

    let libraries_dir = data_dir.join("libraries");
    let mut classpath_entries = Vec::new();

    if let Some(libs) = profile.get("libraries").and_then(|l| l.as_array()) {
        for lib in libs {
            if !rules_match(lib.get("rules")) {
                continue;
            }
            let name = lib.get("name").and_then(|n| n.as_str()).unwrap_or("");
            if name.is_empty() { continue; }
            let rel_path = lib
                .pointer("/downloads/artifact/path")
                .and_then(|p| p.as_str())
                .map(|p| p.to_string())
                .unwrap_or_else(|| expand_library_path(name));
            let lib_file = libraries_dir.join(&rel_path);
            if lib_file.exists() {
                classpath_entries.push(lib_file.to_string_lossy().to_string());
            }
        }
    }

    // Add main client jar
    let client_jar = data_dir.join("versions").join(&vanilla_version).join(format!("{vanilla_version}.jar"));
    if client_jar.exists() {
        classpath_entries.push(client_jar.to_string_lossy().to_string());
    }

    let cp_sep = if cfg!(target_os = "windows") { ";" } else { ":" };
    let full_classpath = classpath_entries.join(cp_sep);

    let (token, uuid) = resolve_offline_auth(&opts.username);

    let mut cmd = std::process::Command::new(java_path);
    cmd.current_dir(&game_dir);

    // RAM flags
    cmd.arg(format!("-Xmx{}M", opts.ram_mb));
    cmd.arg(format!("-Xms{}M", opts.ram_mb.min(1024)));

    // Custom JVM arguments (e.g. GC flags)
    if let Some(custom) = &opts.custom_jvm_args {
        for arg in custom.split_whitespace() {
            cmd.arg(arg);
        }
    } else {
        cmd.arg("-XX:+UseG1GC");
    }

    // Classpath
    cmd.arg("-cp").arg(full_classpath);
    cmd.arg(main_class);

    // Minecraft Game Arguments
    cmd.arg("--username").arg(&opts.username);
    cmd.arg("--version").arg(&final_version);
    cmd.arg("--gameDir").arg(game_dir.to_string_lossy().to_string());
    cmd.arg("--assetsDir").arg(data_dir.join("assets").to_string_lossy().to_string());
    cmd.arg("--assetIndex").arg(profile.pointer("/assetIndex/id").and_then(|i| i.as_str()).unwrap_or(&vanilla_version));
    cmd.arg("--uuid").arg(&uuid);
    cmd.arg("--accessToken").arg(&token);
    cmd.arg("--userType").arg("legacy");

    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    if let Some(cb) = on_log {
        cb(&format!("[launcher/INFO] Spawning Minecraft process ({final_version})..."));
    }

    let child = cmd.spawn().map_err(|e| format!("Failed to spawn Minecraft: {e}"))?;
    let pid = child.id();

    if let Some(cb) = on_log {
        cb(&format!("[launcher/INFO] Minecraft process spawned successfully (PID: {pid})"));
    }

    Ok(ActiveGame { pid, child })
}
