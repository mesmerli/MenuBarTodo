# MenuBar Todo 📝

[![Electron](https://img.shields.io/badge/Electron-41.3.0-blue.svg)](https://electronjs.org)
[![License: ISC](https://img.shields.io/badge/License-ISC-green.svg)](https://opensource.org/licenses/ISC)

**MenuBar Todo** is a minimalist, high-performance task management application designed for developers and professionals who value efficiency. It lives in your Windows system tray, allowing you to capture ideas and tasks instantly without breaking your flow.

---

## ✨ Key Features

- 🚀 **Instant Access**: Toggle the window instantly with the global shortcut `Ctrl + Shift + Space`.
- 🎙️ **Voice Input**: Built-in smart speech recognition—capture tasks as fast as you can speak.
- 📅 **Multi-dimensional View**: Organize and view tasks across "Day, Week, and Month" dimensions.
- 🎨 **Modern Aesthetics**: Neon-dark aesthetic with glassmorphism effects and smooth micro-animations.
- 🛠️ **Advanced Management**: Dedicated management window with real-time search, inline editing, and multi-column sorting.
- 💾 **Smart Backup**: Automated 5-file rotating backup system ensures your data is never lost.
- 🛡️ **Privacy Focused**: 100% local data storage. No servers, no tracking, complete privacy.
- 🌐 **Multi-language**: Fully supports both Traditional Chinese and English.

---

## ⌨️ Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **Show / Hide App** | `Ctrl + Shift + Space` |
| **Create Task** | `Enter` (inside input field) |
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

### 3. Run in Development
```bash
npm start
```

### 4. Build Production Executable
```bash
# Builds both portable and installer versions
npm run dist
```

### 5. Run E2E Tests
This project uses Playwright for automated testing:
```bash
npm test
```

---

## 📦 Tech Stack

- **Core**: Electron, Node.js
- **Frontend**: HTML5, Vanilla CSS, JavaScript
- **Testing**: Playwright
- **Bundling**: Electron Builder

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

---

**Developed with ❤️ by [mesmerli](https://github.com/mesmerli)**
