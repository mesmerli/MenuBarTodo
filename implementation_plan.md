# Implementation Plan - MenuBar Todo

## Completed Features

### v1.0.0 — Foundation
- [x] Tray-based task management with global shortcut (`Ctrl+Shift+Space`).
- [x] Multi-dimensional task views (Day, Week, Month).
- [x] Dark-mode neon aesthetic with glassmorphism.
- [x] Data persistence via local JSON.
- [x] E2E testing with Playwright.

### v1.1.0 — Archive System & UI Refinements
- [x] **Archive System**:
  - Rotating `archive_todos_X.json` file system (5 files).
  - Auto-archiving by dimension (1 day / 7 days / 30 days).
  - Dedicated Archive Window with search, filtering, and undo.
- [x] **UI & Interaction**:
  - New SVG icons (Archive, Search, Add Task).
  - Clickable URL detection in task text via regex.
  - Reorganized header layout in Task Management window.
- [x] **Localization & Sync**:
  - Real-time language synchronization across all windows.
  - Updated translation keys for new features.

### v1.2.0 — Offline Voice Recognition (Vosk-WASM)
- [x] **Voice Engine Migration**:
  - Replaced non-functional `webkitSpeechRecognition` (requires Google API Key in Electron) with **Vosk-WASM** for fully offline, private speech recognition.
  - Removed `WebSpeechAPI` feature flag from `main.js`.
- [x] **Custom Protocol (`local-model://`)**:
  - Registered as a privileged scheme with `supportFetchAPI`, `secure`, `bypassCSP`.
  - Implemented via `protocol.handle` (Electron 25+ API).
  - Resolves paths to `process.resourcesPath` (production) or `app.getAppPath()` (development).
- [x] **Model Packaging**:
  - Vosk models pre-compressed as `tar.gz` during development (`npm run pack-models`).
  - Only `*.tar.gz` files included in `extraResources` (not raw model directories).
  - Supports English (`en`) and Chinese (`zh`) models.
- [x] **Audio Pipeline**:
  - `AudioContext` at 16kHz with `ScriptProcessorNode`.
  - Passes `AudioBuffer` to `recognizer.acceptWaveform()`.
  - 800ms silence auto-submit with partial result preview.
- [x] **Recording UI**:
  - Red pulsing glow animation (`@keyframes pulse`) on microphone button during recording.
  - Added missing `pulse` keyframes in both `style.css` and `history.css`.
- [x] **Diagnostic Tools**:
  - `logToFile()` function writing to `app-debug.log` in `userData` directory.
  - "DevTools" option in tray menu (`openDevTools({ mode: 'detach' })`).
- [x] **Test Suite Expansion**:
  - Expanded from 4 to 26 E2E tests (24 passing, 2 skipped).
  - New coverage: CRUD, undo, tab isolation, sorting, due dates, pomodoro, voice UI, multi-window, persistence, batch operations.

### v1.2.1 — Architecture Refactoring & Data Sync Fixes
- [x] **Undo-Archive Direct Removal**:
  - Modified the Task Management Undo action to strip tasks completely from rotating physical archive segments (`archive_todos_X.json`).
  - Introduced new IPC communication bridges (`remove-from-archive`) that inspect and delete overlapping nodes.
- [x] **Structural Renaming**:
  - Overhauled legacy `history.html`, `history.js`, `history.css` naming structures directly over to the robust standalone `taskmanager.*` namespace.
- [x] **Sorting Correctness**:
  - Cleared invalid reference properties mapping proper comparative benchmarks inside sub-routines.
- [x] **Queue Buffer Upgrades**:
  - Broadened backward recovery stacks handling safe operational intervals accommodating larger workflows.

### v1.3.0 — Pomodoro Enhancements & Desktop Overlays
- [x] **Precision Pomodoro**:
  - Redesigned time-setting experience: users now edit full `MM:SS` timestamps natively.
  - Integrated mouse wheel increments and ArrowUp/ArrowDown adjustments.
  - Added 10s audio countdown (ticking) alongside a concluding Ding notification.
- [x] **Persistent State Overlays**:
  - Ensured uninterrupted countdown execution while transitioning widget view frames.
  - Enabled standalone transparent overlay support ensuring layout fidelity.

### v1.4.0 — Smart Deadlines & Zero-Click Date Edits
- [x] **Fluid Date Adjustment Architecture**:
  - Implemented non-modal input fields triggering on-click.
  - Enabled ArrowUp/Down keyboard shortcuts and mouse wheel increments to step through 30-minute deadlines.
  - Enforced zero-button blur-to-save paradigms.
- [x] **Automatic Ceil Deadlines**:
  - Created intelligent logic pushing defaults (+4h Daily, +7d Weekly, +30d Monthly) directly forward to the closest half-hour milestones.
- [x] **Dual Archive Undo-Chains**:
  - Connected core main-list restoration routines safely under local stack caches enabling bidirectional reversals.
- [x] **Minimalism Passes**:
  - Stripped legacy column tags ensuring aesthetic breathing room.

## Proposed Future Changes

### Enhanced Search
- [ ] Add category or tag filtering.
- [ ] Support for date range search in Archive.

### Data Portability
- [ ] Export/Import archive files manually.

### Voice Recognition Improvements
- [ ] Migrate from `ScriptProcessorNode` to `AudioWorkletNode` (removes deprecation warning).
- [ ] Add visual waveform/volume indicator during recording.
- [ ] Support additional language models.

## Key Architecture Decisions

### Why Vosk-WASM over Web Speech API?
Electron does not bundle Google's proprietary speech recognition service. `webkitSpeechRecognition` in Electron requires a valid Google API Key configured at the Chromium level, which is impractical for a privacy-focused local app. Vosk-WASM runs entirely in-browser via WebAssembly with no external network calls.

### Why `tar.gz` for model packaging?
`vosk-browser`'s `createModel()` always downloads the URL and attempts to extract it as a `tar.gz` archive. There is no alternative loading mechanism. Models must be pre-compressed in this format.

### Why a custom protocol (`local-model://`)?
Web Workers inside `vosk-browser` use `fetch()` to load model files. The `fetch()` API in Electron's renderer does not support `file://` URLs inside workers. A custom privileged protocol registered with `supportFetchAPI: true` bridges this gap.

## File Reference

| File | Purpose |
| :--- | :--- |
| `main.js` | Protocol handler, `logToFile`, tray menu, window management |
| `renderer.js` | Vosk integration (`startVosk` / `stopVosk`), task CRUD |
| `taskmanager.js` | Voice input in Task Management window |
| `lib/vosk.js` | Local copy of vosk-browser library |
| `models/*.tar.gz` | Pre-built Vosk model archives |
| `style.css` / `taskmanager.css` | Recording animation (`@keyframes pulse`) |
| `preload.js` | IPC bridge between main and renderer |
| `tests/todo.spec.js` | 26 Playwright E2E tests |
