# Yi - Focus Productivity Tool

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.4-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-green.svg" alt="Platform">
  <img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License">
</p>

<p align="center">
  <img src="src-tauri/icons/icon.png" alt="Yi App Icon" width="256">
</p>

<p align="center">
  <strong>Yi</strong> is a desktop productivity application designed for long-term focus tracking.
  Manage projects with dedicated timers and record your daily achievements in a timeline format.
</p>

<p align="center">
  <img src="screenshot.png" alt="Yi Screenshot" width="800">
</p>

---

## ✨ Features

### 🕐 Timer Tracking
- Multiple projects with independent timers
- One-tap start/stop from project list
- Session history automatically logged
- Minimum tracking unit: 1 minute
- Video player-style play/stop buttons

### 📅 Daily Records
- Calendar-based view for browsing achievements
- Write and edit achievements for any past date
- Full-text search across all records
- **Auto-save when leaving day view or exiting app**

### 📊 Statistics
- View focus time by day, week, month, or year
- Project-wise time distribution
- Period-over-period comparison
- Intuitive calendar navigation

### 📁 Project Management
- Create, archive, and delete projects
- Sort projects by creation time, last activity, or name
- Archive management with restore capability
- One-click project switching with automatic timer transfer
- Drag-and-drop project reordering

### 🔒 Privacy & Security
- Browser restrictions to prevent accidental navigation
- No browser devtools access
- Zoom controls disabled
- Clean desktop experience

### ⚙️ Settings
- Dark/Light theme toggle
- Auto-start on system boot
- Export all data as JSON
- Import data from backup
- Automatic backup on first launch (keeps last 7 days)

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18+ |
| Rust | 1.70+ |
| npm | 9+ |

### Installation

```bash
# Clone the repository
git clone https://github.com/nicheng251/Yi.git
cd Yi

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Building for Production

```bash
# Build release binaries
npm run tauri build

# Built artifacts are located at:
# - Linux:    src-tauri/target/release/bundle/
# - macOS:    src-tauri/target/release/bundle/
# - Windows:  src-tauri/target/release/bundle/
```

### Running the Built Application

```bash
# Linux
./src-tauri/target/release/yi

# Or install via package manager
sudo dpkg -i src-tauri/target/release/bundle/deb/Yi_0.2.4_amd64.deb  # Ubuntu/Debian
sudo rpm -i src-tauri/target/release/bundle/rpm/Yi-0.2.4-1.x86_64.rpm # Fedora/RHEL
```

---

## 🏗️ Project Structure

```
Yi/
├── src/                          # React frontend (TypeScript)
│   ├── components/               # Reusable UI components
│   │   ├── IconButton.tsx        #   Play/Stop buttons
│   │   ├── SortableItemBase.tsx #   Drag-drop base component
│   │   ├── Toggle.tsx           #   Toggle switch component
│   │   └── ...
│   ├── pages/                    # Page components
│   │   ├── Home.tsx             #   Project list + timer
│   │   ├── Results.tsx          #   Daily records + calendar
│   │   ├── Archive.tsx          #   Archived projects
│   │   ├── Statistics.tsx       #   Focus statistics
│   │   └── Settings.tsx         #   App settings
│   ├── hooks/                    # Custom React hooks
│   │   ├── useBrowserRestrictions.ts
│   │   ├── useDragReorder.ts
│   │   └── ...
│   ├── store/                    # Zustand state management
│   └── styles/                   # CSS files
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs              #   Entry point + Tauri commands
│   │   └── db.rs               #   SQLite database operations
│   ├── icons/                    # App icons
│   ├── capabilities/             # Tauri permission config
│   ├── Cargo.toml
│   └── tauri.conf.json
├── SPEC.md                       # Detailed design specification
└── package.json
```

---

## 📁 Data Storage

All user data is stored locally. No cloud sync required.

| Data Type | Location (Linux) | Location (Windows) |
|-----------|------------------|-------------------|
| Database | `~/.local/share/yi/yi.db` | `%APPDATA%/yi/yi.db` |
| Attachments | `~/.local/share/yi/attachments/` | `%APPDATA%/yi/attachments/` |
| Logs | `~/.local/share/yi/logs/` | `%APPDATA%/yi/logs/` |
| Backups | `~/.local/share/yi/backups/` | `%APPDATA%/yi/backups/` |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Tauri 2.x](https://v2.tauri.app/) |
| Frontend | React 18 + TypeScript + Vite |
| Database | SQLite (bundled via rusqlite) |
| State | [Zustand](https://zustand-demo.pmnd.rs/) |
| Styling | CSS Variables (no external UI library) |

---

## 📝 License

This project is [MIT](LICENSE) licensed.

---

<p align="center">
  Made with ❤️ using Tauri
</p>
