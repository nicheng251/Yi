# Yi — REASONIX.md

Auto-pinned session context. Generated from verified file contents — do not edit by hand.

## Stack

- **Tauri 2.x** — Rust backend with tray-icon, image-png, single-instance features
- **React 18 + TypeScript** — Vite 6 bundler, `@vitejs/plugin-react`
- **Zustand 5** — state management in `src/store/`
- **React Router 7** — client-side routing, pages in `src/pages/`
- **SQLite** — via rusqlite (bundled), all DB ops in `src-tauri/src/db.rs`
- **Playwright** — E2E tests in `tests/e2e/` (commented out in CI)
- **date-fns** — date formatting; **@dnd-kit** — drag-and-drop reordering

## Layout

| Path | Contents |
|---|---|
| `src/` | React frontend: pages, components, hooks, store, utils, types, styles |
| `src-tauri/` | Rust backend: `main.rs` (~30 commands + tray), `db.rs` (7 tables), `tauri.conf.json` |
| `tests/e2e/` | Playwright E2E specs (4 files: archive, import-export, project-timer, settings) |
| `.github/workflows/` | CI (Rust test + TS typecheck), Release (build + GitHub release) |

## Commands

| Action | Command |
|---|---|
| Dev server | `npm run dev` (Vite on :1420) |
| Full Tauri dev | `npm run tauri dev` |
| Frontend build | `npm run build` (tsc + vite build) |
| Rust check | `cd src-tauri && cargo check` |
| Rust test | `cd src-tauri && cargo test` (4 unit tests in db.rs) |
| TS typecheck | `npx tsc --noEmit` |
| E2E test | `npx playwright test` |
| Prod build | `npm run tauri build` |

## Conventions

- **Named exports only** — all React components, hooks, stores use named exports (no `export default`)
- **CSS theming via variables** — light/dark mode toggled by `[data-theme="dark"]` on `<html>`, variables defined in `:root` / `[data-theme="dark"]` in `src/styles/global.css`
- **Type alignment** — TS interfaces in `src/types/index.ts` must match Rust structs in `db.rs` (e.g. `Category` has no `created_at` in Rust). `CommandResponse<T>` maps `Option<T>` → `T | null`
- **Version sync** — version string lives in `package.json`, `Cargo.toml`, and `tauri.conf.json` — bump all three
- **Capability permissions** — every plugin needs an entry in `src-tauri/capabilities/default.json`. Missing capability = silent IPC failure. Current: `core:default`, `updater:default`, `autostart:default`

## Watch out for

- **Close = hide to tray**, not quit. `quit_app` command dispatches `tauri-quit` event then calls `app.exit(0)`
- **Active sessions** have `ended_at IS NULL`. `start_session` auto-ends any existing session before creating a new one
- **Updater** (`check()`) only resolves after a GitHub Release — dev mode always fails (expected)
- **Autostart** must use `Builder::new().app_name("Yi").build()` — never `MacosLauncher::LaunchAgent` (macOS-only, silently fails on Windows)
- **README version badge** says 0.2.2 but `package.json`, `Cargo.toml`, `tauri.conf.json` all say 0.2.4 — badge is stale
- **Data import** closes active sessions, clears all data, imports in a single transaction
- **LIKE queries** must escape `%` and `_` wildcards (see `search_daily_records` in db.rs)
