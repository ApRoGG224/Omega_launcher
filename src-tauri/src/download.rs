use std::collections::HashSet;
use std::path::Path;

use tauri::AppHandle;

use crate::util::{app_data_dir, download_file, emit_line, get_json};

#[derive(serde::Deserialize)]
struct ModrinthVersion {
    id: String,
    game_versions: Vec<String>,
    loaders: Vec<String>,
    files: Vec<ModrinthFile>,
    dependencies: Vec<ModrinthDependency>,
}

#[derive(serde::Deserialize, Clone)]
struct ModrinthFile {
    url: String,
    filename: String,
    primary: Option<bool>,
}

#[derive(serde::Deserialize, Clone)]
struct ModrinthDependency {
    dependency_type: Option<String>,
    project_id: Option<String>,
}

fn pick_file(version: &ModrinthVersion) -> Option<ModrinthFile> {
    version
        .files
        .iter()
        .find(|f| f.primary.unwrap_or(false))
        .or_else(|| version.files.first())
        .cloned()
}

async fn fetch_versions(client: &reqwest::Client, project_id: &str) -> Result<Vec<ModrinthVersion>, String> {
    get_json(client, &format!("https://api.modrinth.com/v2/project/{project_id}/version")).await
}

async fn download_dependency_tree(
    app: &AppHandle,
    client: &reqwest::Client,
    root_project: &str,
    root_deps: &[ModrinthDependency],
    mc_version: &str,
    loader: &str,
    mods_dir: &Path,
) -> Result<(), String> {
    use futures_util::future::join_all;
    use futures_util::stream::{self, StreamExt, TryStreamExt};

    let mut downloaded: HashSet<String> = std::iter::once(root_project.to_string()).collect();
    let mut current_wave: Vec<ModrinthDependency> = root_deps.to_vec();

    while !current_wave.is_empty() {
        // 1. Filter out dependencies that are not required or already handled
        let mut wave_projects: Vec<String> = Vec::new();
        for dep in current_wave.drain(..) {
            let Some(project_id) = dep.project_id else { continue };
            if dep.dependency_type.as_deref() != Some("required") || downloaded.contains(&project_id) {
                continue;
            }
            downloaded.insert(project_id.clone());
            wave_projects.push(project_id);
        }

        if wave_projects.is_empty() {
            break;
        }

        // 2. Fetch version manifests in parallel
        let fetch_futures = wave_projects.iter().map(|pid| {
            let pid = pid.clone();
            async move {
                let res = fetch_versions(client, &pid).await;
                (pid, res)
            }
        });
        let fetched = join_all(fetch_futures).await;

        let mut to_download: Vec<(String, String, std::path::PathBuf)> = Vec::new();
        let mut next_wave: Vec<ModrinthDependency> = Vec::new();

        for (pid, versions_res) in fetched {
            let versions = match versions_res {
                Ok(v) => v,
                Err(_) => continue,
            };
            let Some(valid) = versions
                .iter()
                .find(|v| v.game_versions.contains(&mc_version.into()) && v.loaders.contains(&loader.into()))
            else {
                emit_line(
                    app,
                    &format!("[DOWNLOADER] Skipping dependency {pid}: no compatible version found"),
                );
                continue;
            };
            let Some(file) = pick_file(valid) else { continue };
            let dest = mods_dir.join(&file.filename);
            if !dest.exists() {
                to_download.push((pid, file.url.clone(), dest));
            }
            for nested in &valid.dependencies {
                next_wave.push(nested.clone());
            }
        }

        // 3. Download all files in this wave concurrently (up to 8 in parallel)
        if !to_download.is_empty() {
            let download_stream = stream::iter(to_download.into_iter().map(|(pid, url, dest)| {
                let app = app.clone();
                let client = client.clone();
                async move {
                    let filename = dest.file_name().and_then(|n| n.to_str()).unwrap_or("file");
                    emit_line(
                        &app,
                        &format!("[DOWNLOADER] Downloading required dependency {pid} -> {filename}"),
                    );
                    download_file(&app, &client, &url, &dest).await
                }
            })).buffer_unordered(8);

            download_stream.try_collect::<Vec<()>>().await?;
        }

        current_wave = next_wave;
    }
    Ok(())
}

type UpdateRecord = (String, Option<String>, String);

fn read_instance_for_update(db: &crate::db::Db, instance_id: &str) -> Result<(String, String, Vec<UpdateRecord>), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let (mc_version, loader): (String, String) = conn
        .query_row(
            "SELECT mc_version, loader FROM instances WHERE id = ?1",
            rusqlite::params![instance_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| "Instance not found in database".to_string())?;
    let mut stmt = conn
        .prepare("SELECT mod_id, version, filename FROM installed_mods WHERE instance_id = ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![instance_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?, row.get::<_, String>(2)?))
        })
        .map_err(|e| e.to_string())?;
    let mut records = Vec::new();
    for row in rows {
        records.push(row.map_err(|e| e.to_string())?);
    }
    Ok((mc_version, loader, records))
}

#[tauri::command]
pub async fn update_all_mods(
    app: AppHandle,
    db: tauri::State<'_, crate::db::Db>,
    instance_id: String,
) -> Result<u32, String> {
    let data_dir = app_data_dir(&app);
    let instance_dir = crate::validate::instance_minecraft_dir(&data_dir, &instance_id)?;
    let mods_dir = instance_dir.join("mods");
    if !mods_dir.is_dir() {
        return Ok(0);
    }

    let (mc_version, loader, records) = read_instance_for_update(&db, &instance_id)?;

    let client = reqwest::Client::new();
    let mut updated: u32 = 0;
    let total = records.len();
    for (i, (mod_id, current_version, filename)) in records.iter().enumerate() {
        emit_line(
            &app,
            &format!("[UPDATER] Checking {}/{}: {mod_id}", i + 1, total),
        );
        let versions = match fetch_versions(&client, mod_id).await {
            Ok(v) => v,
            Err(_) => continue,
        };
        let Some(latest) = versions.iter().find(|v| {
            v.game_versions.contains(&mc_version)
                && (v.loaders.contains(&loader) || v.loaders.contains(&loader.to_lowercase()))
        }) else {
            continue;
        };
        if Some(&latest.id) == current_version.as_ref() && !latest.id.is_empty() {
            continue;
        }
        let Some(file) = pick_file(latest) else { continue };
        let dest = mods_dir.join(&file.filename);
        if dest.exists() {
            continue;
        }
        emit_line(&app, &format!("[UPDATER] Updating {mod_id} -> {}", file.filename));
        if let Err(e) = download_file(&app, &client, &file.url, &dest).await {
            emit_line(&app, &format!("[UPDATER] Failed {mod_id}: {e}"));
            continue;
        }
        let _ = std::fs::remove_file(mods_dir.join(filename));
        let _ = crate::db::record_installed_mod_impl(
            &db,
            &instance_id,
            mod_id,
            Some(latest.id.clone()),
            &file.filename,
        );
        updated += 1;
    }
    emit_line(&app, &format!("[UPDATER] Done: {updated} mods updated"));
    Ok(updated)
}

#[tauri::command]
pub async fn download_mod(
    app: AppHandle,
    db: tauri::State<'_, crate::db::Db>,
    mod_id: String,
    mc_version: String,
    loader: String,
    instance_id: String,
    project_type: Option<String>,
    world_name: Option<String>,
) -> Result<String, String> {
    let data_dir = app_data_dir(&app);
    let instance_dir = crate::validate::instance_minecraft_dir(&data_dir, &instance_id)?;
    let p_type = project_type.unwrap_or_else(|| "mod".to_string());
    let loader = loader.to_lowercase();

    let client = reqwest::Client::new();
    emit_line(&app, &format!("[DOWNLOADER] Fetching versions for mod {mod_id}..."));
    let versions = fetch_versions(&client, &mod_id).await?;

    let valid = versions
        .iter()
        .find(|v| {
            v.game_versions.contains(&mc_version)
                && (p_type == "resourcepack" || p_type == "shader" || v.loaders.contains(&loader))
        })
        .ok_or_else(|| format!("Не найдено подходящей версии мода для {mc_version} ({loader})"))?;

    let file = pick_file(valid).ok_or("Mod has no downloadable files")?;

    let dest_dir = if p_type == "resourcepack" {
        instance_dir.join("resourcepacks")
    } else if p_type == "shader" {
        instance_dir.join("shaderpacks")
    } else if p_type == "datapack" {
        let world = world_name.as_deref().unwrap_or("");
        let world = crate::validate::validate_world_name(world)?;
        instance_dir.join("saves").join(world).join("datapacks")
    } else {
        instance_dir.join("mods")
    };
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let dest = dest_dir.join(&file.filename);
    if dest.exists() {
        return Err("ALREADY_EXISTS".to_string());
    }

    emit_line(&app, &format!("[DOWNLOADER] Downloading {}...", file.filename));
    download_file(&app, &client, &file.url, &dest).await?;

    if p_type == "mod" {
        let _ = crate::db::record_installed_mod_impl(
            &db,
            &instance_id,
            &mod_id,
            Some(valid.id.clone()),
            &file.filename,
        );
        download_dependency_tree(
            &app,
            &client,
            &mod_id,
            &valid.dependencies,
            &mc_version,
            &loader,
            &dest_dir,
        )
        .await?;
    } else if p_type == "shader" && loader == "fabric" {
        let iris_versions = fetch_versions(&client, "iris").await.unwrap_or_default();
        let iris_valid = iris_versions
            .iter()
            .find(|v| v.game_versions.contains(&mc_version) && v.loaders.contains(&"fabric".to_string()));
        if let Some(iris) = iris_valid {
            if let Some(iris_file) = pick_file(iris) {
                let mods_dir = instance_dir.join("mods");
                std::fs::create_dir_all(&mods_dir).map_err(|e| e.to_string())?;
                let iris_dest = mods_dir.join(&iris_file.filename);
                if !iris_dest.exists() {
                    emit_line(&app, "[DOWNLOADER] Downloading Iris for Fabric shaders...");
                    download_file(&app, &client, &iris_file.url, &iris_dest).await?;
                }
                download_dependency_tree(
                    &app,
                    &client,
                    "iris",
                    &iris.dependencies,
                    &mc_version,
                    "fabric",
                    &mods_dir,
                )
                .await?;
            }
        } else {
            emit_line(&app, &format!("[DOWNLOADER] Iris not found for {mc_version}, skipping automatic install"));
        }
    }

    emit_line(&app, &format!("[SUCCESS] Mod saved to {}", dest.display()));
    Ok(dest.to_string_lossy().to_string())
}