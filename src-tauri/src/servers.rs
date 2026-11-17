use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::util::app_data_dir;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceServerEntry {
    pub name: String,
    pub ip: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accept_textures: Option<u8>,
}

fn get_servers_dat_path(app: &AppHandle, instance_id: &str) -> PathBuf {
    let data_dir = app_data_dir(app);
    let mc_path = data_dir
        .join("instances")
        .join(instance_id)
        .join("minecraft")
        .join("servers.dat");
    if mc_path.exists() {
        return mc_path;
    }

    let root_path = data_dir
        .join("instances")
        .join(instance_id)
        .join("servers.dat");
    if root_path.exists() {
        return root_path;
    }

    // Default target path for saving
    let target_dir = data_dir.join("instances").join(instance_id).join("minecraft");
    let _ = fs::create_dir_all(&target_dir);
    mc_path
}

fn read_nbt_string(r: &mut impl Read) -> Result<String, String> {
    let mut len_b = [0u8; 2];
    r.read_exact(&mut len_b).map_err(|e| e.to_string())?;
    let len = u16::from_be_bytes(len_b) as usize;
    let mut buf = vec![0u8; len];
    r.read_exact(&mut buf).map_err(|e| e.to_string())?;
    Ok(String::from_utf8_lossy(&buf).to_string())
}

fn skip_nbt_payload(r: &mut impl Read, tag: u8) -> Result<(), String> {
    match tag {
        0 => Ok(()),
        1 => {
            let mut b = [0u8; 1];
            r.read_exact(&mut b).map_err(|e| e.to_string())?;
            Ok(())
        }
        2 => {
            let mut b = [0u8; 2];
            r.read_exact(&mut b).map_err(|e| e.to_string())?;
            Ok(())
        }
        3 => {
            let mut b = [0u8; 4];
            r.read_exact(&mut b).map_err(|e| e.to_string())?;
            Ok(())
        }
        4 => {
            let mut b = [0u8; 8];
            r.read_exact(&mut b).map_err(|e| e.to_string())?;
            Ok(())
        }
        5 => {
            let mut b = [0u8; 4];
            r.read_exact(&mut b).map_err(|e| e.to_string())?;
            Ok(())
        }
        6 => {
            let mut b = [0u8; 8];
            r.read_exact(&mut b).map_err(|e| e.to_string())?;
            Ok(())
        }
        7 => {
            let mut len_b = [0u8; 4];
            r.read_exact(&mut len_b).map_err(|e| e.to_string())?;
            let len = i32::from_be_bytes(len_b) as usize;
            let mut buf = vec![0u8; len];
            r.read_exact(&mut buf).map_err(|e| e.to_string())?;
            Ok(())
        }
        8 => {
            let _ = read_nbt_string(r)?;
            Ok(())
        }
        9 => {
            let mut elem_type = [0u8; 1];
            r.read_exact(&mut elem_type).map_err(|e| e.to_string())?;
            let mut count_b = [0u8; 4];
            r.read_exact(&mut count_b).map_err(|e| e.to_string())?;
            let count = i32::from_be_bytes(count_b);
            if count > 0 {
                for _ in 0..count {
                    skip_nbt_payload(r, elem_type[0])?;
                }
            }
            Ok(())
        }
        10 => {
            loop {
                let mut tag_b = [0u8; 1];
                r.read_exact(&mut tag_b).map_err(|e| e.to_string())?;
                if tag_b[0] == 0 {
                    break;
                }
                let _name = read_nbt_string(r)?;
                skip_nbt_payload(r, tag_b[0])?;
            }
            Ok(())
        }
        11 => {
            let mut len_b = [0u8; 4];
            r.read_exact(&mut len_b).map_err(|e| e.to_string())?;
            let len = i32::from_be_bytes(len_b) as usize * 4;
            let mut buf = vec![0u8; len];
            r.read_exact(&mut buf).map_err(|e| e.to_string())?;
            Ok(())
        }
        12 => {
            let mut len_b = [0u8; 4];
            r.read_exact(&mut len_b).map_err(|e| e.to_string())?;
            let len = i32::from_be_bytes(len_b) as usize * 8;
            let mut buf = vec![0u8; len];
            r.read_exact(&mut buf).map_err(|e| e.to_string())?;
            Ok(())
        }
        _ => Err(format!("Unknown NBT tag: {tag}")),
    }
}

pub fn parse_servers_dat_bytes(bytes: &[u8]) -> Result<Vec<InstanceServerEntry>, String> {
    if bytes.is_empty() {
        return Ok(Vec::new());
    }

    let mut cursor: Box<dyn Read> = if bytes.len() >= 2 && bytes[0] == 0x1f && bytes[1] == 0x8b {
        Box::new(GzDecoder::new(bytes))
    } else {
        Box::new(bytes)
    };

    let mut root_tag = [0u8; 1];
    cursor.read_exact(&mut root_tag).map_err(|e| e.to_string())?;
    if root_tag[0] != 10 {
        return Err("servers.dat root tag is not Compound (10)".to_string());
    }

    let _root_name = read_nbt_string(&mut cursor)?;
    let mut servers = Vec::new();

    loop {
        let mut tag_b = [0u8; 1];
        if cursor.read_exact(&mut tag_b).is_err() {
            break;
        }
        if tag_b[0] == 0 {
            break;
        }

        let name = read_nbt_string(&mut cursor)?;
        if tag_b[0] == 9 && name == "servers" {
            let mut elem_type = [0u8; 1];
            cursor.read_exact(&mut elem_type).map_err(|e| e.to_string())?;
            let mut count_b = [0u8; 4];
            cursor.read_exact(&mut count_b).map_err(|e| e.to_string())?;
            let count = i32::from_be_bytes(count_b);

            if elem_type[0] == 10 && count > 0 {
                for _ in 0..count {
                    let mut srv_name = String::new();
                    let mut srv_ip = String::new();
                    let mut srv_icon: Option<String> = None;
                    let mut srv_accept: Option<u8> = None;

                    loop {
                        let mut field_tag = [0u8; 1];
                        cursor.read_exact(&mut field_tag).map_err(|e| e.to_string())?;
                        if field_tag[0] == 0 {
                            break;
                        }

                        let field_name = read_nbt_string(&mut cursor)?;
                        match (field_tag[0], field_name.as_str()) {
                            (8, "name") => {
                                srv_name = read_nbt_string(&mut cursor)?;
                            }
                            (8, "ip") => {
                                srv_ip = read_nbt_string(&mut cursor)?;
                            }
                            (8, "icon") => {
                                let raw = read_nbt_string(&mut cursor)?;
                                if !raw.trim().is_empty() {
                                    let formatted = if raw.starts_with("data:image") {
                                        raw
                                    } else {
                                        format!("data:image/png;base64,{raw}")
                                    };
                                    srv_icon = Some(formatted);
                                }
                            }
                            (1, "acceptTextures") => {
                                let mut b = [0u8; 1];
                                cursor.read_exact(&mut b).map_err(|e| e.to_string())?;
                                srv_accept = Some(b[0]);
                            }
                            _ => {
                                skip_nbt_payload(&mut cursor, field_tag[0])?;
                            }
                        }
                    }

                    if !srv_ip.trim().is_empty() {
                        servers.push(InstanceServerEntry {
                            name: if srv_name.trim().is_empty() {
                                srv_ip.clone()
                            } else {
                                srv_name
                            },
                            ip: srv_ip,
                            icon: srv_icon,
                            accept_textures: srv_accept,
                        });
                    }
                }
            }
        } else {
            skip_nbt_payload(&mut cursor, tag_b[0])?;
        }
    }

    Ok(servers)
}

pub fn write_servers_dat_file(path: &Path, servers: &[InstanceServerEntry]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let mut out = Vec::new();
    // Root Tag 10 Compound
    out.push(10);
    // Root name "" (u16 length = 0)
    out.extend_from_slice(&0u16.to_be_bytes());

    // Tag 9 List
    out.push(9);
    let list_name = b"servers";
    out.extend_from_slice(&(list_name.len() as u16).to_be_bytes());
    out.extend_from_slice(list_name);

    // Element type: 10 (Compound)
    out.push(10);
    // Count: i32
    out.extend_from_slice(&(servers.len() as i32).to_be_bytes());

    for s in servers {
        // Tag 8 String: "name"
        out.push(8);
        let n_key = b"name";
        out.extend_from_slice(&(n_key.len() as u16).to_be_bytes());
        out.extend_from_slice(n_key);
        let n_val = s.name.as_bytes();
        out.extend_from_slice(&(n_val.len() as u16).to_be_bytes());
        out.extend_from_slice(n_val);

        // Tag 8 String: "ip"
        out.push(8);
        let ip_key = b"ip";
        out.extend_from_slice(&(ip_key.len() as u16).to_be_bytes());
        out.extend_from_slice(ip_key);
        let ip_val = s.ip.as_bytes();
        out.extend_from_slice(&(ip_val.len() as u16).to_be_bytes());
        out.extend_from_slice(ip_val);

        // Optional Tag 8 String: "icon"
        if let Some(ref icon) = s.icon {
            let clean = icon.strip_prefix("data:image/png;base64,").unwrap_or(icon);
            if !clean.trim().is_empty() {
                out.push(8);
                let ic_key = b"icon";
                out.extend_from_slice(&(ic_key.len() as u16).to_be_bytes());
                out.extend_from_slice(ic_key);
                let ic_val = clean.as_bytes();
                out.extend_from_slice(&(ic_val.len() as u16).to_be_bytes());
                out.extend_from_slice(ic_val);
            }
        }

        // Optional Tag 1 Byte: "acceptTextures"
        if let Some(accept) = s.accept_textures {
            out.push(1);
            let at_key = b"acceptTextures";
            out.extend_from_slice(&(at_key.len() as u16).to_be_bytes());
            out.extend_from_slice(at_key);
            out.push(accept);
        }

        // Tag 0 End of compound
        out.push(0);
    }

    // Tag 0 End of root compound
    out.push(0);

    fs::write(path, out).map_err(|e| format!("Failed to write servers.dat: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn list_instance_servers(
    app: AppHandle,
    instance_id: String,
) -> Result<Vec<InstanceServerEntry>, String> {
    let path = get_servers_dat_path(&app, &instance_id);
    if !path.exists() {
        return Ok(Vec::new());
    }

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read servers.dat: {e}"))?;
    parse_servers_dat_bytes(&bytes)
}

#[tauri::command]
pub fn save_instance_servers(
    app: AppHandle,
    instance_id: String,
    servers: Vec<InstanceServerEntry>,
) -> Result<(), String> {
    let path = get_servers_dat_path(&app, &instance_id);
    write_servers_dat_file(&path, &servers)
}

#[tauri::command]
pub fn add_instance_server(
    app: AppHandle,
    instance_id: String,
    name: String,
    ip: String,
) -> Result<InstanceServerEntry, String> {
    let path = get_servers_dat_path(&app, &instance_id);
    let mut servers = if path.exists() {
        let bytes = fs::read(&path).unwrap_or_default();
        parse_servers_dat_bytes(&bytes).unwrap_or_default()
    } else {
        Vec::new()
    };

    let clean_ip = ip.trim().to_string();
    let clean_name = if name.trim().is_empty() {
        clean_ip.clone()
    } else {
        name.trim().to_string()
    };

    let entry = InstanceServerEntry {
        name: clean_name,
        ip: clean_ip.clone(),
        icon: None,
        accept_textures: None,
    };

    // Update if IP already exists, else append
    if let Some(pos) = servers.iter().position(|s| s.ip.eq_ignore_ascii_case(&clean_ip)) {
        servers[pos].name = entry.name.clone();
    } else {
        servers.push(entry.clone());
    }

    write_servers_dat_file(&path, &servers)?;
    Ok(entry)
}

#[tauri::command]
pub fn delete_instance_server(
    app: AppHandle,
    instance_id: String,
    ip: String,
) -> Result<(), String> {
    let path = get_servers_dat_path(&app, &instance_id);
    if !path.exists() {
        return Ok(());
    }

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read servers.dat: {e}"))?;
    let mut servers = parse_servers_dat_bytes(&bytes).unwrap_or_default();
    servers.retain(|s| !s.ip.eq_ignore_ascii_case(ip.trim()));

    write_servers_dat_file(&path, &servers)
}
