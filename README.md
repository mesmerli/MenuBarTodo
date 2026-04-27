# MenuBar Todo 📝

[![Electron](https://img.shields.io/badge/Electron-41.3.0-blue.svg)](https://electronjs.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)

**MenuBar Todo** is a minimalist, high-performance task management application designed for developers and professionals who value efficiency. It lives in your Windows system tray, allowing you to capture ideas and tasks instantly without breaking your flow.

---

## ✨ Key Features

- 🚀 **Instant Access**: Toggle the window instantly with the global shortcut `Ctrl + Shift + Space`.
- 🎙️ **Offline Voice Input**: Fully offline speech recognition powered by **Vosk-WASM** — no cloud services, no API keys, complete privacy.
- 📅 **Multi-dimensional View**: Organize and view tasks across "Day, Week, and Month" dimensions.
- 🎨 **Modern Aesthetics**: Neon-dark aesthetic with glassmorphism effects and smooth micro-animations.
- 🛠️ **Advanced Management**: Dedicated management window with real-time search, inline editing, and multi-column sorting.
- 📥 **Smart Archive System**: 
  - **Auto-Archive**: Completed tasks are automatically moved to the archive after a set duration (1 day for Daily, 7 days for Weekly, 30 days for Monthly tasks).
  - **Dedicated Viewer**: Manage archived tasks with search, filtering, and permanent deletion.
  - **Undo Support**: Accidents happen—restore deleted or archived tasks with one click.
- 🔗 **Clickable Resources**: URLs in task descriptions are automatically detected and clickable, opening directly in your default browser.
- 🛡️ **Privacy Focused**: 100% local data storage. No servers, no tracking, complete privacy.
- 🌐 **Real-time Sync**: Multi-language support (English / 繁體中文) with instant synchronization across all windows.

---

## ⌨️ Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **Show / Hide App** | `Ctrl + Shift + Space` |
| **Create Task** | `Enter` (inside input field) |
| **Voice Input** | 🎤 button (click to start/stop) |
| **Cancel / Hide** | `Esc` |

---

## 🛠️ Development & Installation

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

### 2. Setup
```bash
git clone https://github.com/mesmerli/MenuBarTodo.git
cd MenuBarTodo
npm install
```

### 3. Voice Model Setup
Download Vosk models and place them in the `models/` directory, then package them:
```bash
# Place model files in models/en/ and models/zh/
npm run pack-models
```

### 4. Run in Development
```bash
npm start
```

### 5. Build Production Executable
```bash
# Build and launch
npm run dist-run

# Build only (portable + installer)
npm run dist
```

### 6. Run E2E Tests
This project uses Playwright for automated testing:
```bash
npm test
```

---

## 📦 Tech Stack

- **Core**: Electron, Node.js
- **Frontend**: HTML5, Vanilla CSS, JavaScript
- **Voice Recognition**: Vosk-WASM (offline, WebAssembly-based)
- **Testing**: Playwright (26 E2E tests)
- **Bundling**: Electron Builder

---

## 📜 Changelog

### [1.2.0] - 2026-04-28
- **Added**: Offline voice recognition via **Vosk-WASM** — no internet or API keys required.
- **Added**: Custom `local-model://` protocol for secure model file serving within Electron.
- **Added**: Pre-built `tar.gz` model packaging with `npm run pack-models` script.
- **Added**: Application debug logging to `app-debug.log` for troubleshooting.
- **Added**: DevTools access from system tray menu (detached mode).
- **Added**: Red pulsing glow animation on microphone button during recording.
- **Improved**: Expanded E2E test suite from 4 to 26 tests covering all major features.
- **Removed**: Deprecated `webkitSpeechRecognition` / Web Speech API dependency.

### [1.1.0] - 2026-04-27
- **Added**: New Archive Window with dimension tabs, search, and undo functionality.
- **Added**: Intelligent Auto-Archiving logic (1/7/30 days based on task dimension).
- **Added**: Automated detection of clickable URLs in task descriptions.
- **Added**: Real-time language synchronization across all application windows.
- **Added**: New visual icons for Search (Magnifying Glass) and Add Task (Pencil).
- **Improved**: Redesigned Archive icons (Open Box lid for entry, Box with arrow for action).
- **Improved**: Reorganized header action layout in the Task Management window.
- **Fixed**: Inconsistent language state when switching locales in secondary windows.

### [1.0.0] - 2026-04-24
- Initial release.
- Tray-based task management with global shortcut support.
- Multi-dimensional task views (Day, Week, Month).
- Voice input support with speech recognition.
- Dark-mode neon aesthetic.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

---

**Developed with ❤️ by [mesmerli](https://github.com/mesmerli)**

