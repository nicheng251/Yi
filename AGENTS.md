# Yi - Focus Productivity Tool

## Build Commands

```bash
cd yi
npm run tauri dev      # Dev mode (frontend + backend)
npm run tauri build    # Production build
npm run build          # Frontend only (tsc + vite)
cd src-tauri && cargo test    # Rust tests
cd yi && npx tsc --noEmit     # TypeScript check
```

## Project Structure

```
Yi/
├── yi/                 # Main project (git repo root)
│   ├── src/            # React frontend
│   │   ├── pages/      # Home, Results, Archive, Statistics, Settings
│   │   ├── store/      # Zustand stores (timer.ts, projects.ts, settings.ts)
│   │   ├── components/ # UI components (IconButton, Toast, StatsBar, etc.)
│   │   ├── hooks/      # Custom React hooks (useAutoSave, useErrorToast)
│   │   ├── types/      # TypeScript interfaces (align with Rust types!)
│   │   └── utils/      # Utility functions (format.ts)
│   └── src-tauri/      # Rust backend
│       └── src/
│           ├── main.rs # Entry point + Tauri commands + tray setup
│           └── db.rs   # SQLite database operations + tests
└── AGENTS.md           # This file
```

## Architecture

- **Framework**: Tauri 2.x + React 18 + TypeScript
- **Database**: SQLite (rusqlite with bundled)
- **State**: Zustand for frontend state management

## Testing

| Test | Command |
|------|---------|
| Rust unit tests | `cd src-tauri && cargo test` (4 tests currently) |
| TypeScript check | `npx tsc --noEmit` |
| Rust compilation | `cd src-tauri && cargo check` |
| E2E (Playwright) | `npx playwright test` (requires browser install) |

## Critical Files

| File | Purpose |
|------|---------|
| `src/pages/Results.tsx` | Mounts `tauri-quit` event listener for save-on-quit |
| `src/store/timer.ts` | activeSession, startTimer, stopTimer |
| `src/pages/Settings.tsx` | Uses `invoke("get_app_version")` for dynamic version display |
| `src-tauri/src/main.rs` | Tauri commands, tray setup, window events, get_app_version |
| `src-tauri/src/db.rs` | All database operations, SQL queries |

## Important Behaviors

| Command | Behavior |
|---------|----------|
| `start_session` | Auto-ends any existing session before creating new |
| `archive_project` | Ends active session for project, then sets is_archived=1 |
| `import_data` | Closes active sessions (calculates ended_at, minutes), then clears all data and imports |
| `quit_app` | Calls app.exit(0) after dispatching tauri-quit event |
| Close window | Hides to tray instead of closing |
| `get_app_version` | Returns `env!("CARGO_PKG_VERSION")` from Rust |

## Data Model

- **sessions**: Active = `ended_at IS NULL`
- **projects**: `display_order` field for sorting; tags via `project_tags` junction table
- **daily_records**: Date-keyed achievement records
- **tags**: Shared tag definitions, cleaned up with `clear_all_data`

## TypeScript/Rust Type Alignment

**Critical**: TypeScript types in `src/types/index.ts` must match Rust structs in `src-tauri/src/db.rs`

| Type | Important Notes |
|------|-----------------|
| `Category` | Rust has NO `created_at` field - do not add to TS |
| `Session` | Rust uses `Option<i64>` for nullable fields |
| `CommandResponse<T>` | TS uses `data: T \| null` to match Rust `Option<T>` |

## Performance Notes

- `get_projects()` and `get_archived_projects()` use GROUP_CONCAT JOIN to fetch tags in single query (avoids N+1)
- StatsBar shows today/week totals via `get_project_stats()`
- LIKE queries escape `%` and `_` wildcards (see `search_daily_records`)

## Session Management

- Timer state persists via Tauri settings (`active_session_id`, `active_session_project`, `active_session_start`)
- `loadTimerSession` validates saved session exists in DB against `get_active_session()`
- Multi-tab sync: storage event listener + `timer_session_changed` localStorage events

## CI

- `.github/workflows/ci.yml` runs: Rust tests, TypeScript check
- Tauri system dependencies (`libwebkit2gtk-4.1-dev`, etc.) required on Linux
- E2E tests commented out (browser installation fails in CI)

## Version

Current: v0.2.2 (bumped in `src-tauri/tauri.conf.json` and `package.json`)