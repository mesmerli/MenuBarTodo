const { app, BrowserWindow, Tray, globalShortcut, ipcMain, nativeImage, screen, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isTest = process.argv.includes('--test');
const gotTheLock = isTest ? true : app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      showWindow();
    }
  });

  let tray = null;
let win = null;
let historyWin = null;
let aboutWin = null;

const storePath = path.join(app.getPath('userData'), 'todos.json');
const configPath = path.join(app.getPath('userData'), 'config.json');

function createWindow() {
  win = new BrowserWindow({
    width: 320,
    height: 450,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile('index.html');

  win.on('blur', () => {
    win.hide();
  });
}

function toggleWindow() {
  if (win.isVisible()) {
    win.hide();
  } else {
    showWindow();
  }
}

function showWindow() {
  const trayPos = tray.getBounds();
  const winPos = win.getBounds();
  
  let x, y;
  
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  if (trayPos.y > height / 2) {
      x = Math.round(trayPos.x + (trayPos.width / 2) - (winPos.width / 2));
      y = Math.round(trayPos.y - winPos.height - 10);
  } else {
      x = Math.round(trayPos.x + (trayPos.width / 2) - (winPos.width / 2));
      y = Math.round(trayPos.y + trayPos.height + 10);
  }

  if (x < 0) x = 10;
  if (x + winPos.width > primaryDisplay.bounds.width) x = primaryDisplay.bounds.width - winPos.width - 10;

  win.setPosition(x, y, false);
  win.show();
  win.focus();
  win.webContents.send('window-show');
}

app.whenReady().then(() => {
  createWindow();

  // Load the generated icon
  const iconPath = path.join(__dirname, 'icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  icon = icon.resize({ width: 32, height: 32 }); // Resize for tray
  tray = new Tray(icon);
  tray.setToolTip('MenuBar Todo');
  
  tray.on('click', () => {
    toggleWindow();
  });

  const contextMenu = Menu.buildFromTemplate([
    { label: '顯示主視窗', click: () => showWindow() },
    { type: 'separator' },
    { label: '關於', click: () => {
      if (aboutWin) {
        aboutWin.focus();
        return;
      }
      aboutWin = new BrowserWindow({
        width: 300,
        height: 380,
        resizable: false,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: true,
        backgroundColor: '#19191c',
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      aboutWin.setMenuBarVisibility(false);
      aboutWin.loadFile('about.html');
      aboutWin.on('closed', () => { aboutWin = null; });
    }},
    { label: '結束', click: () => { app.quit(); } }
  ]);
  
  tray.setContextMenu(contextMenu);

  const ret = globalShortcut.register('CommandOrControl+Shift+Space', () => {
    toggleWindow();
  });
  
  if (!ret) {
    console.log('Registration failed for CommandOrControl+Shift+Space');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('open-history-window', () => {
  if (historyWin) {
    historyWin.focus();
    return;
  }
  
  historyWin = new BrowserWindow({
    width: 900,
    height: 600,
    backgroundColor: '#19191c',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  historyWin.loadFile('history.html');
  
  // To avoid keeping the main app hidden if focused on history window, we might disable blur-hide temporarily,
  // but for now, they are independent.
  historyWin.on('closed', () => {
    historyWin = null;
  });
});

ipcMain.handle('load-todos', () => {
  try {
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Failed to load todos:', error);
    return [];
  }
});

ipcMain.handle('save-todos', (event, todos) => {
  try {
    fs.writeFileSync(storePath, JSON.stringify(todos, null, 2));
    
    // Notify history window if it's open
    if (historyWin) {
      historyWin.webContents.send('todos-updated');
    }
    // Also notify main window if needed, but renderer handles its own state
    win.webContents.send('todos-updated');
    
    return true;
  } catch (error) {
    console.error('Failed to save todos:', error);
    return false;
  }
});

ipcMain.on('backup-todos', (event, deletedTodos) => {
  try {
    const userDataPath = app.getPath('userData');
    const MAX_FILES = 5;
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

    // Load current index from config
    let config = { lang: 'zh-TW', backupIndex: 1 };
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    if (!config.backupIndex) config.backupIndex = 1;

    let currentIndex = config.backupIndex;
    let backupPath = path.join(userDataPath, `backup_todos_${currentIndex}.json`);
    
    let backups = [];
    if (fs.existsSync(backupPath)) {
      try {
        backups = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      } catch (e) {
        backups = [];
      }
    }

    // Add deleted items with a deletion timestamp
    const newBackups = deletedTodos.map(t => ({ ...t, deletedAt: Date.now() }));
    const combinedBackups = [...newBackups, ...backups];
    const dataString = JSON.stringify(combinedBackups, null, 2);

    // Check if current file + new data exceeds limit
    if (Buffer.byteLength(dataString, 'utf8') > MAX_SIZE_BYTES) {
      // Move to next file and overwrite
      currentIndex = (currentIndex % MAX_FILES) + 1;
      backupPath = path.join(userDataPath, `backup_todos_${currentIndex}.json`);
      
      // Start fresh in the new file
      fs.writeFileSync(backupPath, JSON.stringify(newBackups, null, 2));
      
      // Update config with new index
      config.backupIndex = currentIndex;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } else {
      // Append to current file
      fs.writeFileSync(backupPath, dataString);
    }
  } catch (error) {
    console.error('Failed to backup todos:', error);
  }
});

ipcMain.handle('load-config', () => {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
    return { lang: 'zh-TW' };
  } catch (error) {
    console.error('Failed to load config:', error);
    return { lang: 'zh-TW' };
  }
});

ipcMain.handle('save-config', (event, config) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    // Broadcast language change to all windows
    if (win) win.webContents.send('language-changed', config.lang);
    if (historyWin) historyWin.webContents.send('language-changed', config.lang);
    if (aboutWin) aboutWin.webContents.send('language-changed', config.lang);
    return true;
  } catch (error) {
    console.error('Failed to save config:', error);
    return false;
  }
});

ipcMain.handle('set-auto-launch', (event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: app.getPath('exe')
    });
    return true;
  } catch (error) {
    console.error('Failed to set login item settings:', error);
    return false;
  }
});

ipcMain.handle('get-auto-launch', () => {
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch (error) {
    return false;
  }
});
} // End of single instance lock else block
