# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2025-05-22

### Fixed

- **BUG1: Archive doesn't stop timer** - Archiving a project now properly ends any active timer session for that project
- **BUG2: Import orphans active sessions** - Importing data now closes active sessions before import (calculating ended_at and minutes), and frontend correctly clears timer state after import
- **BUG3: Tray quit doesn't close app** - Tray quit menu item now calls `app.exit(0)` directly after dispatching the save event
- **Export data incomplete** - Export now includes sessions and daily_records in addition to projects and categories
- **Import creates duplicates** - Import now clears existing data before importing (via `clear_all_data`)

### Refactored

- **Type safety** - Replaced `as any` casts in `settings.ts` with proper `CommandResponse<string>` typing
- **Data integrity** - `clear_all_data()` now properly cleans up `project_tags` and `tags` tables
- **SQL security** - `search_daily_records()` now properly escapes `%` and `_` wildcard characters in LIKE queries

### Added

- `get_active_session_for_project()` helper function in db.rs
- `quit_app` Tauri command for tray quit functionality

## [0.1.0] - 2024-12-01

### Added

- Initial release with project timer tracking
- Daily achievement records with calendar view
- Archive and restore projects
- Statistics view (day/week/month/year)
- Dark/light theme support
- Auto-start on system boot
- Data export/import (JSON format)
- Auto-backup on first launch