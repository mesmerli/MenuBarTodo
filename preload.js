const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadTodos: () => ipcRenderer.invoke('load-todos'),
  saveTodos: (todos) => ipcRenderer.invoke('save-todos', todos),
  onWindowShow: (callback) => ipcRenderer.on('window-show', () => callback()),
  openHistoryWindow: () => ipcRenderer.send('open-history-window'),
  onTodosUpdated: (callback) => ipcRenderer.on('todos-updated', () => callback()),
  backupTodos: (todos) => ipcRenderer.send('backup-todos', todos),
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  onLanguageChanged: (callback) => ipcRenderer.on('language-changed', (event, lang) => callback(lang)),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('set-auto-launch', enabled),
  getAutoLaunch: () => ipcRenderer.invoke('get-auto-launch')
});
