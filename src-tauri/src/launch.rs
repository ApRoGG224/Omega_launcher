use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

use serde_json::Value;
use tauri::{AppHandle, Emitter};

use crate::util::{app_data_dir, download_file, emit_line, get_json, extract_zip};

struct LaunchConfig {
    version_name: String,
    game_dir: PathBuf,
    libraries_dir: PathBuf,
    natives_dir: PathBuf,
    assets_root: PathBuf,
    main_class: String,
    jvm_args: Vec<String>,
    game_args: Vec<String>,
    asset_index_id: String,
    auth_access_token: String,
    auth_uuid: String,
    auth_name: String,
    client_token: String,
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
        // Launcher features (demo mode, custom resolution, quick play) are
        // never enabled by Omega Launcher, so feature-gated rules never match.
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
    let (group, artifact, version) = (parts[0], parts[1], parts[2]);
    let classifier = if parts.len() > 3 && !parts[3].is_empty() && !parts[3].contains('@') { Some(parts[3]) } else { None };
    let ext = if parts.iter().any(|p| p.starts_with('@')) { "pom" } else { "jar" };
    let mut path = format!("{}/{}/{}/{}-{}.{}", group.replace('.', "/"), artifact, version, artifact, version, ext);
    if let Some(classifier) = classifier {
        path = path.replace(&format!("-{}.jar", version), &format!("-{}-{}.jar", version, classifier));
    }
    path
}

/// Collects libraries from the version json chain by following `inheritsFrom`.
async fn collect_libraries(
    app: &AppHandle,
    client: &reqwest::Client,
    version_name: &str,
    root: &Path,
    libraries_dir: &Path,
    natives_dir: &Path,
) -> Result<Vec<String>, String> {
    let mut libraries: Vec<String> = Vec::new();
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

        if let Some(list) = json.get("libraries").and_then(|l| l.as_array()) {
            for lib in list {
                if lib.is_string() {
                    let name = lib.as_str().unwrap().to_string();
                    let path = expand_library_path(&name);
                    let file = libraries_dir.join(&path);
                    if !file.exists() {
                        let url = format!("https://libraries.minecraft.net/{path}");
                        download_file(app, client, &url, &file).await?;
                    }
                    libraries.push(file.to_string_lossy().to_string());
                    continue;
                }
                let Some(name) = lib.get("name").and_then(|n| n.as_str()) else { continue };
                if !rules_match(lib.get("rules")) {
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
                    let url = lib
                        .pointer("/downloads/artifact/url")
                        .and_then(|u| u.as_str())
                        .map(|u| u.to_string())
                        .unwrap_or_else(|| format!("https://libraries.minecraft.net/{path}"));
                    let _ = download_file(app, client, &url, &file).await;
                }
                if !is_native {
                    libraries.push(file.to_string_lossy().to_string());
                }

                // Natives: extract the classifiers jar matching this OS.
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
                                .unwrap_or_else(|| format!("https://libraries.minecraft.net/{native_path}"));
                            let _ = download_file(app, client, &url, &native_jar).await;
                        }
                        if native_jar.exists() {
                            extract_zip(&native_jar, natives_dir)?;
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

fn expand_library_path_native(name: &str, classifier: &str) -> String {
    let parts: Vec<&str> = name.split(':').collect();
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

/// Collects JVM and game arguments from the complete version profile chain.
/// Loader profiles usually inherit the vanilla profile's resource arguments
/// (`--assets`, `--assetIndex`, `--gameDir`, etc.) instead of copying them.
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

    // Parent arguments must be present before loader-specific arguments.
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
                        // The launcher supplies its own complete classpath below.
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
    app: &AppHandle,
    client: &reqwest::Client,
    root: &Path,
    asset_index_id: &str,
    asset_index_url: Option<&str>,
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
        std::fs::create_dir_all(index_path.parent().unwrap()).map_err(|e| e.to_string())?;
        std::fs::write(&index_path, serde_json::to_string(&v).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
        v
    };

    let objects = objects.get("objects").and_then(|o| o.as_object()).cloned().unwrap_or_default();
    let total = objects.len();
    if total == 0 {
        return Ok(());
    }
    let mut done = 0usize;
    for (_, obj) in objects {
        let Some(hash) = obj.get("hash").and_then(|h| h.as_str()) else { continue };
        let rel_path = format!("objects/{}/{hash}", &hash[..2]);
        let dest = root.join("assets").join(&rel_path);
        if dest.exists() {
            done += 1;
            continue;
        }
        let url = format!("https://resources.download.minecraft.net/{}/{hash}", &hash[..2]);
        download_file(app, client, &url, &dest).await?;
        done += 1;
        if done % 200 == 0 {
            emit_line(app, &format!("[launcher/INFO] Assets downloaded: {done}/{total}"));
        }
    }
    Ok(())
}

/// Injects the Forge/NeoForge JVM arguments from modern profiles (see old launcher.ts fix).
fn inject_custom_jvm_args(app: &AppHandle, json: &Value, config: &mut LaunchConfig, libraries_dir: &Path) {
    if let Some(args) = json.get("arguments").and_then(|a| a.get("jvm")).and_then(|j| j.as_array()) {
        let mut extra: Vec<String> = Vec::new();
        for arg in args {
            if let Some(s) = arg.as_str() {
                let replaced = s
                    .replace("${library_directory}", &libraries_dir.to_string_lossy())
                    .replace("${version_name}", &config.version_name)
                    .replace("${classpath_separator}", if cfg!(target_os = "windows") { ";" } else { ":" });
                extra.push(replaced);
            }
        }
        if !extra.is_empty() {
            let count = extra.len();
            config.jvm_args.extend(extra);
            emit_line(app, &format!("[launcher/INFO] Injected {count} custom JVM arguments from profile!"));
        }
    }
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

#[tauri::command]
pub async fn launch_minecraft(
    app: AppHandle,
    version: String,
    server: String,
    username: String,
    ram: u32,
    instance_id: String,
) -> Result<String, String> {
    let data_dir = app_data_dir(&app);
    let vanilla_version: String = version
        .split('-')
        .next()
        .unwrap_or(&version)
        .to_string();

    emit_line(&app, &format!("[launcher/INFO] Launching Minecraft {} for user {}...", vanilla_version, username));

    // Resolve auth: cached Microsoft token matching the username, else offline.
    let auth_name = username.clone();
    let mut auth_uuid = String::new();
    let mut auth_access_token = String::new();
    let mut client_token = uuid::Uuid::new_v4().to_string();
    if let Some(json) = crate::auth::read_cached_auth(&app) {
        let cached_name = json.get("name").and_then(|v| v.as_str()).unwrap_or("");
        if cached_name == username {
            // Auto-refresh the token when it expired (Этап 4.2).
            match crate::auth::try_refresh_cached_token(&app).await {
                Ok(true) => emit_line(&app, "[launcher/INFO] Microsoft token refreshed automatically"),
                Ok(false) => {}
                Err(e) => emit_line(&app, &format!("[launcher/INFO] Token refresh failed: {e}")),
            }
            let fresh = crate::auth::read_cached_auth(&app).unwrap_or(json);
            auth_access_token = fresh.get("access_token").and_then(|v| v.as_str()).unwrap_or("").to_string();
            auth_uuid = fresh.get("uuid").and_then(|v| v.as_str()).unwrap_or("").to_string();
            if let Some(ct) = fresh.get("client_token").and_then(|v| v.as_str()) {
                client_token = ct.to_string();
            }
        }
    }
    let user_type = if auth_access_token.is_empty() { "legacy" } else { "msa" };
    if auth_access_token.is_empty() {
        emit_line(&app, &format!("[launcher/INFO] Using Offline Auth for {username}"));
        let (token, uuid) = resolve_offline_auth(&username);
        auth_access_token = token;
        auth_uuid = uuid;
    } else {
        emit_line(&app, &format!("[launcher/INFO] Using cached Microsoft Auth for {username}"));
    }

    // Java runtime.
    let java_path = crate::java::ensure_java(&app, &vanilla_version, &data_dir)?;

    // Loader install for versions like "1.21.1-fabric".
    let mut final_version = vanilla_version.clone();
    let client = reqwest::Client::new();
    if version.contains('-') {
        let loader = version.split('-').nth(1).unwrap_or("").to_string();
        final_version = crate::installer::install_loader(&app, &vanilla_version, &loader, &data_dir, &java_path).await?;
    } else {
        crate::installer::prepare_vanilla_root(&app, &vanilla_version, &data_dir).await?;
    }

    // Working directory: the instance's isolated .minecraft.
    let game_dir = data_dir.join("instances").join(&instance_id).join("minecraft");
    let libraries_dir = data_dir.join("libraries");
    let natives_dir = data_dir
        .join("versions")
        .join(&final_version)
        .join(format!("{final_version}-natives-{}", if cfg!(target_os = "windows") { "windows" } else if cfg!(target_os = "macos") { "osx" } else { "linux" }));
    let assets_root = data_dir.join("assets");
    let client_jar = data_dir.join("versions").join(&final_version).join(format!("{final_version}.jar"));

    // Load profile chain.
    let profile_path = data_dir.join("versions").join(&final_version).join(format!("{final_version}.json"));
    let profile_text = std::fs::read_to_string(&profile_path).map_err(|e| format!("Version {final_version} is not installed: {e}"))?;
    let profile: Value = serde_json::from_str(&profile_text).map_err(|e| e.to_string())?;

    let mut asset_index_url = profile
        .get("assetIndex")
        .and_then(|a| a.get("url"))
        .and_then(|u| u.as_str())
        .map(str::to_string);
    if asset_index_url.is_none() {
        if let Some(sha1) = profile
            .get("assetIndex")
            .and_then(|a| a.get("sha1"))
            .and_then(|s| s.as_str())
        {
            asset_index_url = Some(format!(
                "https://piston-meta.mojang.com/v1/packages/{sha1}/{}.json",
                profile
                    .get("assetIndex")
                    .and_then(|a| a.get("id"))
                    .and_then(|i| i.as_str())
                    .unwrap_or("assets")
            ));
        }
    }
    let mut asset_index_id = profile
        .get("assetIndex")
        .and_then(|a| a.get("id"))
        .and_then(|i| i.as_str())
        .unwrap_or("")
        .to_string();

    // Loader profiles often inherit the asset index from the vanilla profile.
    // Never fall back to "legacy": that endpoint does not exist for modern
    // Minecraft versions.
    if asset_index_id.is_empty() {
        if let Some(parent) = profile.get("inheritsFrom").and_then(|i| i.as_str()) {
            let parent_path = data_dir
                .join("versions")
                .join(parent)
                .join(format!("{parent}.json"));
            if let Ok(parent_text) = std::fs::read_to_string(parent_path) {
                if let Ok(parent_profile) = serde_json::from_str::<Value>(&parent_text) {
                    asset_index_id = parent_profile
                        .get("assetIndex")
                        .and_then(|a| a.get("id"))
                        .and_then(|i| i.as_str())
                        .unwrap_or("")
                        .to_string();
                    if asset_index_url.is_none() {
                        asset_index_url = parent_profile
                            .get("assetIndex")
                            .and_then(|a| a.get("url"))
                            .and_then(|u| u.as_str())
                            .map(str::to_string);
                    }
                    if asset_index_url.is_none() {
                        if let Some(sha1) = parent_profile
                            .get("assetIndex")
                            .and_then(|a| a.get("sha1"))
                            .and_then(|s| s.as_str())
                        {
                            asset_index_url = Some(format!(
                                "https://piston-meta.mojang.com/v1/packages/{sha1}/{asset_index_id}.json"
                            ));
                        }
                    }
                }
            }
        }
    }

    let main_class = profile
        .get("mainClass")
        .and_then(|m| m.as_str())
        .unwrap_or("net.minecraft.client.main.Main")
        .to_string();

    // Client jar from the base (vanilla) profile.
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
        let url = base
            .pointer("/downloads/client/url")
            .and_then(|u| u.as_str())
            .ok_or("Version json has no client download url")?;
        download_file(&app, &client, url, &client_jar).await?;
    }

    std::fs::create_dir_all(&natives_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&game_dir).map_err(|e| e.to_string())?;

    let libraries = collect_libraries(&app, &client, &final_version, &data_dir, &libraries_dir, &natives_dir).await?;
    if asset_index_id.is_empty() {
        return Err("Version profile has no asset index; cannot start Minecraft with resources".to_string());
    } else {
        ensure_assets(
            &app,
            &client,
            &data_dir,
            &asset_index_id,
            asset_index_url.as_deref(),
        )
        .await?;
    }

    let (jvm_args, game_args) = collect_profile_arguments(&data_dir, &final_version)?;

    // Collect arguments from vanilla first, then apply loader-specific values.
    let mut config = LaunchConfig {
        version_name: final_version.clone(),
        game_dir: game_dir.clone(),
        libraries_dir,
        natives_dir: natives_dir.clone(),
        assets_root: assets_root.clone(),
        main_class,
        jvm_args,
        game_args,
        asset_index_id,
        auth_access_token,
        auth_uuid,
        auth_name,
        client_token,
    };
    let lib_dir_clone = config.libraries_dir.clone();
    inject_custom_jvm_args(&app, &profile, &mut config, &lib_dir_clone);

    let classpath_sep = if cfg!(target_os = "windows") { ";" } else { ":" };
    let mut classpath_parts = libraries.clone();
    classpath_parts.push(client_jar.to_string_lossy().to_string());
    let classpath = classpath_parts.join(classpath_sep);

    let arg_replace = |arg: &str, config: &LaunchConfig| -> String {
        arg.replace("${auth_player_name}", &config.auth_name)
            .replace("${version_name}", &config.version_name)
            .replace("${game_directory}", &config.game_dir.to_string_lossy())
            .replace("${natives_directory}", &config.natives_dir.to_string_lossy())
            .replace("${assets_root}", &config.assets_root.to_string_lossy())
            .replace("${assets_index_name}", &config.asset_index_id)
            .replace("${auth_uuid}", &config.auth_uuid)
            .replace("${auth_access_token}", &config.auth_access_token)
            .replace("${auth_session}", &config.auth_access_token)
            .replace("${auth_xuid}", "0")
            .replace("${user_type}", &user_type)
            .replace("${user_properties}", "{}")
            .replace("${clientid}", &config.client_token)
            .replace("${launcher_name}", "Omega Launcher")
            .replace("${launcher_version}", "1.0.0")
            .replace("${version_type}", "release")
    };

    let ram_g = if ram == 0 { 4 } else { ram };
    let mut command = std::process::Command::new(&java_path);
    command
        .current_dir(&game_dir)
        .arg(format!("-Xmx{ram_g}G"))
        .arg("-Xms1G")
        .arg(format!("-Djava.library.path={}", config.natives_dir.to_string_lossy()))
        .arg("-Dminecraft.launcher.brand=Omega Launcher")
        .arg("-Dminecraft.launcher.version=1.0.0");

    // LWJGL uses native libraries. Java 25 warns about this unless native
    // access is explicitly granted to classpath code.
    command.arg("--enable-native-access=ALL-UNNAMED");
    if crate::java::required_java_version(&vanilla_version) >= 24 {
        // LWJGL 3.4.1 still uses sun.misc.Unsafe on Java 24+.
        command.arg("--sun-misc-unsafe-memory-access=allow");
    }

    let resolved_jvm: Vec<String> = config.jvm_args.iter().map(|a| arg_replace(a, &config)).collect();
    command
        .args(&resolved_jvm)
        .arg("-cp")
        .arg(&classpath)
        .arg(&config.main_class);

    let mut resolved_game: Vec<String> = config.game_args.iter().map(|a| arg_replace(a, &config)).collect();
    if !server.trim().is_empty() {
        let parts: Vec<&str> = server.split(':').collect();
        resolved_game.push("--server".to_string());
        resolved_game.push(parts[0].to_string());
        resolved_game.push("--port".to_string());
        resolved_game.push(parts.get(1).map(|p| p.to_string()).unwrap_or_else(|| "25565".to_string()));
    }
    command.args(&resolved_game);

    emit_line(&app, &format!("[launcher/INFO] Spawning Minecraft in {}", game_dir.display()));

    let child = command
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to launch Minecraft: {e}"))?;

    let pid = child.id();
    let pid_file = data_dir.join(format!("mc_{}.pid", crate::validate::sanitize_id(&instance_id)));
    std::fs::write(&pid_file, pid.to_string()).map_err(|e| e.to_string())?;
    emit_line(&app, &format!("[launcher/INFO] Minecraft process spawned with PID: {pid}"));

    let stdout = child.stdout.expect("stdout piped");
    let stderr = child.stderr.expect("stderr piped");
    let app1 = app.clone();
    let pid_file_exit = pid_file.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app1.emit("download-progress", line);
            }
        }
        // stdout EOF means the game process exited: tell the frontend so the
        // Play button resets, and clean up the stale pid file.
        let _ = app1.emit("download-progress", "[launcher/INFO] Minecraft process exited");
        let _ = std::fs::remove_file(&pid_file_exit);
    });
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(line) = line {
                let _ = app.emit("download-progress", format!("[ERROR] {}", line));
            }
        }
    });

    Ok("Launched".to_string())
}

#[tauri::command]
pub fn kill_minecraft(app: AppHandle, instance_id: String) -> Result<String, String> {
    emit_line(&app, "[main/INFO]: Killing Minecraft process...");
    let data_dir = app_data_dir(&app);
    let pid_file = data_dir.join(format!("mc_{}.pid", crate::validate::sanitize_id(&instance_id)));

    let mut killed = false;
    if let Ok(pid_str) = std::fs::read_to_string(&pid_file) {
        let pid = pid_str.trim();
        if !pid.is_empty() {
            let status = if cfg!(target_os = "windows") {
                std::process::Command::new("taskkill").arg("/F").arg("/PID").arg(pid).arg("/T").status()
            } else {
                std::process::Command::new("kill").arg("-9").arg(pid).status()
            };
            if status.map(|s| s.success()).unwrap_or(false) {
                killed = true;
            }
        }
    }

    // Fallback: kill any remaining Java processes started by this launcher (matching the java runtime dir).
    if !killed {
        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(output) = std::process::Command::new("pgrep").args(["-f", "minecraft-data/runtime"]).output() {
                for line in String::from_utf8_lossy(&output.stdout).lines() {
                    let _ = std::process::Command::new("kill").arg("-9").arg(line).status();
                }
            }
        }
    }

    let _ = std::fs::remove_file(&pid_file);
    emit_line(&app, "[main/INFO]: Minecraft process killed");
    Ok("Minecraft stop requested".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn plain_rules_match() {
        assert!(rules_match(None));
        assert!(rules_match(Some(&json!([{ "action": "allow" }]))));
    }

    #[test]
    fn feature_gated_rules_never_match() {
        let rules = json!([
            { "action": "allow", "features": { "is_quick_play_singleplayer": true } },
            { "action": "allow", "features": { "is_demo_user": true } },
            { "action": "allow", "features": { "has_custom_resolution": true } },
        ]);
        assert!(!rules_match(Some(&rules)));
    }

    #[test]
    fn os_disallow_rule_blocks_on_matching_os() {
        let rules = json!([
            { "action": "allow" },
            { "action": "disallow", "os": { "name": "windows" } },
        ]);
        // A rule that does not match its OS does not participate.
        assert!(!rules_match(Some(&json!([{ "action": "disallow", "os": { "name": "windows" } }]))), "single unmatched disallow allows nothing");
        if cfg!(target_os = "windows") {
            assert!(!rules_match(Some(&rules)));
        } else {
            assert!(rules_match(Some(&rules)));
        }
    }

    #[test]
    fn quickplay_args_from_modern_profiles_are_skipped() {
        let args = json!([
            { "rules": [{ "action": "allow", "features": { "is_demo_user": true } }], "value": "--demo" },
            { "rules": [{ "action": "allow", "features": { "has_quick_plays_support": true } }], "value": ["--quickPlayPath", "${quickPlayPath}"] },
            { "rules": [{ "action": "allow", "features": { "is_quick_play_singleplayer": true } }], "value": ["--quickPlaySingleplayer", "${quickPlaySingleplayer}"] },
            { "rules": [{ "action": "allow", "features": { "is_quick_play_multiplayer": true } }], "value": ["--quickPlayMultiplayer", "${quickPlayMultiplayer}"] },
            { "rules": [{ "action": "allow", "features": { "is_quick_play_realms": true } }], "value": ["--quickPlayRealms", "${quickPlayRealms}"] },
        ]);
        for arg in args.as_array().unwrap() {
            assert!(!rules_match(arg.get("rules")), "feature-gated rule must never match");
        }
    }
}
