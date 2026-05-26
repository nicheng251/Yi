# Project Instructions

This file provides context for AI assistants working on this project.

## Project Type: Tauri v2 + React + Rust

### Commands
- Install: `npm install`
- Dev (Tauri): `npm run tauri dev`
- Dev (Vite only): `npm run dev`
- TypeScript check: `npx tsc --noEmit`
- Rust check: `cd src-tauri && cargo check`
- Build: `npm run tauri build`
- Test: `npm test`

### Framework: Tauri v2 + Vite + React 18

### Key Architecture
- **Frontend**: React + Vite + TypeScript + Zustand
- **Backend**: Rust + SQLite (rusqlite)
- **IPC**: Centralized in `src/ipc/index.ts` — all `invoke()` calls go through typed wrappers
- **DB**: `src-tauri/src/db/` — modularized (projects, sessions, records, settings, import_export)
- **State**: Zustand stores in `src/store/`
- **Routing**: react-router-dom (client-side)

### Keyboard Shortcuts
- `Ctrl+1~5`: Page navigation
- `Ctrl+N`: New project (home)
- `Ctrl+Shift+Y`: Global show/hide (configurable in Settings)

### Design Tokens
CSS variables in `src/styles/global.css`:
- `--surface`, `--shadow-sm/md`, `--accent-soft`, `--border-soft`
- `--radius-sm/md/lg`
- No CSS `transition` properties (instant theme switching)

### Version Control
This project uses Git. See `.gitignore` for excluded files.

### Agent Guidance
- **Never edit**: `src-tauri/target/`, `node_modules/`, `dist/`, `*.lock`
- **Read-only surface**: `src-tauri/gen/`, `src-tauri/icons/`
- **Always test with**: `npx tsc --noEmit && cd src-tauri && cargo check`
- **Style rule**: Prefer CSS classes over inline styles; no `transition` properties

## Architecture

### Entry Points
- `src/main.tsx` — React app bootstrap
- `src/App.tsx` — Router + layout + global shortcuts
- `src-tauri/src/main.rs` — Tauri app setup + IPC command handlers

### Key Modules
- `src/ipc/` — IPC abstraction layer
- `src/store/` — Zustand state stores
- `src/pages/` — Page components (Home, Results, Archive, Statistics, Settings)
- `src/components/` — Reusable UI components
- `src/hooks/` — Custom React hooks
- `src-tauri/src/db/` — Database access layer (6 modules)

### Data Flow
User action → React component → `ipc.*()` → Tauri `invoke()` → Rust command → SQLite → Response → Zustand state update → UI re-render
