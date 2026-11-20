use std::path::Path;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DbInstance {
    pub id: String,
    pub name: String,
    pub mc_version: String,
    pub loader: String,
    pub x: f64,
    pub y: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub play_time_ms: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_played_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DbAccount {
    pub name: String,
    #[serde(rename = "type")]
    pub account_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DbModRecord {
    pub instance_id: String,
    pub mod_id: String,
    pub version: Option<String>,
    pub filename: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DbServer {
    pub host: String,
    pub port: u16,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favicon: Option<String>,
}

pub fn init_db(data_dir: &Path) -> Result<Connection, String> {
    let db_path = data_dir.join("omega.db");
    let conn = Connection::open(&db_path).map_err(|e| format!("Failed to open database: {e}"))?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         CREATE TABLE IF NOT EXISTS instances (
           id TEXT PRIMARY KEY,
           name TEXT NOT NULL,
           mc_version TEXT NOT NULL DEFAULT '1.20.1',
           loader TEXT NOT NULL DEFAULT 'Vanilla',
           x REAL NOT NULL DEFAULT 0,
           y REAL NOT NULL DEFAULT 0,
           icon TEXT,
           group_name TEXT
         );
         CREATE TABLE IF NOT EXISTS accounts (
           name TEXT PRIMARY KEY,
           account_type TEXT NOT NULL DEFAULT 'offline'
         );
         CREATE TABLE IF NOT EXISTS installed_mods (
           instance_id TEXT NOT NULL,
           mod_id TEXT NOT NULL,
           version TEXT,
           filename TEXT NOT NULL,
           PRIMARY KEY (instance_id, mod_id)
         );
         CREATE TABLE IF NOT EXISTS servers (
           host TEXT NOT NULL,
           port INTEGER NOT NULL DEFAULT 25565,
           name TEXT NOT NULL DEFAULT '',
           PRIMARY KEY (host, port)
         );",
    )
    .map_err(|e| format!("Failed to initialise database schema: {e}"))?;

    let has_favicon = {
        let mut stmt = conn
            .prepare("PRAGMA table_info(servers)")
            .map_err(|e| e.to_string())?;
        let cols = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| e.to_string())?;
        let mut found = false;
        for col in cols.flatten() {
            if col == "favicon" {
                found = true;
                break;
            }
        }
        found
    };
    if !has_favicon {
        let _ = conn.execute("ALTER TABLE servers ADD COLUMN favicon TEXT", []);
    }

    let (has_play_time, has_last_played) = {
        let mut stmt2 = conn
            .prepare("PRAGMA table_info(instances)")
            .map_err(|e| e.to_string())?;
        let inst_cols = stmt2
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| e.to_string())?;
        let mut play_time = false;
        let mut last_played = false;
        for col in inst_cols.flatten() {
            if col == "play_time_ms" {
                play_time = true;
            }
            if col == "last_played_at" {
                last_played = true;
            }
        }
        (play_time, last_played)
    };
    if !has_play_time {
        let _ = conn.execute("ALTER TABLE instances ADD COLUMN play_time_ms INTEGER NOT NULL DEFAULT 0", []);
    }
    if !has_last_played {
        let _ = conn.execute("ALTER TABLE instances ADD COLUMN last_played_at TEXT", []);
    }

    Ok(conn)
}

pub fn load_instances(conn: &Connection) -> Result<Vec<DbInstance>, String> {
    let mut stmt = conn
        .prepare("SELECT id, name, mc_version, loader, x, y, icon, group_name, play_time_ms, last_played_at FROM instances")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(DbInstance {
                id: row.get(0)?,
                name: row.get(1)?,
                mc_version: row.get(2)?,
                loader: row.get(3)?,
                x: row.get(4)?,
                y: row.get(5)?,
                icon: row.get(6)?,
                group_name: row.get(7)?,
                play_time_ms: row.get(8)?,
                last_played_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

pub fn save_instances(conn: &Connection, instances: &[DbInstance]) -> Result<(), String> {
    conn.execute("DELETE FROM instances", []).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("INSERT OR REPLACE INTO instances (id, name, mc_version, loader, x, y, icon, group_name, play_time_ms, last_played_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)")
        .map_err(|e| e.to_string())?;
    for inst in instances {
        stmt.execute(rusqlite::params![
            inst.id,
            inst.name,
            inst.mc_version,
            inst.loader,
            inst.x,
            inst.y,
            inst.icon,
            inst.group_name,
            inst.play_time_ms,
            inst.last_played_at
        ])
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn load_accounts(conn: &Connection) -> Result<Vec<DbAccount>, String> {
    let mut stmt = conn
        .prepare("SELECT name, account_type FROM accounts")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(DbAccount {
                name: row.get(0)?,
                account_type: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

pub fn save_accounts(conn: &Connection, accounts: &[DbAccount]) -> Result<(), String> {
    conn.execute("DELETE FROM accounts", []).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("INSERT OR REPLACE INTO accounts (name, account_type) VALUES (?1, ?2)")
        .map_err(|e| e.to_string())?;
    for acc in accounts {
        stmt.execute(rusqlite::params![acc.name, acc.account_type])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn add_account(conn: &Connection, acc: &DbAccount) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO accounts (name, account_type) VALUES (?1, ?2)",
        rusqlite::params![acc.name, acc.account_type],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_account(conn: &Connection, name: &str) -> Result<(), String> {
    conn.execute("DELETE FROM accounts WHERE name = ?1", [name])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn create_instance(conn: &Connection, inst: &DbInstance) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO instances (id, name, mc_version, loader, x, y, icon, group_name, play_time_ms, last_played_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![
            inst.id,
            inst.name,
            inst.mc_version,
            inst.loader,
            inst.x,
            inst.y,
            inst.icon,
            inst.group_name,
            inst.play_time_ms.unwrap_or(0),
            inst.last_played_at
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_instance(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM instances WHERE id = ?1", [id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM installed_mods WHERE instance_id = ?1", [id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_servers(conn: &Connection) -> Result<Vec<DbServer>, String> {
    let mut stmt = conn
        .prepare("SELECT host, port, name, favicon FROM servers ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(DbServer {
                host: row.get(0)?,
                port: row.get(1)?,
                name: row.get(2)?,
                favicon: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(|e| e.to_string())?);
    }
    Ok(list)
}

pub fn add_server(conn: &Connection, srv: &DbServer) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO servers (host, port, name, favicon) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![srv.host, srv.port, srv.name, srv.favicon],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn delete_server(conn: &Connection, host: &str, port: u16) -> Result<(), String> {
    conn.execute(
        "DELETE FROM servers WHERE host = ?1 AND port = ?2",
        rusqlite::params![host, port],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
