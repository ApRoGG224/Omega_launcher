use std::io::{Read, Write};
use std::net::TcpStream;
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

/// VarInt helpers for the Minecraft server list ping protocol.
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

/// Extracts plain text from a modern MC `description` (string or chat component).
fn motd_from_chat(val: &serde_json::Value) -> String {
    match val {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Object(map) => {
            let mut text = map
                .get("text")
                .and_then(|t| t.as_str())
                .unwrap_or("")
                .to_string();
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

/// Modern (1.7+) server list ping. Returns MOTD, players, favicon (base64) and latency.
fn modern_ping(
    host: &str,
    port: u16,
    timeout: Duration,
) -> Result<(String, String, i32, i32, Option<String>, u64), String> {
    let started = std::time::Instant::now();
    let mut stream = TcpStream::connect((host, port)).map_err(|e| format!("Cannot connect: {e}"))?;
    stream
        .set_read_timeout(Some(timeout))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(timeout))
        .map_err(|e| e.to_string())?;

    // Handshake: packet id 0x00, protocol 47 (1.8), host, port, next state 1 (status).
    let mut handshake = Vec::new();
    write_varint(&mut handshake, 47);
    write_string_prefixed(&mut handshake, host);
    handshake.extend_from_slice(&port.to_be_bytes());
    write_varint(&mut handshake, 1);
    let mut packet = Vec::new();
    write_varint(&mut packet, handshake.len() as i32);
    packet.extend_from_slice(&handshake);
    stream.write_all(&packet).map_err(|e| e.to_string())?;

    // Status request: single packet with id 0x00.
    stream.write_all(&[0x01, 0x00]).map_err(|e| e.to_string())?;

    // Response: packet length, packet id, then the json string.
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
    let json: serde_json::Value = serde_json::from_str(&text).map_err(|e| format!("Bad status json: {e}"))?;

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
    Ok((motd, String::new(), players_online, players_max, favicon, latency))
}

/// Legacy (1.6-) server list ping. Fast and dependency-free.
fn legacy_ping(host: &str, port: u16, timeout: Duration) -> Result<(String, String, i32, i32, u64), String> {
    let started = std::time::Instant::now();
    let mut stream = TcpStream::connect((host, port)).map_err(|e| format!("Cannot connect: {e}"))?;
    stream
        .set_read_timeout(Some(timeout))
        .map_err(|e| e.to_string())?;
    stream
        .set_write_timeout(Some(timeout))
        .map_err(|e| e.to_string())?;

    // 0xFE 0x01 0xFA 0x00 0x0B "MC|PingHost" 0x00 0x04 len host... port
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

    // Response: 0xFF 0x00 len "§1\0motd\0players\0max"
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

/// Pings a Minecraft server and returns its status (online, MOTD, players).
#[tauri::command]
pub async fn ping_server(host: String, port: Option<u16>) -> Result<ServerInfo, String> {
    let port = port.unwrap_or(25565);
    let host_trim = host.trim().to_string();
    if host_trim.is_empty() {
        return Err("Empty host".to_string());
    }
    let started = std::time::Instant::now();
    let host_for_ping = host_trim.clone();
    let result = tokio::task::spawn_blocking(move || {
        match modern_ping(&host_for_ping, port, Duration::from_secs(3)) {
            Ok((motd, name, players_online, players_max, favicon, latency)) => Ok((
                motd,
                name,
                players_online,
                players_max,
                favicon,
                latency,
            )),
            Err(_) => {
                // Modern ping failed (old server or non-standard) - fall back to legacy.
                legacy_ping(&host_for_ping, port, Duration::from_secs(3))
                    .map(|(motd, name, players_online, players_max, latency)| {
                        (motd, name, players_online, players_max, None, latency)
                    })
            }
        }
    })
    .await
    .map_err(|e| e.to_string())?;

    match result {
        Ok((motd, name, players_online, players_max, favicon, latency)) => Ok(ServerInfo {
            host: host_trim,
            port,
            name,
            motd,
            players_online,
            players_max,
            online: true,
            latency_ms: latency,
            favicon,
        }),
        Err(_) => Ok(ServerInfo {
            host: host_trim,
            port,
            name: String::new(),
            motd: String::new(),
            players_online: 0,
            players_max: 0,
            online: false,
            latency_ms: started.elapsed().as_millis() as u64,
            favicon: None,
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