use std::path::Path;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use crate::util::{download_file, get_json};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModrinthItem {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub author: String,
    pub downloads: u64,
    pub icon_url: Option<String>,
    pub categories: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ModrinthSearchResponse {
    pub hits: Vec<ModrinthHit>,
    pub total_hits: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ModrinthHit {
    pub project_id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub author: String,
    pub downloads: u64,
    pub icon_url: Option<String>,
    pub categories: Option<Vec<String>>,
}

pub async fn search_modrinth(
    query: &str,
    project_type: &str,
    loader: Option<&str>,
    limit: u32,
    offset: u32,
) -> Result<Vec<ModrinthItem>, String> {
    let client = reqwest::Client::new();
    let mut facets = vec![format!("[\"project_type:{project_type}\"]")];

    if let Some(l) = loader {
        if !l.is_empty() {
            facets.push(format!("[\"categories:{}\"]", l.to_lowercase()));
        }
    }

    let raw_facets = format!("[{}]", facets.join(","));
    let facets_encoded = urlencoding::encode(&raw_facets);
    let query_encoded = urlencoding::encode(query);

    let url = format!(
        "https://api.modrinth.com/v2/search?query={query_encoded}&facets={facets_encoded}&limit={limit}&offset={offset}"
    );

    let res: ModrinthSearchResponse = get_json(&client, &url).await?;

    let items = res
        .hits
        .into_iter()
        .map(|hit| ModrinthItem {
            id: hit.project_id,
            slug: hit.slug,
            title: hit.title,
            description: hit.description,
            author: hit.author,
            downloads: hit.downloads,
            icon_url: hit.icon_url,
            categories: hit.categories.unwrap_or_default(),
        })
        .collect();

    Ok(items)
}

pub async fn download_modrinth_version(
    project_id: &str,
    mc_version: &str,
    loader: &str,
    dest_dir: &Path,
    on_log: Option<&(dyn Fn(&str) + Send + Sync)>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://api.modrinth.com/v2/project/{project_id}/version?game_versions=[\"{mc_version}\"]&loaders=[\"{}\"]",
        loader.to_lowercase()
    );

    let versions: Value = get_json(&client, &url).await?;
    let primary_file = versions
        .as_array()
        .and_then(|arr| arr.first())
        .and_then(|v| v.get("files"))
        .and_then(|files| files.as_array())
        .and_then(|arr| arr.iter().find(|f| f.get("primary").and_then(|p| p.as_bool()).unwrap_or(false)).or_else(|| arr.first()))
        .ok_or_else(|| format!("No compatible file found for {project_id} on {mc_version} {loader}"))?;

    let download_url = primary_file.get("url").and_then(|u| u.as_str()).ok_or("No file download url")?;
    let filename = primary_file.get("filename").and_then(|f| f.as_str()).unwrap_or("mod.jar");

    let dest = dest_dir.join(filename);
    if let Some(cb) = on_log {
        cb(&format!("[modrinth/INFO] Downloading {filename}..."));
    }

    download_file(&client, download_url, &dest, on_log).await?;
    Ok(filename.to_string())
}
