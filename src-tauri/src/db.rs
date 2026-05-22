use serde::{Serialize, Deserialize};
use rusqlite::{Connection, Result, params};
use std::sync::Mutex;
use std::path::PathBuf;
use tracing::info;

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
            "
        )?;

        info!("Database tables initialized");
        Ok(())
    }

    pub fn get_projects(&self, include_archived: bool) -> Result<Vec<Project>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = if include_archived {
            conn.prepare("SELECT id, name, category_id, created_at, updated_at, is_archived, sort_order, display_order FROM projects ORDER BY display_order ASC")?
        } else {
            conn.prepare("SELECT id, name, category_id, created_at, updated_at, is_archived, sort_order, display_order FROM projects WHERE is_archived = 0 ORDER BY display_order ASC")?
        };

        let project_iter = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                category_id: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                is_archived: row.get::<_, i32>(5)? == 1,
                sort_order: row.get(6)?,
                tags: Vec::new(),
                display_order: row.get(7)?,
            })
        })?;

        let mut projects: Vec<Project> = project_iter.filter_map(|p| p.ok()).collect();

        drop(stmt);
        drop(conn);

        for project in &mut projects {
            project.tags = self.get_project_tags(&project.id).unwrap_or_default();
        }

        Ok(projects)
    }

    pub fn get_archived_projects(&self) -> Result<Vec<Project>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT id, name, category_id, created_at, updated_at, is_archived, sort_order, display_order FROM projects WHERE is_archived = 1 ORDER BY display_order ASC"
        )?;

        let project_iter = stmt.query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                category_id: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                is_archived: true,
                sort_order: row.get(6)?,
                tags: Vec::new(),
                display_order: row.get(7)?,
            })
        })?;

        let mut projects: Vec<Project> = project_iter.filter_map(|p| p.ok()).collect();
        drop(stmt);
        drop(conn);

        for project in &mut projects {
            project.tags = self.get_project_tags(&project.id).unwrap_or_default();
        }

        Ok(projects)
    }

    fn get_project_tags(&self, project_id: &str) -> Result<Vec<String>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT t.name FROM tags t JOIN project_tags pt ON t.id = pt.tag_id WHERE pt.project_id = ?"
        )?;

        let tag_iter = stmt.query_map([project_id], |row| {
            Ok(row.get(0)?)
        })?;

        Ok(tag_iter.filter_map(|t| t.ok()).collect())
    }

    pub fn create_project(&self, name: &str, category_id: Option<&str>, tags: Vec<String>) -> Result<Project> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        let max_order: i64 = conn.query_row(
            "SELECT COALESCE(MAX(display_order), -1) FROM projects WHERE is_archived = 0",
            [],
            |row| row.get(0),
        )?;

        let new_order = max_order + 1;

        conn.execute(
            "INSERT INTO projects (id, name, category_id, created_at, updated_at, is_archived, sort_order, display_order) VALUES (?, ?, ?, ?, ?, 0, 'created', ?)",
            params![id, name, category_id, now, now, new_order],
        )?;

        drop(conn);

        for tag in &tags {
            self.add_tag_to_project(&id, tag)?;
        }

        Ok(Project {
            id,
            name: name.to_string(),
            category_id: category_id.map(|s| s.to_string()),
            created_at: now,
            updated_at: now,
            is_archived: false,
            sort_order: "created".to_string(),
            tags,
            display_order: new_order,
        })
    }

    fn add_tag_to_project(&self, project_id: &str, tag_name: &str) -> Result<()> {
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

    pub fn update_project(&self, id: &str, name: &str, category_id: Option<&str>, tags: Vec<String>) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "UPDATE projects SET name = ?, category_id = ?, updated_at = ? WHERE id = ?",
            params![name, category_id, now, id],
        )?;

        conn.execute("DELETE FROM project_tags WHERE project_id = ?", [id])?;

        drop(conn);

        for tag in &tags {
            self.add_tag_to_project(id, tag)?;
        }

        Ok(())
    }

    pub fn archive_project(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let now = chrono::Utc::now().timestamp();
        conn.execute(
            "UPDATE projects SET is_archived = 1, updated_at = ? WHERE id = ?",
            params![now, id],
        )?;
        Ok(())
    }

    pub fn unarchive_project(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let now = chrono::Utc::now().timestamp();

        let max_order: i64 = conn.query_row(
            "SELECT COALESCE(MAX(display_order), -1) FROM projects WHERE is_archived = 0",
            [],
            |row| row.get(0),
        )?;

        let new_order = max_order + 1;

        conn.execute(
            "UPDATE projects SET is_archived = 0, updated_at = ?, display_order = ? WHERE id = ?",
            params![now, new_order, id],
        )?;
        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        conn.execute("DELETE FROM project_tags WHERE project_id = ?", [id])?;
        conn.execute("DELETE FROM sessions WHERE project_id = ?", [id])?;
        conn.execute("DELETE FROM projects WHERE id = ?", [id])?;
        Ok(())
    }

    pub fn reorder_projects(&self, project_ids: &[String]) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        for (index, id) in project_ids.iter().enumerate() {
            conn.execute(
                "UPDATE projects SET display_order = ? WHERE id = ?",
                params![index as i64, id],
            )?;
        }
        Ok(())
    }

    pub fn get_categories(&self) -> Result<Vec<Category>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare("SELECT id, name FROM categories ORDER BY name")?;

        let cat_iter = stmt.query_map([], |row| {
            Ok(Category {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })?;

        Ok(cat_iter.filter_map(|c| c.ok()).collect())
    }

    pub fn create_category(&self, name: &str) -> Result<Category> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute("INSERT INTO categories (id, name) VALUES (?, ?)", params![id, name])?;
        Ok(Category { id, name: name.to_string() })
    }

    pub fn create_session(&self, project_id: &str) -> Result<Session> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO sessions (id, project_id, started_at) VALUES (?, ?, ?)",
            params![id, project_id, now],
        )?;

        Ok(Session {
            id,
            project_id: project_id.to_string(),
            started_at: now,
            ended_at: None,
            minutes: None,
        })
    }

    pub fn end_session(&self, session_id: &str) -> Result<Option<i64>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let now = chrono::Utc::now().timestamp();

        let started_at: i64 = conn.query_row(
            "SELECT started_at FROM sessions WHERE id = ?",
            [session_id],
            |row| row.get(0),
        )?;

        let minutes = (now - started_at) / 60;
        let minutes = if minutes > 0 { minutes } else { 0 };

        conn.execute(
            "UPDATE sessions SET ended_at = ?, minutes = ? WHERE id = ?",
            params![now, minutes, session_id],
        )?;

        Ok(Some(minutes))
    }

    pub fn get_active_session(&self) -> Result<Option<Session>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT id, project_id, started_at, ended_at, minutes FROM sessions WHERE ended_at IS NULL"
        )?;

        let result = stmt.query_row([], |row| {
            Ok(Session {
                id: row.get(0)?,
                project_id: row.get(1)?,
                started_at: row.get(2)?,
                ended_at: row.get(3)?,
                minutes: row.get(4)?,
            })
        });

        match result {
            Ok(session) => Ok(Some(session)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn get_daily_record(&self, date: &str) -> Result<Option<DailyRecord>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT id, date, content, created_at, updated_at FROM daily_records WHERE date = ?"
        )?;

        let result = stmt.query_row([date], |row| {
            Ok(DailyRecord {
                id: row.get(0)?,
                date: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        });

        match result {
            Ok(record) => Ok(Some(record)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn create_or_update_daily_record(&self, date: &str, content: &str) -> Result<DailyRecord> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let now = chrono::Utc::now().timestamp();

        let existing = conn.query_row(
            "SELECT id FROM daily_records WHERE date = ?",
            [date],
            |row| row.get::<_, String>(0),
        );

        match existing {
            Ok(id) => {
                conn.execute(
                    "UPDATE daily_records SET content = ?, updated_at = ? WHERE id = ?",
                    params![content, now, id],
                )?;
                Ok(DailyRecord {
                    id,
                    date: date.to_string(),
                    content: Some(content.to_string()),
                    created_at: now,
                    updated_at: now,
                })
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                let id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO daily_records (id, date, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                    params![id, date, content, now, now],
                )?;
                Ok(DailyRecord {
                    id,
                    date: date.to_string(),
                    content: Some(content.to_string()),
                    created_at: now,
                    updated_at: now,
                })
            }
            Err(e) => Err(e),
        }
    }

    pub fn search_daily_records(&self, query: &str) -> Result<Vec<DailyRecord>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT id, date, content, created_at, updated_at FROM daily_records WHERE content LIKE ? ORDER BY date DESC"
        )?;

        let search_pattern = format!("%{}%", query);
        let records = stmt.query_map([&search_pattern], |row| {
            Ok(DailyRecord {
                id: row.get(0)?,
                date: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;

        Ok(records.filter_map(|r| r.ok()).collect())
    }

    pub fn get_statistics(&self, start_date: &str, end_date: &str) -> Result<Vec<ProjectStat>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT p.id, p.name, COALESCE(SUM(s.minutes), 0) as total_minutes
             FROM projects p
             LEFT JOIN sessions s ON p.id = s.project_id
             WHERE s.started_at >= ? AND s.started_at <= ? AND s.minutes IS NOT NULL
             GROUP BY p.id
             ORDER BY total_minutes DESC"
        )?;

        let stats = stmt.query_map(params![start_date, end_date], |row| {
            Ok(ProjectStat {
                project_id: row.get(0)?,
                project_name: row.get(1)?,
                total_minutes: row.get(2)?,
            })
        })?;

        Ok(stats.filter_map(|s| s.ok()).collect())
    }

    pub fn get_project_total_minutes(&self, project_id: &str) -> Result<i64> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let minutes: i64 = conn.query_row(
            "SELECT COALESCE(SUM(minutes), 0) FROM sessions WHERE project_id = ? AND minutes IS NOT NULL",
            [project_id],
            |row| row.get(0),
        )?;
        Ok(minutes)
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let result = conn.query_row(
            "SELECT value FROM settings WHERE key = ?",
            [key],
            |row| row.get(0),
        );

        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            params![key, value],
        )?;
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: String,
    pub project_id: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub minutes: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyRecord {
    pub id: String,
    pub date: String,
    pub content: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectStat {
    pub project_id: String,
    pub project_name: String,
    pub total_minutes: i64,
}