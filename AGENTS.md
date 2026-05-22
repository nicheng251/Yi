# Yi - Focus Productivity Tool

## Build Commands

```bash
cd yi
npm run tauri dev      # Dev mode (frontend + backend)
npm run tauri build    # Production build
npm run build          # Frontend only (tsc + vite)
cargo check            # Rust only (from src-tauri/)
```

## Project Structure

```
Yi/
├── yi/                 # Main project (git repo root)
│   ├── src/            # React frontend
│   │   ├── pages/      # Home, Results, Archive, Statistics, Settings
│   │   ├── store/      # Zustand stores (timer.ts, etc.)
│   │   ├── components/ # Reusable UI components
│   │   └── hooks/      # Custom React hooks
│   └── src-tauri/     # Rust backend
│       └── src/
│           ├── main.rs # Entry point + Tauri commands + tray setup
│           └── db.rs   # SQLite database operations
└── AGENTS.md           # This file
```

## Architecture

- **Framework**: Tauri 2.x + React 18 + TypeScript
- **Database**: SQLite (rusqlite with bundled)
- **State**: Zustand for frontend state management

## Critical Files

| File | Purpose |
|------|---------|
| `src/pages/Results.tsx` | Mounts `tauri-quit` event listener for save-on-quit |
| `src/store/timer.ts` | activeSession, startTimer, stopTimer |
| `src-tauri/src/main.rs` | Tauri commands, tray setup, window events |
| `src-tauri/src/db.rs` | All database operations |

## Important Behaviors

| Command | Behavior |
|---------|----------|
| `start_session` | Auto-ends any existing session before creating new |
| `archive_project` | Ends active session for project, then sets is_archived=1 |
| `import_data` | Closes active sessions (calculates ended_at, minutes), then clears all data and imports |
| `quit_app` | Calls app.exit(0) after dispatching tauri-quit event |
| Close window | Hides to tray instead of closing |

## Data Model

- **sessions**: Active = `ended_at IS NULL`
- **projects**: `display_order` field for sorting
- **daily_records**: Date-keyed achievement records
- **tags**: Shared tag definitions, cleaned up with `clear_all_data`

## TypeScript Config

- Strict mode, noUnusedLocals, noUnusedParameters all enabled

## Refactoring Notes (v0.1.2)

- `settings.ts`: Uses proper `CommandResponse<string>` casting instead of `as any`
- `search_daily_records`: Escapes `%` and `_` wildcards to prevent unexpected LIKE matches
- `clear_all_data`: Now properly cleans up `project_tags` and `tags` tables
