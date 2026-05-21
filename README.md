# Yi - Focus Productivity Tool

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-green.svg)

Yi is a desktop productivity application designed for long-term focus tracking. It helps you manage projects with dedicated timers and record daily achievements in a timeline format.

## Features

### 🕐 Timer Tracking
- Multiple projects with independent timers
- One-tap start/stop
- Session history logging
- Minimum tracking unit: 1 minute

### 📅 Daily Records
- Calendar-based view
- Write achievements for any past date
- Full-text search across all records

### 📊 Statistics
- View focus time by day/week/month/year
- Project-wise time distribution
- Compare with previous period

### 📁 Project Management
- Create/archive/delete projects
- Sort by creation time, last activity, or name
- Archive management with restore capability

### ⚙️ Settings
- Dark/Light theme
- Auto-start on system boot
- Data export (JSON)
- Automatic backup on first launch

## Tech Stack

- **Framework**: [Tauri 2.x](https://v2.tauri.app/)
- **Frontend**: React + TypeScript + Vite
- **Database**: SQLite (bundled)
- **State Management**: Zustand
- **Styling**: CSS Variables (no external UI library)

## Getting Started

### Prerequisites

- Node.js 18+
- Rust 1.70+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/yi.git
cd yi

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

The executable will be in `src-tauri/target/release/` (or `target/debug/` for debug build).

## Project Structure

```
yi/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── pages/              # Page components
│   │   ├── Home.tsx        # Project list + timer
│   │   ├── Results.tsx     # Daily records + calendar
│   │   ├── Archive.tsx     # Archived projects
│   │   ├── Statistics.tsx  # Focus statistics
│   │   └── Settings.tsx    # App settings
│   ├── store/              # Zustand stores
│   └── styles/             # Global styles
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs          # Main entry + commands
│   │   └── db.rs            # Database operations
│   ├── Cargo.toml
│   └── tauri.conf.json
├── SPEC.md                 # Design specification
└── package.json
```

## Data Storage

- **Database**: `~/.local/share/yi/yi.db` (Linux), `%APPDATA%/yi/yi.db` (Windows)
- **Attachments**: `~/.local/share/yi/attachments/`
- **Logs**: `~/.local/share/yi/logs/`
- **Backups**: `~/.local/share/yi/backups/` (keeps last 7 days)

## Keyboard Shortcuts

Currently not implemented. Keyboard shortcuts will be added in future versions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is MIT licensed.