# Changelog

All notable changes to this project will be documented in this file.

## [0.2.6] - 2025-05-26

### Added
- **Keyboard shortcuts** - Ctrl+1~5 page navigation, Ctrl+N new project
- **Global shortcut** - Configurable show/hide shortcut (default Ctrl+Shift+Y)
- **IPC abstraction layer** - `src/ipc/index.ts` with type-safe wrappers for all backend commands
- **Heatmap calendar** - Stats calendar uses color intensity instead of text for focus duration
- **Design tokens** - Added `--surface`, `--shadow-sm`, `--accent-soft`, `--border-soft`, `--radius-*`
- **Focus indicators** - Added `:focus-visible` for keyboard navigation

### Fixed
- **Statistics date range bug** - `loadStatistics` now uses `calendarDate` instead of `Date.now()`
- **Archive button position** - Button moved from content area to item-right
- **Update check endpoint** - Fixed broken GitHub release URL in updater config
- **StatsBar timestamp type** - Changed `String(timestamp)` to `number` for backend `i64`
- **Settings dark mode animation** - Removed CSS transitions causing flicker on theme switch
- **Global shortcut handler** - Rust-side `with_handler` replaces unreliable JS API registration
- **npm native binding** - Restored missing `@tauri-apps/cli-linux-x64-gnu` binary
- **SQL injection** - `query_projects` changed from string interpolation to parameterized `?1`

### Refactored
- **db.rs modularization** - Single 849-line file split into `mod.rs` + 5 submodules
- **CSS migration** - ~120 lines of inline styles moved to CSS classes
- **useAutoSave** - Removed duplicate save logic in `useEffect`
- **loadTimerSession** - 4 sequential IPC calls parallelized with `Promise.all`
- **IPC abstraction** - All `invoke()` calls centralized in `src/ipc/index.ts`
- **NavLink** - JS hover handlers replaced with CSS `:hover`

### Performance
- **CurrentTimer** - `setInterval` replaced with `requestAnimationFrame`
- **CSS transitions removed** - Theme switch is instant (zero `transition` properties)
- **Calendar hover** - `transform: scale(1.03)` replaced with `outline` to avoid layout thrash

## [0.2.5] - 2025-05-25

### Added
- Project reordering through drag-and-drop
- Search functionality for daily records
- Auto-backup on first launch

### Fixed
- Browser restrictions (prevent devtools, zoom, navigation)
- Auto-save on exit

## [0.2.4] - 2025-05-24

### Added

- **StatsBar component** - Shows today's and this week's total focus time on the home page
- **Project sorting by total minutes** - New "累计时长" (Total Duration) sort option
- **Archived project total minutes** - Archive page now displays total focus time per project

### Refactored

- **Extracted utility functions** - `formatMinutes` moved to `src/utils/format.ts`
- **Error handling hook** - Created `useErrorToast` hook for unified error/success feedback
- **Auto-save hooks** - Created `useAutoSave` and `useKeyboardShortcut` hooks for Results.tsx refactoring
- **Project loading optimization** - `get_projects` now uses SQL JOIN to calculate `total_minutes`, eliminating N+1 query problem

### Performance

- **N+1 query fix** - Project list loading improved from O(n) queries to O(1)
- **loadProjects simplified** - No longer needs separate `get_project_total_minutes` calls per project

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