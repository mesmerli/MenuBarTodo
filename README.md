# MenuBar Todo 📝

[![Electron](https://img.shields.io/badge/Electron-41.3.0-blue.svg)](https://electronjs.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)

**MenuBar Todo** is a minimalist, high-performance task management application designed for developers and professionals who value efficiency. It lives in your Windows system tray, allowing you to capture ideas and tasks instantly without breaking your flow.

---

## ✨ Key Features

- 🚀 **Instant Access**: Toggle the window instantly with the global shortcut `Ctrl + Shift + Space`.
- 🎙️ **Offline Voice Input**: Fully offline speech recognition powered by **Vosk-WASM** — no cloud services, no API keys, complete privacy.
- 📅 **Multi-dimensional View & Smart Expiry**: 
  - Organize and view tasks across **Day, Week, and Month** dimensions.
  - **Smart Deadlines**: Automatically ceil future due dates (+4 hours for Day, +7 days for Week, +30 days for Month) to clean half-hour checkpoints.
- 🎨 **Modern Aesthetics**: Neon-dark aesthetic with glassmorphism effects and smooth micro-animations.
- 🛠️ **Advanced Management & Fast Inline Edits**:
  - Dedicated viewer with real-time search, and multi-column sorting.
  - **Zero-Click Date Picker**: Directly type, hit `ArrowUp`/`ArrowDown`, or scroll your mouse wheel to adjust due dates by 30 minutes. Blur to save instantly.
- 🍅 **Enhanced Pomodoro**: 
  - Support custom full `MM:SS` precision editing.
  - Scroll or tap arrow shortcuts to quickly iterate time slices.
  - Embedded audio clock triggers (tick-tock sequence and Ding completion).
- 📥 **Smart Archive & Multi-History Undo**: 
  - **Auto-Archive**: Cleans up completed tasks gracefully over dimensions.
  - **Reversible Workflows**: Undo both hard deletions and main-list restorations intuitively inside the archive suite.
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

Please refer to the [CHANGELOG.md](CHANGELOG.md) file for detailed release notes across all versions.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

---

**Developed with ❤️ by [mesmerli](https://github.com/mesmerli)**

