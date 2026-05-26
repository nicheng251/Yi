use rusqlite::{Result, params};
use crate::db::Database;

impl Database {
    pub fn import_project(&self, id: &str, name: &str, category_id: Option<&str>, tags: Vec<String>, is_archived: bool, display_order: i64) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let now = chrono::Utc::now().timestamp();

        conn.execute(
            "INSERT INTO projects (id, name, category_id, created_at, updated_at, is_archived, sort_order, display_order) VALUES (?, ?, ?, ?, ?, ?, 'imported', ?)",
            params![id, name, category_id, now, now, is_archived as i32, display_order],
        )?;

        drop(conn);

        for tag in &tags {
            self.add_tag_to_project(id, tag)?;
        }

        Ok(())
    }

    pub fn import_session(&self, id: &str, project_id: &str, started_at: i64, ended_at: Option<i64>, minutes: Option<i64>) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        conn.execute(
            "INSERT INTO sessions (id, project_id, started_at, ended_at, minutes) VALUES (?, ?, ?, ?, ?)",
            params![id, project_id, started_at, ended_at, minutes],
        )?;
        Ok(())
    }

    pub fn import_daily_record(&self, id: &str, date: &str, content: Option<&str>, created_at: i64, updated_at: i64) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        conn.execute(
            "INSERT INTO daily_records (id, date, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            params![id, date, content, created_at, updated_at],
        )?;
        Ok(())
    }

    pub fn clear_all_data(&self) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        conn.execute("DELETE FROM project_tags", [])?;
        conn.execute("DELETE FROM tags", [])?;
        conn.execute("DELETE FROM sessions", [])?;
        conn.execute("DELETE FROM projects", [])?;
        conn.execute("DELETE FROM daily_records", [])?;
        conn.execute("DELETE FROM categories", [])?;
        conn.execute("DELETE FROM settings", [])?;
        Ok(())
    }

    pub fn begin_transaction(&self) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        conn.execute("BEGIN TRANSACTION", [])?;
        Ok(())
    }

    pub fn commit_transaction(&self) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        conn.execute("COMMIT", [])?;
        Ok(())
    }

    pub fn rollback_transaction(&self) -> Result<()> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        conn.execute("ROLLBACK", [])?;
        Ok(())
    }
}
