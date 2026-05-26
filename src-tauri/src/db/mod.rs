use serde::{Serialize, Deserialize};
use rusqlite::{Connection, Result, params};
use std::sync::Mutex;
use std::path::PathBuf;
use tracing::info;

pub mod projects;
pub mod sessions;
pub mod records;
pub mod settings;
pub mod import_export;

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub category_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub is_archived: bool,
    pub sort_order: String,
    pub tags: Vec<String>,
    pub display_order: i64,
    pub total_minutes: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub project_id: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub minutes: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyRecord {
    pub id: String,
    pub date: String,
    pub content: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectStat {
    pub project_id: String,
    pub project_name: String,
    pub total_minutes: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailySessionStat {
    pub date: String,
    pub project_name: String,
    pub minutes: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DailyFocus {
    pub date: String,
    pub totalMinutes: i64,
    pub projects: Vec<ProjectFocus>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectFocus {
    pub name: String,
    pub minutes: i64,
}

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        std::fs::create_dir_all(&app_data_dir).ok();
        let db_path = app_data_dir.join("yi.db");
        info!("Opening database at: {:?}", db_path);

        let conn = Connection::open(&db_path)?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.init_tables()?;
        Ok(db)
    }

    fn init_tables(&self) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");

        conn.execute_batch("PRAGMA foreign_keys = ON")?;

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category_id TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                is_archived INTEGER DEFAULT 0,
                sort_order TEXT DEFAULT 'created',
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS project_tags (
                project_id TEXT,
                tag_id TEXT,
                PRIMARY KEY (project_id, tag_id)
            );

            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                started_at INTEGER NOT NULL,
                ended_at INTEGER,
                minutes INTEGER,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS daily_records (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL UNIQUE,
                content TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS attachments (
                id TEXT PRIMARY KEY,
                record_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                filetype TEXT,
                size INTEGER,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (record_id) REFERENCES daily_records(id)
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
            CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(date);
            CREATE INDEX IF NOT EXISTS idx_project_tags_tag ON project_tags(tag_id);
            CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
            "
        )?;

        info!("Database tables initialized");
        Ok(())
    }

    pub fn add_tag_to_project(&self, project_id: &str, tag_name: &str) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");

        conn.execute("INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)", params![uuid::Uuid::new_v4().to_string(), tag_name])?;

        let tag_id: String = conn.query_row(
            "SELECT id FROM tags WHERE name = ?",
            [tag_name],
            |row| row.get(0),
        )?;

        conn.execute(
            "INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)",
            params![project_id, tag_id],
        )?;

        Ok(())
    }
}
