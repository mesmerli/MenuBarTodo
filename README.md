# MenuBar Todo 📝

[![Electron](https://img.shields.io/badge/Electron-41.3.0-blue.svg)](https://electronjs.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)

**MenuBar Todo** is a minimalist, high-performance task management application designed for developers and professionals who value efficiency. It lives in your Windows system tray, allowing you to capture ideas and tasks instantly without breaking your flow.

<a href="https://apps.microsoft.com/detail/9P9T972HKHZX?hl=zh-tw&gl=TW&ocid=pdpshare">
  <img src="https://get.microsoft.com/images/en-us%20dark.svg" width="300" alt="Get it from Microsoft" />
</a>

![MenuBar Todo Screenshot](assets/screenshot.png)

---

## ✨ Key Features

- 🚀 **Instant Access**: Toggle the window instantly with the global shortcut `Ctrl + Shift + Space`.
- 🎙️ **Smart Voice Input**: 
  - Fully offline speech recognition powered by **Vosk-WASM**.
  - **Real-time Conversion**: Automatically converts simplified Chinese to **Traditional Chinese** (Taiwan standard) using OpenCC-JS.
- 📅 **Intuitive Dimension Buckets**: 
  - Organize tasks into **Today, Incoming, and Future** buckets.
  - **Smart Deadlines**: Automatically ceil future due dates (+4 hours for Today, +7 days for Incoming, +30 days for Future) to clean half-hour checkpoints.
- 🎨 **Premium Aesthetics**: 420px wide modern neon-dark UI with glassmorphism effects and redesigned 3D drawer icons.
- 🛠️ **Advanced Management & Fast Inline Edits**:
  - Dedicated viewer with real-time search, and multi-column sorting.
  - **Inline Fast Editing**: Edit task text, dimensions (Today/Incoming/Future), or due dates directly in the table.
  - **Zero-Click Date Picker**: Directly type, hit `ArrowUp`/`ArrowDown`, or scroll your mouse wheel to adjust due dates by 30 minutes. Blur to save instantly.
- 🍅 **Enhanced Pomodoro**: 
  - Support custom full `MM:SS` precision editing.
  - **Auto-Reset**: Automatically reverts to 25:00 if idle for 5 minutes after completion.
  - Scroll or tap arrow shortcuts to quickly iterate time slices.
  - Embedded audio clock triggers (tick-tock sequence and Ding completion).
- 📥 **Smart Archive & Multi-History Undo**: 
  - **Auto-Archive**: Cleans up completed tasks gracefully over dimensions.
  - **Reversible Workflows (Undo/Redo)**: Comprehensive global Undo/Redo support for deletions, restorations, state toggles, and dimension changes across all views.
- 🔗 **Clickable Resources**: URLs in task descriptions are automatically detected and clickable, opening directly in your default browser.
- 🛡️ **Privacy Focused**: 100% local data storage. No servers, no tracking, complete privacy.
- 🌐 **Real-time Sync**: Multi-language support (English / Traditional Chinese) with instant synchronization across all windows.

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
- **Validation**: Playwright (33 E2E automation cases)
- **Bundling**: Electron Builder

---

## 📜 Changelog

Please refer to the [CHANGELOG.md](CHANGELOG.md) file for detailed release notes across all versions.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

---

**Developed with ❤️ by [mesmerli](https://github.com/mesmerli)**

