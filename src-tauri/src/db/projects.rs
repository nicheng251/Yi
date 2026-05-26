use rusqlite::{Result, params};
use crate::db::{Database, Project};

impl Database {
    pub fn get_projects(&self, include_archived: bool) -> Result<Vec<Project>> {
        self.query_projects(if include_archived { None } else { Some(false) })
    }

    pub fn get_archived_projects(&self) -> Result<Vec<Project>> {
        self.query_projects(Some(true))
    }

    fn query_projects(&self, is_archived_filter: Option<bool>) -> Result<Vec<Project>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let (where_clause, has_param): (&str, bool) = match is_archived_filter {
            None => ("", false),
            Some(true) => ("WHERE p.is_archived = ?1", true),
            Some(false) => ("WHERE p.is_archived = ?1", true),
        };
        let sql = format!(
            "SELECT p.id, p.name, p.category_id, p.created_at, p.updated_at, p.is_archived, p.sort_order, p.display_order, COALESCE(SUM(s.minutes), 0) as total_minutes, GROUP_CONCAT(t.name, ',') as tag_names
             FROM projects p
             LEFT JOIN sessions s ON p.id = s.project_id AND s.minutes IS NOT NULL
             LEFT JOIN project_tags pt ON p.id = pt.project_id
             LEFT JOIN tags t ON pt.tag_id = t.id
             {}
             GROUP BY p.id
             ORDER BY p.display_order ASC",
            where_clause
        );
        let mut stmt = conn.prepare(&sql)?;

        let archived_val: i32 = if is_archived_filter == Some(true) { 1 } else { 0 };
        let params: &[&dyn rusqlite::types::ToSql] = if has_param { &[&archived_val] } else { &[] };
        let project_iter = stmt.query_map(params, |row| {
            let tag_names: Option<String> = row.get(9)?;
            let tags: Vec<String> = tag_names
                .map(|s| s.split(',').filter(|t| !t.is_empty()).map(String::from).collect())
                .unwrap_or_default();
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                category_id: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                is_archived: row.get::<_, i32>(5)? == 1,
                sort_order: row.get(6)?,
                tags,
                display_order: row.get(7)?,
                total_minutes: row.get(8)?,
            })
        })?;

        Ok(project_iter.filter_map(|p| p.ok()).collect())
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
            total_minutes: 0,
        })
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

        let started_at: Option<i64> = conn.query_row(
            "SELECT started_at FROM sessions WHERE project_id = ? AND ended_at IS NULL",
            [id],
            |row| row.get(0),
        ).ok();

        if let Some(started) = started_at {
            let minutes = (now - started) / 60;
            conn.execute(
                "UPDATE sessions SET ended_at = ?, minutes = ? WHERE project_id = ? AND ended_at IS NULL",
                params![now, minutes.max(0), id],
            )?;
        }

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

        conn.execute(
            "UPDATE projects SET is_archived = 0, updated_at = ?, display_order = ? WHERE id = ?",
            params![now, max_order + 1, id],
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
        conn.execute("BEGIN TRANSACTION", [])?;
        for (index, id) in project_ids.iter().enumerate() {
            conn.execute(
                "UPDATE projects SET display_order = ? WHERE id = ?",
                params![index as i64, id],
            )?;
        }
        conn.execute("COMMIT", [])?;
        Ok(())
    }

    pub fn get_categories(&self) -> Result<Vec<super::Category>> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let mut stmt = conn.prepare("SELECT id, name FROM categories ORDER BY name")?;
        let cat_iter = stmt.query_map([], |row| {
            Ok(super::Category {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        })?;
        Ok(cat_iter.filter_map(|c| c.ok()).collect())
    }

    pub fn create_category(&self, name: &str) -> Result<super::Category> {
        let conn = self.conn.lock().expect("Database lock poisoned");
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute("INSERT INTO categories (id, name) VALUES (?, ?)", params![id, name])?;
        Ok(super::Category { id, name: name.to_string() })
    }
}
