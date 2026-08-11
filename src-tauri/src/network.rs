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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerRow {
    pub host: String,
    pub port: u16,
    pub name: String,
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
    match tokio::task::spawn_blocking(move || {
        legacy_ping(&host_for_ping, port, Duration::from_secs(3))
    })
    .await
    .map_err(|e| e.to_string())?
    {
        Ok((motd, _, players_online, players_max, latency)) => Ok(ServerInfo {
            host: host_trim,
            port,
            name: String::new(),
            motd,
            players_online,
            players_max,
            online: true,
            latency_ms: latency,
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
        }),
    }
}

#[tauri::command]
pub fn db_load_servers(db: State<'_, Db>) -> Result<Vec<ServerRow>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT host, port, name FROM servers ORDER BY host")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(ServerRow {
                host: row.get(0)?,
                port: row.get(1)?,
                name: row.get(2)?,
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
        "INSERT OR REPLACE INTO servers (host, port, name) VALUES (?1, ?2, ?3)",
        rusqlite::params![server.host, server.port, server.name],
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