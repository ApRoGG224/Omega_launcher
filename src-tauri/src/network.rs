use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::Db;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    pub host: String,
    pub port: u16,
    pub name: String,
    pub motd: String,
    pub players_online: i32,
    pub players_max: i32,
    pub online: bool,
    pub latency_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favicon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerRow {
    pub host: String,
    pub port: u16,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favicon: Option<String>,
}

fn write_varint(out: &mut Vec<u8>, mut value: i32) {
    loop {
        let mut b = (value & 0x7F) as u8;
        value >>= 7;
        if value != 0 {
            b |= 0x80;
        }
        out.push(b);
        if value == 0 {
            break;
        }
    }
}

fn read_varint(reader: &mut impl Read) -> Result<i32, String> {
    let mut result = 0i32;
    let mut shift = 0;
    loop {
        let mut byte = [0u8; 1];
        reader.read_exact(&mut byte).map_err(|e| format!("VarInt read error: {e}"))?;
        let b = byte[0];
        result |= ((b & 0x7F) as i32) << shift;
        if b & 0x80 == 0 {
            return Ok(result);
        }
        shift += 7;
        if shift >= 35 {
            return Err("VarInt too long".to_string());
        }
    }
}

fn write_string_prefixed(out: &mut Vec<u8>, s: &str) {
    let bytes = s.as_bytes();
    write_varint(out, bytes.len() as i32);
    out.extend_from_slice(bytes);
}

fn chat_color_to_code(color: &str) -> String {
    let lower = color.to_lowercase();
    match lower.as_str() {
        "black" => "§0".to_string(),
        "dark_blue" => "§1".to_string(),
        "dark_green" => "§2".to_string(),
        "dark_aqua" => "§3".to_string(),
        "dark_red" => "§4".to_string(),
        "dark_purple" => "§5".to_string(),
        "gold" => "§6".to_string(),
        "gray" => "§7".to_string(),
        "dark_gray" => "§8".to_string(),
        "blue" => "§9".to_string(),
        "green" => "§a".to_string(),
        "aqua" => "§b".to_string(),
        "red" => "§c".to_string(),
        "light_purple" => "§d".to_string(),
        "yellow" => "§e".to_string(),
        "white" => "§f".to_string(),
        other if other.starts_with('#') && other.len() == 7 => {
            let mut spigot = String::from("§x");
            for ch in other[1..].chars() {
                spigot.push('§');
                spigot.push(ch);
            }
            spigot
        }
        _ => String::new(),
    }
}

fn motd_from_chat(val: &serde_json::Value) -> String {
    match val {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Object(map) => {
            let mut text = String::new();
            if let Some(color) = map.get("color").and_then(|c| c.as_str()) {
                text.push_str(&chat_color_to_code(color));
            }
            if map.get("bold").and_then(|b| b.as_bool()).unwrap_or(false) {
                text.push_str("§l");
            }
            if map.get("italic").and_then(|b| b.as_bool()).unwrap_or(false) {
                text.push_str("§o");
            }
            if map.get("underlined").and_then(|b| b.as_bool()).unwrap_or(false) {
                text.push_str("§n");
            }
            if map.get("strikethrough").and_then(|b| b.as_bool()).unwrap_or(false) {
                text.push_str("§m");
            }
            if let Some(t) = map.get("text").and_then(|t| t.as_str()) {
                text.push_str(t);
            }
            if let Some(extra) = map.get("extra").and_then(|e| e.as_array()) {
                for part in extra {
                    text.push_str(&motd_from_chat(part));
                }
            }
            text
        }
        serde_json::Value::Array(arr) => arr.iter().map(motd_from_chat).collect(),
        _ => String::new(),
    }
}

fn connect_with_timeout(host: &str, port: u16, timeout: Duration) -> Result<TcpStream, String> {
    let mut addrs: Vec<std::net::SocketAddr> = (host, port)
        .to_socket_addrs()
        .map_err(|e| format!("DNS resolution error: {e}"))?
        .collect();
    if addrs.is_empty() {
        return Err("No address resolved".to_string());
    }

    // Sort IPv4 first to avoid unreachable IPv6 route hangs
    addrs.sort_by_key(|a| if a.is_ipv4() { 0 } else { 1 });

    let mut last_err = None;
    for addr in addrs {
        match TcpStream::connect_timeout(&addr, timeout) {
            Ok(stream) => return Ok(stream),
            Err(e) => last_err = Some(e),
        }
    }
    Err(last_err
        .map(|e| e.to_string())
        .unwrap_or_else(|| "Connect timeout".to_string()))
}

fn modern_ping(
    host: &str,
    port: u16,
    timeout: Duration,
) -> Result<(String, String, i32, i32, Option<String>, Option<String>, u64), String> {
    let started = std::time::Instant::now();
    let mut stream = connect_with_timeout(host, port, timeout)?;
    stream
        .set_read_timeout(Some(timeout))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(timeout))
        .map_err(|e| e.to_string())?;

    let mut handshake = Vec::new();
    // Handshake packet ID: 0x00
    write_varint(&mut handshake, 0);
    // Protocol version: 47 (compatible with MC 1.8 through 1.21+)
    write_varint(&mut handshake, 47);
    write_string_prefixed(&mut handshake, host);
    handshake.extend_from_slice(&port.to_be_bytes());
    // Next state: 1 (Status)
    write_varint(&mut handshake, 1);

    let mut packet = Vec::new();
    write_varint(&mut packet, handshake.len() as i32);
    packet.extend_from_slice(&handshake);
    stream.write_all(&packet).map_err(|e| e.to_string())?;

    stream.write_all(&[0x01, 0x00]).map_err(|e| e.to_string())?;

    let _packet_len = read_varint(&mut stream)?;
    let _packet_id = read_varint(&mut stream)?;
    let json_len = read_varint(&mut stream)?;
    if !(0..=(1 << 20)).contains(&json_len) {
        return Err("Invalid status response length".to_string());
    }
    let mut buf = vec![0u8; json_len as usize];
    stream.read_exact(&mut buf).map_err(|e| e.to_string())?;
    let latency = started.elapsed().as_millis() as u64;
    let text = String::from_utf8_lossy(&buf).to_string();
    let json: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("Bad status json: {e}"))?;

    let players = json.get("players").cloned().unwrap_or_default();
    let players_online = players.get("online").and_then(|n| n.as_i64()).unwrap_or(0) as i32;
    let players_max = players.get("max").and_then(|n| n.as_i64()).unwrap_or(0) as i32;
    let motd = json
        .get("description")
        .map(motd_from_chat)
        .unwrap_or_default();
    let favicon = json
        .get("favicon")
        .and_then(|f| f.as_str())
        .map(|s| s.to_string());
    let version = json
        .get("version")
        .and_then(|v| v.get("name"))
        .and_then(|n| n.as_str())
        .map(|s| s.to_string());

    Ok((
        motd,
        String::new(),
        players_online,
        players_max,
        favicon,
        version,
        latency,
    ))
}

fn legacy_ping(
    host: &str,
    port: u16,
    timeout: Duration,
) -> Result<(String, String, i32, i32, u64), String> {
    let started = std::time::Instant::now();
    let mut stream = connect_with_timeout(host, port, timeout)?;
    stream
        .set_read_timeout(Some(timeout))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(timeout))
        .map_err(|e| e.to_string())?;

    let mut payload: Vec<u8> = vec![0x01, 0xFA];
    let string = b"MC|PingHost";
    payload.push(0x00);
    payload.push(string.len() as u8);
    payload.extend_from_slice(string);
    payload.push(0x00);
    let host_bytes = host.as_bytes();
    payload.push(host_bytes.len() as u8);
    payload.extend_from_slice(host_bytes);
    payload.extend_from_slice(&port.to_be_bytes());

    let mut packet = vec![0xFE, 0x01];
    let len = payload.len() as u16;
    packet.extend_from_slice(&len.to_be_bytes());
    packet.extend_from_slice(&payload);
    stream.write_all(&packet).map_err(|e| e.to_string())?;

    let mut buf = Vec::new();
    stream.read_to_end(&mut buf).map_err(|e| e.to_string())?;
    let latency = started.elapsed().as_millis() as u64;

    if buf.len() < 3 || buf[0] != 0xFF {
        return Err("Not a Minecraft server or unsupported protocol".to_string());
    }
    let len = u16::from_be_bytes([buf[1], buf[2]]) as usize;
    let text = String::from_utf8_lossy(&buf[3..3 + len]).to_string();
    let parts: Vec<&str> = text.split('\0').collect();
    let motd = parts.get(1).map(|s| s.to_string()).unwrap_or_default();
    let players_online = parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
    let players_max = parts.get(3).and_then(|s| s.parse().ok()).unwrap_or(0);
    Ok((motd, String::new(), players_online, players_max, latency))
}

#[tauri::command]
pub async fn ping_server(host: String, port: Option<u16>) -> Result<ServerInfo, String> {
    let mut clean_host = host.trim().to_string();
    if let Some(stripped) = clean_host.strip_prefix("https://") {
        clean_host = stripped.to_string();
    } else if let Some(stripped) = clean_host.strip_prefix("http://") {
        clean_host = stripped.to_string();
    }
    if let Some(idx) = clean_host.find('/') {
        clean_host = clean_host[..idx].to_string();
    }

    let mut clean_port = port.unwrap_or(25565);
    if let Some(colon_pos) = clean_host.find(':') {
        let p_str = &clean_host[colon_pos + 1..];
        if let Ok(parsed_port) = p_str.parse::<u16>() {
            clean_port = parsed_port;
        }
        clean_host = clean_host[..colon_pos].to_string();
    }

    if clean_host.is_empty() {
        return Err("Empty host".to_string());
    }

    let started = std::time::Instant::now();
    let host_for_ping = clean_host.clone();
    let result = tokio::task::spawn_blocking(move || {
        match modern_ping(&host_for_ping, clean_port, Duration::from_millis(4000)) {
            Ok((motd, name, players_online, players_max, favicon, version, latency)) => Ok((
                motd,
                name,
                players_online,
                players_max,
                favicon,
                version,
                latency,
            )),
            Err(_) => {
                legacy_ping(&host_for_ping, clean_port, Duration::from_millis(3000)).map(
                    |(motd, name, players_online, players_max, latency)| {
                        (motd, name, players_online, players_max, None, None, latency)
                    },
                )
            }
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    match result {
        Ok((motd, name, players_online, players_max, favicon, version, latency)) => {
            Ok(ServerInfo {
                host: clean_host,
                port: clean_port,
                name,
                motd,
                players_online,
                players_max,
                online: true,
                latency_ms: latency,
                favicon,
                version,
            })
        }
        Err(_) => Ok(ServerInfo {
            host: clean_host,
            port: clean_port,
            name: String::new(),
            motd: String::new(),
            players_online: 0,
            players_max: 0,
            online: false,
            latency_ms: started.elapsed().as_millis() as u64,
            favicon: None,
            version: None,
        }),
    }
}

#[tauri::command]
pub fn db_load_servers(db: State<'_, Db>) -> Result<Vec<ServerRow>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT host, port, name, favicon FROM servers ORDER BY host")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(ServerRow {
                host: row.get(0)?,
                port: row.get(1)?,
                name: row.get(2)?,
                favicon: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut servers = Vec::new();
    for row in rows {
        servers.push(row.map_err(|e| e.to_string())?);
    }
    Ok(servers)
}

#[tauri::command]
pub fn db_save_server(db: State<'_, Db>, server: ServerRow) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO servers (host, port, name, favicon) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (host, port) DO UPDATE SET
           name = excluded.name,
           favicon = COALESCE(excluded.favicon, servers.favicon)",
        rusqlite::params![server.host, server.port, server.name, server.favicon],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_save_server_favicon(
    db: State<'_, Db>,
    host: String,
    port: u16,
    favicon: String,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE servers SET favicon = ?3 WHERE host = ?1 AND port = ?2",
        rusqlite::params![host, port, favicon],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_delete_server(db: State<'_, Db>, host: String, port: u16) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM servers WHERE host = ?1 AND port = ?2",
        rusqlite::params![host, port],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
