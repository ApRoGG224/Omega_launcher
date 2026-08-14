use base64::Engine as _;
use std::sync::Mutex;

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::util::app_data_dir;

pub struct Db(pub Mutex<Connection>);

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

/// Opens (or creates) the SQLite database inside the app data dir.
pub fn init(app: &AppHandle) -> Result<Connection, String> {
    let data_dir = app_data_dir(app);
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

    // Migration: older databases lack the servers.favicon column.
    let has_favicon = {
        let mut stmt = conn
            .prepare("PRAGMA table_info(servers)")
            .map_err(|e| e.to_string())?;
        let cols = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| e.to_string())?;
        let mut found = false;
        for col in cols {
            if col.map(|c| c == "favicon").unwrap_or(false) {
                found = true;
            }
        }
        found
    };
    if !has_favicon {
        conn.execute(
            "ALTER TABLE servers ADD COLUMN favicon TEXT",
            [],
        )
        .map_err(|e| format!("Failed to migrate servers table: {e}"))?;
    }

    // Migration: older databases lack the instances.play_time_ms /
    // instances.last_played_at columns.
    let mut instance_cols = Vec::new();
    {
        let mut stmt = conn
            .prepare("PRAGMA table_info(instances)")
            .map_err(|e| e.to_string())?;
        let cols = stmt
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|e| e.to_string())?;
        for col in cols {
            instance_cols.push(col.map_err(|e| e.to_string())?);
        }
    }
    if !instance_cols.iter().any(|c| c == "play_time_ms") {
        conn.execute("ALTER TABLE instances ADD COLUMN play_time_ms INTEGER NOT NULL DEFAULT 0", [])
            .map_err(|e| format!("Failed to migrate instances table (play_time_ms): {e}"))?;
    }
    if !instance_cols.iter().any(|c| c == "last_played_at") {
        conn.execute("ALTER TABLE instances ADD COLUMN last_played_at TEXT", [])
            .map_err(|e| format!("Failed to migrate instances table (last_played_at): {e}"))?;
    }

    Ok(conn)
}

fn row_to_instance(row: &rusqlite::Row<'_>) -> rusqlite::Result<DbInstance> {
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
}

#[tauri::command]
pub fn db_load_instances(db: State<'_, Db>) -> Result<Vec<DbInstance>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, mc_version, loader, x, y, icon, group_name, play_time_ms, last_played_at FROM instances")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_instance)
        .map_err(|e| e.to_string())?;
    let mut instances = Vec::new();
    for row in rows {
        instances.push(row.map_err(|e| e.to_string())?);
    }
    Ok(instances)
}

#[tauri::command]
pub fn db_save_instances(db: State<'_, Db>, instances: Vec<DbInstance>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM instances", []).map_err(|e| e.to_string())?;
    {
        let mut stmt = conn
            .prepare("INSERT OR REPLACE INTO instances (id, name, mc_version, loader, x, y, icon, group_name, play_time_ms, last_played_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)")
            .map_err(|e| e.to_string())?;
        for inst in &instances {
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
    }
    Ok(())
}

#[tauri::command]
pub fn db_delete_instance(db: State<'_, Db>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM installed_mods WHERE instance_id = ?1",
        rusqlite::params![id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM instances WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn row_to_account(row: &rusqlite::Row<'_>) -> rusqlite::Result<DbAccount> {
    Ok(DbAccount {
        name: row.get(0)?,
        account_type: row.get(1)?,
    })
}

#[tauri::command]
pub fn db_load_accounts(db: State<'_, Db>) -> Result<Vec<DbAccount>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT name, account_type FROM accounts")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_account)
        .map_err(|e| e.to_string())?;
    let mut accounts = Vec::new();
    for row in rows {
        accounts.push(row.map_err(|e| e.to_string())?);
    }
    Ok(accounts)
}

#[tauri::command]
pub fn db_save_accounts(db: State<'_, Db>, accounts: Vec<DbAccount>) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM accounts", []).map_err(|e| e.to_string())?;
    {
        let mut stmt = conn
            .prepare("INSERT OR REPLACE INTO accounts (name, account_type) VALUES (?1, ?2)")
            .map_err(|e| e.to_string())?;
        for acc in &accounts {
            stmt.execute(rusqlite::params![acc.name, acc.account_type])
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

pub fn record_installed_mod_impl(
    db: &Db,
    instance_id: &str,
    mod_id: &str,
    version: Option<String>,
    filename: &str,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT OR REPLACE INTO installed_mods (instance_id, mod_id, version, filename) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![instance_id, mod_id, version, filename],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_record_installed_mod(
    db: State<'_, Db>,
    instance_id: String,
    mod_id: String,
    version: Option<String>,
    filename: String,
) -> Result<(), String> {
    record_installed_mod_impl(&db, &instance_id, &mod_id, version, &filename)
}

#[tauri::command]
pub fn db_list_installed_mods(db: State<'_, Db>, instance_id: String) -> Result<Vec<DbModRecord>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT instance_id, mod_id, version, filename FROM installed_mods WHERE instance_id = ?1")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![instance_id], |row| {
            Ok(DbModRecord {
                instance_id: row.get(0)?,
                mod_id: row.get(1)?,
                version: row.get(2)?,
                filename: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut records = Vec::new();
    for row in rows {
        records.push(row.map_err(|e| e.to_string())?);
    }
    Ok(records)
}

/// Decodes a `data:image/...;base64,...` URL and stores it as a file under
/// `app_data_dir/icons/`. Returns the absolute path to the saved image.
#[tauri::command]
pub fn db_save_icon(app: AppHandle, instance_id: String, data_url: String) -> Result<String, String> {
    let Some((_, base64_part)) = data_url.split_once(',') else {
        return Err("Invalid data URL".to_string());
    };
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_part.trim())
        .map_err(|e| format!("Invalid icon data: {e}"))?;
    let safe_id = crate::validate::sanitize_id(&instance_id);
    let icons_dir = app_data_dir(&app).join("icons");
    std::fs::create_dir_all(&icons_dir).map_err(|e| e.to_string())?;
    let icon_path = icons_dir.join(format!("{safe_id}.png"));
    std::fs::write(&icon_path, bytes).map_err(|e| e.to_string())?;
    Ok(icon_path.to_string_lossy().to_string())
}