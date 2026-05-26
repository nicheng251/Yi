use rusqlite::{Result, params};
use crate::db::Database;

impl Database {
    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?")?;

        let mut rows = stmt.query_map([key], |row| {
            row.get::<_, String>(0)
        })?;

        match rows.next() {
            Some(Ok(value)) => Ok(Some(value)),
            _ => Ok(None),
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
