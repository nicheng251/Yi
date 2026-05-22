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
| `archive_project` | Sets is_archived=1, does NOT end active session (BUG) |
| `import_data` | Clears all data then imports (BUG: active sessions orphaned) |
| `quit_app` | Calls app.exit(0) |
| Close window | Hides to tray instead of closing |

## Data Model

- **sessions**: Active = `ended_at IS NULL`
- **projects**: `display_order` field for sorting
- **daily_records**: Date-keyed achievement records

## TypeScript Config

- Strict mode, noUnusedLocals, noUnusedParameters all enabled

## Known Bugs (v0.1.1)

1. **Archive doesn't stop timer** - archiving project with active session leaves dangling session
2. **Import orphans active sessions** - active sessions imported but frontend doesn't detect
3. **Tray quit unreliable** - if Results.tsx not mounted, app never exits
