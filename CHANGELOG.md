# Changelog 📜

All notable changes to the **MenuBar Todo** project will be documented in this file.

---

### [1.4.1] - 2026-04-28
- **Added**: Persistent 6-digit auto-incrementing build tracker (`bump-build.js`).
- **Improved**: Replaced explicit textual status labels in Archive lists with modern visual toggles.
- **Improved**: Hard-synced secondary container widths flawlessly to baseline templates.
- **Fixed**: Locked unwanted cursor modifications for past workflow states (`not-allowed`).

### [1.4.0] - 2026-04-28
- **Added**: Date picker overhaul allowing fluid `ArrowUp`/`ArrowDown` key adjustments and wheel scrolling by 30-minute intervals.
- **Added**: Pure blur-to-save input logic replacing clunky confirmation tools.
- **Added**: Smart time ceilings generating rounded expiry marks automatically (+4h for Day, +7d for Week, +30d for Month).
- **Added**: Robust multi-action undo pipeline capturing deletions alongside inventory returns.
- **Improved**: Trimmed redundant task creation columns across general lists.
- **Improved**: Clean empty date placeholders displaying `-` uniformly.
- **Fixed**: Wiped stale logical window pointers causing sudden execution drops.

### [1.3.0] - 2026-04-28
- **Added**: Pomodoro Timer enhancements: support setting `MM:SS`, ArrowUp/Down adjustments, and mouse wheel scrolling.
- **Added**: Sound effects: Countdown tick-tock audio (10s to 1s) and final completion Ding bell.
- **Improved**: Widget Mode continuity allows uninterrupted timers across framework window state toggles.
- **Improved**: Taskbar unification routes child view layouts seamlessly under one unified user process instance.
- **Fixed**: Inline drag blockers allowing smooth pointer actions on embedded background surfaces.

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
