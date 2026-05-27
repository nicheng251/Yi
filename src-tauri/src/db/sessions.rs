use rusqlite::{Result, params};
use chrono::TimeZone;
use crate::db::{Database, Session};

impl Database {
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

    pub fn start_new_session(&self, project_id: &str) -> Result<Session> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let now = chrono::Utc::now().timestamp();

        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?)",
            [project_id],
            |row| row.get(0),
        )?;

        if !exists {
            return Err(rusqlite::Error::InvalidParameterName(project_id.to_string()));
        }

        conn.execute("BEGIN TRANSACTION", [])?;

        conn.execute(
            "UPDATE sessions SET ended_at = ?, minutes = ? WHERE project_id = ? AND ended_at IS NULL",
            params![now, 0i64, project_id],
        ).ok();

        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO sessions (id, project_id, started_at) VALUES (?, ?, ?)",
            params![id, project_id, now],
        )?;

        conn.execute("COMMIT", [])?;

        Ok(Session {
            id,
            project_id: project_id.to_string(),
            started_at: now,
            ended_at: None,
            minutes: None,
        })
    }

    pub fn get_active_session(&self) -> Result<Option<Session>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT id, project_id, started_at, ended_at, minutes FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1"
        )?;

        let mut rows = stmt.query_map([], |row| {
            Ok(Session {
                id: row.get(0)?,
                project_id: row.get(1)?,
                started_at: row.get(2)?,
                ended_at: row.get(3)?,
                minutes: row.get(4)?,
            })
        })?;

        match rows.next() {
            Some(Ok(session)) => Ok(Some(session)),
            _ => Ok(None),
        }
    }

    pub fn get_project_total_minutes(&self, project_id: &str) -> Result<i64> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        conn.query_row(
            "SELECT COALESCE(SUM(minutes), 0) FROM sessions WHERE project_id = ?",
            [project_id],
            |row| row.get(0),
        )
    }

    pub fn get_all_sessions(&self) -> Result<Vec<super::Session>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT id, project_id, started_at, ended_at, minutes FROM sessions ORDER BY started_at"
        )?;
        let sessions = stmt.query_map([], |row| {
            Ok(super::Session {
                id: row.get(0)?,
                project_id: row.get(1)?,
                started_at: row.get(2)?,
                ended_at: row.get(3)?,
                minutes: row.get(4)?,
            })
        })?;
        Ok(sessions.filter_map(|s| s.ok()).collect())
    }

    pub fn get_statistics(&self, start_date: i64, end_date: i64) -> Result<Vec<super::ProjectStat>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare(
            "SELECT p.id, p.name, COALESCE(SUM(s.minutes), 0) AS total_minutes
             FROM projects p
             LEFT JOIN sessions s ON p.id = s.project_id
                 AND s.started_at >= ?1 AND s.started_at < ?2
                 AND s.minutes IS NOT NULL
             GROUP BY p.id
             ORDER BY total_minutes DESC"
        )?;
        let stats = stmt.query_map(params![start_date, end_date], |row| {
            Ok(super::ProjectStat {
                project_id: row.get(0)?,
                project_name: row.get(1)?,
                total_minutes: row.get(2)?,
            })
        })?;
        Ok(stats.filter_map(|s| s.ok()).collect())
    }

    pub fn get_monthly_sessions(&self, year: i32, month: i32) -> Result<Vec<super::DailySessionStat>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let m = month as u32;
        let start = chrono::Utc.with_ymd_and_hms(year, m, 1, 0, 0, 0).unwrap().timestamp();
        let end = if m == 12 {
            chrono::Utc.with_ymd_and_hms(year + 1, 1, 1, 0, 0, 0).unwrap().timestamp()
        } else {
            chrono::Utc.with_ymd_and_hms(year, m + 1, 1, 0, 0, 0).unwrap().timestamp()
        };

        let mut stmt = conn.prepare(
            "SELECT date(s.started_at, 'unixepoch') as session_date, p.name, COALESCE(SUM(s.minutes), 0)
             FROM sessions s
             JOIN projects p ON s.project_id = p.id
             WHERE s.started_at >= ? AND s.started_at < ? AND s.minutes IS NOT NULL
             GROUP BY session_date, p.name
             ORDER BY session_date"
        )?;

        let stats = stmt.query_map(params![start, end], |row| {
            Ok(super::DailySessionStat {
                date: row.get(0)?,
                project_name: row.get(1)?,
                minutes: row.get(2)?,
            })
        })?;

        Ok(stats.filter_map(|s| s.ok()).collect())
    }
}
