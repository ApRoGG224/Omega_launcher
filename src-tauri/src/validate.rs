use std::path::{Path, PathBuf};

/// Guards against path traversal: instance ids must be a short safe token.
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

/// Builds the per-instance `minecraft` folder path, rejecting traversal.
pub fn instance_minecraft_dir(data_dir: &Path, id: &str) -> Result<PathBuf, String> {
    let id = validate_instance_id(id)?;
    let root = data_dir.join("instances");
    let instance = root.join(id);
    if !instance.starts_with(&root) {
        return Err("Invalid instance path".to_string());
    }
    Ok(instance.join("minecraft"))
}

/// Resolves a user-supplied path, expanding `~`. Rejects paths that escape
/// nothing (there is no fixed sandbox) but normalizes them.
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

/// Sanitizes an arbitrary id into a safe filesystem token (for icon files).
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

/// Rejects world names that could escape the saves directory (path traversal).
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_traversal() {
        assert!(validate_instance_id("../../etc").is_err());
        assert!(validate_instance_id("..").is_err());
        assert!(validate_instance_id("a/b").is_err());
        assert!(validate_instance_id("a\\b").is_err());
        assert!(validate_instance_id("").is_err());
        assert!(validate_instance_id("foo-instance_2").is_ok());
    }

    #[test]
    fn instance_dir_stays_under_root() {
        let root = Path::new("/data");
        let dir = instance_minecraft_dir(root, "safe-id").unwrap();
        assert!(dir.starts_with(root.join("instances")));
        assert!(instance_minecraft_dir(root, "..%2f..").is_err());
    }

    #[test]
    fn tilde_expansion() {
        let path = expand_user_path("~/Downloads");
        assert!(path.is_absolute());
    }

    #[test]
    fn world_name_rejects_traversal() {
        assert!(validate_world_name("../../etc").is_err());
        assert!(validate_world_name("..").is_err());
        assert!(validate_world_name("a\\b").is_err());
        assert!(validate_world_name("").is_err());
        assert!(validate_world_name("My Survival World").is_ok());
    }
}