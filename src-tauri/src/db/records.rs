use rusqlite::{Result, params};
use crate::db::{Database, DailyRecord};

impl Database {
    pub fn get_daily_record(&self, date: &str) -> Result<Option<DailyRecord>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT id, date, content, created_at, updated_at FROM daily_records WHERE date = ?"
        )?;

        let mut rows = stmt.query_map([date], |row| {
            Ok(DailyRecord {
                id: row.get(0)?,
                date: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;

        match rows.next() {
            Some(Ok(record)) => Ok(Some(record)),
            _ => Ok(None),
        }
    }

    pub fn get_daily_records_for_month(&self, year: i32, month: i32) -> Result<Vec<DailyRecord>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let start = format!("{}-{:02}-01", year, month);
        let end = if month == 12 {
            format!("{}-01-01", year + 1)
        } else {
            format!("{}-{:02}-01", year, month + 1)
        };

        let mut stmt = conn.prepare(
            "SELECT id, date, content, created_at, updated_at FROM daily_records WHERE date >= ? AND date < ? ORDER BY date"
        )?;

        let records = stmt.query_map(params![start, end], |row| {
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

    pub fn save_daily_record(&self, date: &str, content: &str) -> Result<DailyRecord> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let now = chrono::Utc::now().timestamp();
        let id = uuid::Uuid::new_v4().to_string();

        let existing: Option<String> = conn.query_row(
            "SELECT id FROM daily_records WHERE date = ?",
            [date],
            |row| row.get(0),
        ).ok();

        match existing {
            Some(record_id) => {
                conn.execute(
                    "UPDATE daily_records SET content = ?, updated_at = ? WHERE id = ?",
                    params![content, now, record_id],
                )?;
                Ok(DailyRecord {
                    id: record_id,
                    date: date.to_string(),
                    content: Some(content.to_string()),
                    created_at: now,
                    updated_at: now,
                })
            }
            None => {
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
        }
    }

    pub fn get_all_daily_records(&self) -> Result<Vec<DailyRecord>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT id, date, content, created_at, updated_at FROM daily_records ORDER BY date"
        )?;
        let records = stmt.query_map([], |row| {
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

    pub fn search_records(&self, query: &str) -> Result<Vec<DailyRecord>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let like_pattern = format!("%{}%", query);

        let mut stmt = conn.prepare(
            "SELECT id, date, content, created_at, updated_at FROM daily_records WHERE content LIKE ? ORDER BY date DESC"
        )?;

        let records = stmt.query_map([&like_pattern], |row| {
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
}
