use base64::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftInsideSkinItem {
    pub nickname: String,
    pub skin_url: String,
    pub render_url: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MinecraftInsidePage {
    pub skins: Vec<MinecraftInsideSkinItem>,
    pub current_page: u32,
    pub total_pages: u32,
    pub has_prev: bool,
    pub has_next: bool,
}

#[tauri::command]
pub async fn fetch_minecraft_inside_skins(
    page: u32,
    query: Option<String>,
) -> Result<MinecraftInsidePage, String> {
    let p = if page == 0 { 1 } else { page };
    let clean_query = query.unwrap_or_default().trim().to_string();

    let target_url = if !clean_query.is_empty() {
        let encoded_q = urlencoding::encode(&clean_query);
        format!("https://minecraft-inside.ru/skins/nick/page/{p}/?q={encoded_q}")
    } else {
        format!("https://minecraft-inside.ru/skins/nick/page/{p}/")
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| format!("HTTP client initialization failed: {e}"))?;

    let res = client
        .get(&target_url)
        .send()
        .await
        .map_err(|e| format!("Network request to minecraft-inside failed: {e}"))?;

    if !res.status().is_success() {
        return Err(format!("Minecraft-Inside returned HTTP {}", res.status()));
    }

    let html = res
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {e}"))?;

    let mut skins = Vec::new();
    let skin_blocks = html.split("<div class=\"box box_grass post skin\"");

    for block in skin_blocks.skip(1) {
        let nickname = extract_attribute(block, "data-nick=\"")
            .or_else(|| extract_between(block, "<h2 class=\"box__title\"><a href=\"/skins/nick/", ".html\">"));

        let Some(nick) = nickname else { continue };
        let nick = nick.trim().to_string();
        if nick.is_empty() {
            continue;
        }

        let mut skin_url = extract_attribute(block, "data-image=\"")
            .unwrap_or_else(|| format!("/uploads/nick/{nick}.png"));
        if !skin_url.starts_with("http://") && !skin_url.starts_with("https://") {
            skin_url = format!("https://minecraft-inside.ru{skin_url}");
        }

        let mut render_url = extract_img_src(block)
            .unwrap_or_else(|| format!("/uploads/nick/3d/{nick}.png"));
        if !render_url.starts_with("http://") && !render_url.starts_with("https://") {
            render_url = format!("https://minecraft-inside.ru{render_url}");
        }

        skins.push(MinecraftInsideSkinItem {
            nickname: nick,
            skin_url,
            render_url,
        });
    }

    // Parse pagination
    let mut total_pages = p;

    if let Some(last_str) = extract_between(&html, "<li class=\"last\">", "</li>") {
        if let Some(page_str) = extract_between(&last_str, "page/", "/") {
            if let Ok(num) = page_str.parse::<u32>() {
                total_pages = total_pages.max(num);
            }
        }
    }

    // Also scan all data-page occurrences to find maximum page
    for chunk in html.split("data-page=\"").skip(1) {
        if let Some(end) = chunk.find('\"') {
            if let Ok(num) = chunk[..end].parse::<u32>() {
                // data-page is 0-indexed (e.g. data-page="0" for page 1)
                total_pages = total_pages.max(num + 1);
            }
        }
    }

    if total_pages < p {
        total_pages = p;
    }

    Ok(MinecraftInsidePage {
        skins,
        current_page: p,
        total_pages,
        has_prev: p > 1,
        has_next: p < total_pages,
    })
}

#[tauri::command]
pub async fn fetch_skin_as_data_url(url: String) -> Result<String, String> {
    let trimmed = url.trim();
    if trimmed.starts_with("data:") {
        return Ok(trimmed.to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")
        .build()
        .map_err(|e| format!("HTTP client initialization failed: {e}"))?;

    let res = client
        .get(trimmed)
        .send()
        .await
        .map_err(|e| format!("Failed to download skin image: {e}"))?;

    if !res.status().is_success() {
        return Err(format!("Download failed with status: HTTP {}", res.status()));
    }

    let bytes = res
        .bytes()
        .await
        .map_err(|e| format!("Failed to read image bytes: {e}"))?;

    let b64 = BASE64_STANDARD.encode(&bytes);
    Ok(format!("data:image/png;base64,{b64}"))
}

fn extract_attribute(source: &str, prefix: &str) -> Option<String> {
    let start = source.find(prefix)? + prefix.len();
    let rest = &source[start..];
    let end = rest.find('\"')?;
    Some(rest[..end].to_string())
}

fn extract_between(source: &str, start_tag: &str, end_tag: &str) -> Option<String> {
    let start = source.find(start_tag)? + start_tag.len();
    let rest = &source[start..];
    let end = rest.find(end_tag)?;
    Some(rest[..end].to_string())
}

fn extract_img_src(source: &str) -> Option<String> {
    let img_pos = source.find("<img")?;
    let img_slice = &source[img_pos..];
    let src_pos = img_slice.find("src=\"")? + 5;
    let rest = &img_slice[src_pos..];
    let end = rest.find('\"')?;
    Some(rest[..end].to_string())
}
