use std::path::{Path, PathBuf};

// Prevent directory traversal attacks by constraining instance identifiers to safe characters.
pub fn validate_instance_id(id: &str) -> Result<&str, String> {
    if id.is_empty() {
        return Err("Instance id must not be empty".to_string());
    }
    if id.len() > 64 {
        return Err("Instance id is too long".to_string());
    }
    if id == "." || id == ".." {
        return Err("Invalid instance id".to_string());
    }
    if !id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(format!("Invalid instance id '{id}'"));
    }
    Ok(id)
}

pub fn instance_minecraft_dir(data_dir: &Path, id: &str) -> Result<PathBuf, String> {
    let id = validate_instance_id(id)?;
    let root = data_dir.join("instances");
    let instance = root.join(id);
    if !instance.starts_with(&root) {
        return Err("Invalid instance path".to_string());
    }
    Ok(instance.join("minecraft"))
}

pub fn expand_user_path(path: &str) -> PathBuf {
    let mut expanded = path.to_string();
    if path.starts_with("~/") || path == "~" {
        if let Some(home) = dirs::home_dir() {
            if path == "~" {
                expanded = home.to_string_lossy().to_string();
            } else {
                expanded = format!("{}/{}", home.to_string_lossy(), &path[2..]);
            }
        }
    }
    PathBuf::from(expanded)
}

pub fn sanitize_id(id: &str) -> String {
    let cleaned: String = id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    if cleaned.is_empty() || cleaned.len() > 64 {
        "unknown".to_string()
    } else {
        cleaned
    }
}

pub fn validate_world_name(world: &str) -> Result<&str, String> {
    if world.is_empty() {
        return Err("World name must not be empty".to_string());
    }
    if world.len() > 120 {
        return Err("World name is too long".to_string());
    }
    if world == "." || world == ".." || world.contains('/') || world.contains('\\') || world.contains('\0') {
        return Err(format!("Invalid world name '{world}'"));
    }
    Ok(world)
}
