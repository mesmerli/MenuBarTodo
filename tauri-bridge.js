if (typeof window !== 'undefined' && !window.api) {
  if (window.__TAURI__) {
    window.api = {
      loadTodos: () => window.__TAURI__.core.invoke('load_todos'),
      saveTodos: (todos) => window.__TAURI__.core.invoke('save_todos', { todos }),
      onWindowShow: (callback) => {
        window.__TAURI__.event.listen('window-show', () => callback());
      },
      openTaskManagerWindow: () => window.__TAURI__.core.invoke('open_taskmanager_window'),
      onTodosUpdated: (callback) => {
        window.__TAURI__.event.listen('todos-updated', () => callback());
      },
      archiveTodos: (todos) => window.__TAURI__.core.invoke('archive_todos', { todos }),
      loadConfig: () => window.__TAURI__.core.invoke('load_config'),
      saveConfig: (config) => window.__TAURI__.core.invoke('save_config', { config }),
      onLanguageChanged: (callback) => {
        window.__TAURI__.event.listen('language-changed', (event) => callback(event.payload));
      },
      setAutoLaunch: (enabled) => window.__TAURI__.core.invoke('set_auto_launch', { enabled }),
      getAutoLaunch: () => window.__TAURI__.core.invoke('get_auto_launch'),
      openArchiveWindow: () => window.__TAURI__.core.invoke('open_archive_window'),
      loadArchives: () => window.__TAURI__.core.invoke('load_archives'),
      deleteArchiveItem: (id, fileIndex) => window.__TAURI__.core.invoke('delete_archive_item', { id, fileIndex }),
      restoreArchiveItem: (item, fileIndex) => window.__TAURI__.core.invoke('restore_archive_item', { item, fileIndex }),
      onArchivesUpdated: (callback) => {
        window.__TAURI__.event.listen('archives-updated', () => callback());
      },
      openUrl: (url) => window.__TAURI__.core.invoke('open_url', { url }),
      requestShowWindow: () => window.__TAURI__.core.invoke('request_show_window'),
      pomoToggle: () => window.__TAURI__.core.invoke('pomo_toggle'),
      pomoSetDuration: (mins) => window.__TAURI__.core.invoke('pomo_set_duration', { mins }),
      pomoGetState: () => window.__TAURI__.core.invoke('pomo_get_state'),
      onPomoTick: (callback) => {
        window.__TAURI__.event.listen('pomo-tick', (event) => callback(event.payload));
      },
      getVersion: () => window.__TAURI__.core.invoke('get_version'),
      checkTrialLicense: () => window.__TAURI__.core.invoke('check_trial_license'),
      setWidgetMode: (enabled) => window.__TAURI__.core.invoke('set_widget_mode', { enabled }),
      
      // Global Undo System
      pushUndoAction: (action) => window.__TAURI__.core.invoke('push_undo_action', { action }),
      performUndo: () => window.__TAURI__.core.invoke('perform_undo'),
      performRedo: () => window.__TAURI__.core.invoke('perform_redo'),
      getUndoState: () => window.__TAURI__.core.invoke('get_undo_state'),
      onUndoStateUpdated: (callback) => {
        window.__TAURI__.event.listen('undo-state-updated', (event) => callback(event.payload));
      },
      closeWindow: () => window.__TAURI__.webviewWindow.getCurrentWebviewWindow().close()
    };
  }
}
