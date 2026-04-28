# Changelog 📜

All notable changes to the **MenuBar Todo** project will be documented in this file.

---

### [1.2.1] - 2026-04-28
- **Added**: Direct task removal from physical rolling archives upon undo action in Task Manager.
- **Improved**: Renamed `history.*` files completely into `taskmanager.*` for modern UI conventions.
- **Improved**: Increased memory capacity for historical operations up to 100 steps.
- **Fixed**: Re-anchored layout cascade preventing template collapse inside archive view wrappers.
- **Fixed**: Resolved unassigned logical statements referencing fallback properties.

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
