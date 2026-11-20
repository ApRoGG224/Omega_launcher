use std::path::{Path, PathBuf};
use serde_json::Value;
use futures_util::stream::{self, StreamExt, TryStreamExt};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use crate::util::{download_file, extract_zip, get_json};

#[derive(Debug, Clone)]
pub struct LaunchOptions {
    pub version: String,
    pub instance_id: String,
    pub username: String,
    pub ram_mb: u32,
    pub custom_jvm_args: Option<String>,
    pub quick_play_server: Option<String>,
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

fn expand_library_path_native(name: &str, classifier: &str) -> String {
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() < 3 {
        return name.to_string();
    }
    let (group, artifact, version) = (parts[0], parts[1], parts[2]);
    format!(
        "{}/{}/{}/{}-{}-{}.jar",
        group.replace('.', "/"),
        artifact,
        version,
        artifact,
        version,
        classifier
    )
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

async fn collect_libraries(
    client: &reqwest::Client,
    version_name: &str,
    root: &Path,
    libraries_dir: &Path,
    natives_dir: &Path,
    on_log: Option<&(dyn Fn(&str) + Send + Sync)>,
) -> Result<Vec<String>, String> {
    let mut libraries: Vec<String> = Vec::new();
    let mut visited = std::collections::HashSet::new();
    let mut seen_keys = std::collections::HashSet::new();
    let mut current = version_name.to_string();

    loop {
        if !visited.insert(current.clone()) {
            break;
        }
        let json_path = root.join("versions").join(&current).join(format!("{current}.json"));
        if !json_path.exists() {
            break;
        }
        let json: Value = serde_json::from_str(
            &std::fs::read_to_string(&json_path).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;

        if let Some(list) = json.get("libraries").and_then(|l| l.as_array()) {
            for lib in list {
                if lib.is_string() {
                    let name = lib.as_str().unwrap().to_string();
                    let parts: Vec<&str> = name.split(':').collect();
                    let group = parts.first().unwrap_or(&"");
                    let artifact = parts.get(1).unwrap_or(&"");
                    let classifier = if parts.len() > 3 { parts[3] } else { "" };
                    let key = format!("{group}:{artifact}:{classifier}");
                    if !seen_keys.insert(key) {
                        continue;
                    }

                    let path = expand_library_path(&name);
                    let file = libraries_dir.join(&path);
                    if !file.exists() {
                        let url = format!("https://libraries.minecraft.net/{path}");
                        let _ = download_file(client, &url, &file, on_log).await;
                    }
                    if file.exists() {
                        libraries.push(file.to_string_lossy().to_string());
                    }
                    continue;
                }

                let Some(name) = lib.get("name").and_then(|n| n.as_str()) else { continue };
                if !rules_match(lib.get("rules")) {
                    continue;
                }
                let parts: Vec<&str> = name.split(':').collect();
                let group = parts.first().unwrap_or(&"");
                let artifact = parts.get(1).unwrap_or(&"");
                let classifier = if parts.len() > 3 { parts[3] } else { "" };
                let key = format!("{group}:{artifact}:{classifier}");
                if !seen_keys.insert(key) {
                    continue;
                }

                let is_native = lib.get("natives").is_some();

                let path = lib
                    .pointer("/downloads/artifact/path")
                    .and_then(|p| p.as_str())
                    .map(|p| p.to_string())
                    .unwrap_or_else(|| expand_library_path(name));
                let file = libraries_dir.join(&path);
                if !file.exists() {
                    let url = if let Some(artifact_url) = lib
                        .pointer("/downloads/artifact/url")
                        .and_then(|u| u.as_str())
                    {
                        artifact_url.to_string()
                    } else if let Some(maven_url) = lib.get("url").and_then(|u| u.as_str()) {
                        let base = maven_url.trim_end_matches('/');
                        format!("{base}/{path}")
                    } else {
                        format!("https://libraries.minecraft.net/{path}")
                    };
                    if let Err(e) = download_file(client, &url, &file, on_log).await {
                        if let Some(cb) = on_log {
                            cb(&format!("[launcher/WARN] Failed to download library {name}: {e}"));
                        }
                    }
                }
                if file.exists() && !is_native {
                    libraries.push(file.to_string_lossy().to_string());
                }

                let native_os = if cfg!(target_os = "windows") {
                    "windows"
                } else if cfg!(target_os = "macos") {
                    "osx"
                } else {
                    "linux"
                };
                let classifier_key = lib
                    .get("natives")
                    .and_then(|n| n.get(native_os))
                    .and_then(|n| n.as_str())
                    .map(|s| s.to_string());
                if let Some(classifier_key) = classifier_key {
                    if let Some(native_file) = lib
                        .pointer("/downloads/classifiers/")
                        .and_then(|c| c.get(&classifier_key))
                    {
                        let native_path = native_file
                            .get("path")
                            .and_then(|p| p.as_str())
                            .unwrap_or("");
                        let native_path = if native_path.is_empty() {
                            expand_library_path_native(name, &classifier_key)
                        } else {
                            native_path.to_string()
                        };
                        let native_jar = libraries_dir.join(&native_path);
                        if !native_jar.exists() {
                            let url = native_file
                                .get("url")
                                .and_then(|u| u.as_str())
                                .map(|s| s.to_string())
                                .or_else(|| {
                                    lib.get("url").and_then(|u| u.as_str()).map(|maven_url| {
                                        let base = maven_url.trim_end_matches('/');
                                        format!("{base}/{native_path}")
                                    })
                                })
                                .unwrap_or_else(|| {
                                    format!("https://libraries.minecraft.net/{native_path}")
                                });
                            let _ = download_file(client, &url, &native_jar, on_log).await;
                        }
                        if native_jar.exists() {
                            let _ = extract_zip(&native_jar, natives_dir);
                        }
                    }
                }
            }
        }

        current = match json.get("inheritsFrom").and_then(|i| i.as_str()) {
            Some(parent) => parent.to_string(),
            None => break,
        };
    }
    Ok(libraries)
}

fn collect_profile_arguments(
    root: &Path,
    version_name: &str,
) -> Result<(Vec<String>, Vec<String>), String> {
    let mut profiles = Vec::new();
    let mut visited = std::collections::HashSet::new();
    let mut current = version_name.to_string();

    loop {
        if !visited.insert(current.clone()) {
            break;
        }
        let json_path = root.join("versions").join(&current).join(format!("{current}.json"));
        if !json_path.exists() {
            break;
        }
        let json: Value = serde_json::from_str(
            &std::fs::read_to_string(&json_path).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        current = json
            .get("inheritsFrom")
            .and_then(|value| value.as_str())
            .map(str::to_string)
            .unwrap_or_default();
        profiles.push(json);
        if current.is_empty() {
            break;
        }
    }

    profiles.reverse();
    let mut jvm_args = Vec::new();
    let mut game_args = Vec::new();

    for profile in profiles {
        if let Some(args) = profile
            .get("arguments")
            .and_then(|arguments| arguments.get("jvm"))
            .and_then(|jvm| jvm.as_array())
        {
            let mut skip_classpath_value = false;
            for arg in args {
                if let Some(value) = arg.as_str() {
                    if skip_classpath_value {
                        skip_classpath_value = false;
                        continue;
                    }
                    if value == "-cp" || value == "-classpath" {
                        skip_classpath_value = true;
                        continue;
                    }
                    if !value.starts_with("-Djava.library.path") {
                        jvm_args.push(value.to_string());
                    }
                } else if rules_match(arg.get("rules")) {
                    if let Some(value) = arg.get("value") {
                        let values: Vec<String> = value
                            .as_array()
                            .map(|array| {
                                array
                                    .iter()
                                    .filter_map(|item| item.as_str().map(str::to_string))
                                    .collect()
                            })
                            .or_else(|| value.as_str().map(|item| vec![item.to_string()]))
                            .unwrap_or_default();
                        jvm_args.extend(values);
                    }
                }
            }
        }

        if let Some(args) = profile
            .get("arguments")
            .and_then(|arguments| arguments.get("game"))
            .and_then(|game| game.as_array())
        {
            for arg in args {
                if let Some(value) = arg.as_str() {
                    game_args.push(value.to_string());
                } else if rules_match(arg.get("rules")) {
                    if let Some(value) = arg.get("value") {
                        let values: Vec<String> = value
                            .as_array()
                            .map(|array| {
                                array
                                    .iter()
                                    .filter_map(|item| item.as_str().map(str::to_string))
                                    .collect()
                            })
                            .or_else(|| value.as_str().map(|item| vec![item.to_string()]))
                            .unwrap_or_default();
                        game_args.extend(values);
                    }
                }
            }
        } else if let Some(legacy) = profile.get("minecraftArguments").and_then(|value| value.as_str()) {
            game_args.extend(legacy.split_whitespace().map(str::to_string));
        }
    }

    Ok((jvm_args, game_args))
}

async fn ensure_assets(
    client: &reqwest::Client,
    root: &Path,
    asset_index_id: &str,
    asset_index_url: Option<&str>,
    on_log: Option<&(dyn Fn(&str) + Send + Sync)>,
) -> Result<(), String> {
    let index_path = root.join("assets").join("indexes").join(format!("{asset_index_id}.json"));
    let objects: Value = if index_path.exists() {
        serde_json::from_str(&std::fs::read_to_string(&index_path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?
    } else {
        let url = asset_index_url.ok_or_else(|| {
            format!("Version profile has no downloadable asset index URL for {asset_index_id}")
        })?;
        let v: Value = get_json(client, url).await.map_err(|error| {
            format!("Failed to download asset index {asset_index_id} from {url}: {error}")
        })?;
        if let Some(parent) = index_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&index_path, serde_json::to_string(&v).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
        v
    };

    let objects = objects.get("objects").and_then(|o| o.as_object()).cloned().unwrap_or_default();
    let total = objects.len();
    if total == 0 {
        return Ok(());
    }

    let mut to_download: Vec<(String, PathBuf)> = Vec::new();
    let mut already_cached = 0usize;

    for (_, obj) in objects {
        let Some(hash) = obj.get("hash").and_then(|h| h.as_str()) else { continue };
        let rel_path = format!("objects/{}/{hash}", &hash[..2]);
        let dest = root.join("assets").join(&rel_path);
        if dest.exists() {
            already_cached += 1;
        } else {
            let url = format!("https://resources.download.minecraft.net/{}/{hash}", &hash[..2]);
            to_download.push((url, dest));
        }
    }

    if to_download.is_empty() {
        if let Some(cb) = on_log {
            cb(&format!("[launcher/INFO] All {total} assets verified on disk"));
        }
        return Ok(());
    }

    let need_count = to_download.len();
    if let Some(cb) = on_log {
        cb(&format!("[launcher/INFO] Downloading {need_count} missing assets in parallel (cached: {already_cached}/{total})..."));
    }

    const ASSET_CONCURRENCY: usize = 20;
    let completed = Arc::new(AtomicUsize::new(0));

    let stream = stream::iter(to_download.into_iter().map(|(url, dest)| {
        let client = client.clone();
        let completed = completed.clone();
        async move {
            download_file(&client, &url, &dest, None).await?;
            completed.fetch_add(1, Ordering::Relaxed);
            Ok::<(), String>(())
        }
    })).buffer_unordered(ASSET_CONCURRENCY);

    stream.try_collect::<Vec<()>>().await?;
    if let Some(cb) = on_log {
        cb(&format!("[launcher/INFO] Completed downloading {need_count} assets"));
    }
    Ok(())
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

    // 1. Authenticate (Cached Microsoft account or Offline UUID)
    let mut auth_access_token = String::new();
    let mut auth_uuid = String::new();
    if let Some(cached) = crate::auth::read_cached_auth(data_dir) {
        let cached_name = cached.get("name").and_then(|v| v.as_str()).unwrap_or("");
        if cached_name == opts.username {
            auth_access_token = cached.get("access_token").and_then(|v| v.as_str()).unwrap_or("").to_string();
            auth_uuid = cached.get("uuid").and_then(|v| v.as_str()).unwrap_or("").to_string();
            if let Some(cb) = on_log {
                cb(&format!("[launcher/INFO] Using cached Microsoft Auth for {}", opts.username));
            }
        }
    }
    let user_type = if auth_access_token.is_empty() {
        if let Some(cb) = on_log {
            cb(&format!("[launcher/INFO] Using Offline Auth for {}", opts.username));
        }
        let (tok, uid) = resolve_offline_auth(&opts.username);
        auth_access_token = tok;
        auth_uuid = uid;
        "legacy"
    } else {
        "msa"
    };

    // 2. Ensure JRE
    let java_path = crate::java::ensure_java(&vanilla_version, data_dir, on_log).await?;

    // 3. Resolve Modloader
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
    let libraries_dir = data_dir.join("libraries");
    let natives_dir = data_dir
        .join("versions")
        .join(&final_version)
        .join(format!("{final_version}-natives-{}", if cfg!(target_os = "windows") { "windows" } else if cfg!(target_os = "macos") { "osx" } else { "linux" }));

    std::fs::create_dir_all(&game_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&libraries_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&natives_dir).map_err(|e| e.to_string())?;

    let profile_path = data_dir.join("versions").join(&final_version).join(format!("{final_version}.json"));
    let profile_text = std::fs::read_to_string(&profile_path).map_err(|e| format!("Version profile not found: {e}"))?;
    let profile: Value = serde_json::from_str(&profile_text).map_err(|e| e.to_string())?;

    // 4. Resolve Client Jar (download if missing)
    let client_jar = if let Some(parent) = profile.get("inheritsFrom").and_then(|i| i.as_str()) {
        let parent_jar = data_dir.join("versions").join(parent).join(format!("{parent}.jar"));
        if parent_jar.exists() {
            parent_jar
        } else {
            data_dir.join("versions").join(&final_version).join(format!("{final_version}.jar"))
        }
    } else {
        data_dir.join("versions").join(&final_version).join(format!("{final_version}.jar"))
    };

    if !client_jar.exists() {
        let base_profile = profile.clone();
        let base = if profile.get("downloads").is_none() {
            profile
                .get("inheritsFrom")
                .and_then(|i| i.as_str())
                .and_then(|parent| {
                    std::fs::read_to_string(data_dir.join("versions").join(parent).join(format!("{parent}.json"))).ok()
                })
                .and_then(|text| serde_json::from_str::<Value>(&text).ok())
                .unwrap_or(base_profile)
        } else {
            base_profile
        };
        if let Some(url) = base.pointer("/downloads/client/url").and_then(|u| u.as_str()) {
            if let Some(cb) = on_log {
                cb(&format!("[launcher/INFO] Downloading client jar for {final_version}..."));
            }
            download_file(&client, url, &client_jar, on_log).await?;
        }
    }

    // 5. Collect Libraries and Natives
    let libraries = collect_libraries(&client, &final_version, data_dir, &libraries_dir, &natives_dir, on_log).await?;

    // 6. Ensure Assets
    let asset_index_id = profile
        .get("assetIndex")
        .and_then(|a| a.get("id"))
        .and_then(|i| i.as_str())
        .unwrap_or(&vanilla_version);
    let asset_index_url = profile
        .get("assetIndex")
        .and_then(|a| a.get("url"))
        .and_then(|u| u.as_str());

    ensure_assets(&client, data_dir, asset_index_id, asset_index_url, on_log).await?;

    // 7. Collect JVM and Game Arguments
    let (profile_jvm_args, profile_game_args) = collect_profile_arguments(data_dir, &final_version)?;

    let mut classpath_entries = libraries;
    if client_jar.exists() {
        classpath_entries.push(client_jar.to_string_lossy().to_string());
    }
    let cp_sep = if cfg!(target_os = "windows") { ";" } else { ":" };
    let full_classpath = classpath_entries.join(cp_sep);

    let main_class = profile.get("mainClass").and_then(|m| m.as_str()).unwrap_or("net.minecraft.client.main.Main");

    // 8. Build Process Command
    let mut cmd = std::process::Command::new(java_path);
    cmd.current_dir(&game_dir);

    // RAM flags
    cmd.arg(format!("-Xmx{}M", opts.ram_mb));
    cmd.arg(format!("-Xms{}M", opts.ram_mb.min(1024)));

    // Natives path
    cmd.arg(format!("-Djava.library.path={}", natives_dir.to_string_lossy()));

    // Profile JVM Arguments
    for arg in profile_jvm_args {
        let expanded = arg
            .replace("${natives_directory}", &natives_dir.to_string_lossy())
            .replace("${launcher_name}", "OmegaLauncher")
            .replace("${launcher_version}", "2.0")
            .replace("${classpath}", &full_classpath);
        cmd.arg(expanded);
    }

    // Custom JVM arguments (e.g. GC flags)
    if let Some(custom) = &opts.custom_jvm_args {
        for arg in custom.split_whitespace() {
            cmd.arg(arg);
        }
    } else {
        cmd.arg("-XX:+UseG1GC");
    }

    // Classpath & Main Class
    cmd.arg("-cp").arg(full_classpath);
    cmd.arg(main_class);

    // Profile Game Arguments or Defaults
    if !profile_game_args.is_empty() {
        for arg in profile_game_args {
            let expanded = arg
                .replace("${auth_player_name}", &opts.username)
                .replace("${version_name}", &final_version)
                .replace("${game_directory}", &game_dir.to_string_lossy())
                .replace("${assets_root}", &data_dir.join("assets").to_string_lossy())
                .replace("${assets_index_name}", asset_index_id)
                .replace("${auth_uuid}", &auth_uuid)
                .replace("${auth_access_token}", &auth_access_token)
                .replace("${user_type}", user_type)
                .replace("${version_type}", "release");
            cmd.arg(expanded);
        }
    } else {
        cmd.arg("--username").arg(&opts.username);
        cmd.arg("--version").arg(&final_version);
        cmd.arg("--gameDir").arg(game_dir.to_string_lossy().to_string());
        cmd.arg("--assetsDir").arg(data_dir.join("assets").to_string_lossy().to_string());
        cmd.arg("--assetIndex").arg(asset_index_id);
        cmd.arg("--uuid").arg(&auth_uuid);
        cmd.arg("--accessToken").arg(&auth_access_token);
        cmd.arg("--userType").arg(user_type);
    }

    // Quick Play Multiplayer Direct Connect
    if let Some(server) = &opts.quick_play_server {
        cmd.arg("--quickPlayMultiplayer").arg(server);
    }

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
