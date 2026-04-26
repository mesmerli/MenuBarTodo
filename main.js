const { app, BrowserWindow, Tray, globalShortcut, ipcMain, nativeImage, screen, Menu, dialog, shell } = require('electron');
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
let archiveWin = null;
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

ipcMain.on('open-archive-window', () => {
  if (archiveWin) {
    archiveWin.focus();
    return;
  }
  
  archiveWin = new BrowserWindow({
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
  
  archiveWin.loadFile('archive.html');
  
  archiveWin.on('closed', () => {
    archiveWin = null;
  });
});

function archiveTodosInternal(todosToArchive) {
  try {
    const userDataPath = app.getPath('userData');
    const MAX_FILES = 5;
    const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

    let config = { lang: 'zh-TW', archiveIndex: 1 };
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    if (!config.archiveIndex) config.archiveIndex = 1;

    let currentIndex = config.archiveIndex;
    let archivePath = path.join(userDataPath, `archive_todos_${currentIndex}.json`);
    
    let archives = [];
    if (fs.existsSync(archivePath)) {
      try {
        archives = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
      } catch (e) { archives = []; }
    }

    const newArchives = todosToArchive.map(t => ({ 
      ...t, 
      deletedAt: t.deletedAt || Date.now() 
    }));
    const combinedArchives = [...newArchives, ...archives];
    const dataString = JSON.stringify(combinedArchives, null, 2);

    if (Buffer.byteLength(dataString, 'utf8') > MAX_SIZE_BYTES) {
      currentIndex = (currentIndex % MAX_FILES) + 1;
      archivePath = path.join(userDataPath, `archive_todos_${currentIndex}.json`);
      fs.writeFileSync(archivePath, JSON.stringify(newArchives, null, 2));
      config.archiveIndex = currentIndex;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } else {
      fs.writeFileSync(archivePath, dataString);
    }

    if (archiveWin) {
      archiveWin.webContents.send('archives-updated');
    }
  } catch (error) {
    console.error('Failed internal archive:', error);
  }
}

function autoArchiveTodos(todos) {
  const now = Date.now();
  const toArchive = [];
  const remaining = [];
  
  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEK_MS = 7 * DAY_MS;
  const MONTH_MS = 30 * DAY_MS;

  todos.forEach(todo => {
    if (todo.completed && todo.completedAt) {
      const elapsed = now - todo.completedAt;
      const dim = todo.dimension || 'day';
      let limit = DAY_MS;
      if (dim === 'week') limit = WEEK_MS;
      if (dim === 'month') limit = MONTH_MS;
      
      if (elapsed > limit) {
        toArchive.push(todo);
      } else {
        remaining.push(todo);
      }
    } else {
      remaining.push(todo);
    }
  });

  if (toArchive.length > 0) {
    archiveTodosInternal(toArchive);
    fs.writeFileSync(storePath, JSON.stringify(remaining, null, 2));
  }
  
  return remaining;
}

ipcMain.handle('load-todos', () => {
  try {
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf8');
      const todos = JSON.parse(data);
      return autoArchiveTodos(todos);
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
    
    if (historyWin) {
      historyWin.webContents.send('todos-updated');
    }
    win.webContents.send('todos-updated');
    
    return true;
  } catch (error) {
    console.error('Failed to save todos:', error);
    return false;
  }
});

ipcMain.on('archive-todos', (event, deletedTodos) => {
  archiveTodosInternal(deletedTodos);
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
    if (archiveWin) archiveWin.webContents.send('language-changed', config.lang);
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

ipcMain.handle('load-archives', () => {
  try {
    const userDataPath = app.getPath('userData');
    let allArchives = [];
    for (let i = 1; i <= 5; i++) {
      let filePath = path.join(userDataPath, `archive_todos_${i}.json`);
      
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Add file source to each item so we know where to delete from
        allArchives = allArchives.concat(data.map(item => ({ ...item, _fileIndex: i })));
      }
    }
    return allArchives;
  } catch (error) {
    console.error('Failed to load archives:', error);
    return [];
  }
});

ipcMain.handle('delete-archive-item', (event, { id, fileIndex }) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, `archive_todos_${fileIndex}.json`);
    if (fs.existsSync(filePath)) {
      let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      data = data.filter(item => item.id !== id);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to delete archive item:', error);
    return false;
  }
});

ipcMain.handle('restore-archive-item', (event, { item, fileIndex }) => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, `archive_todos_${fileIndex}.json`);
    let data = [];
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    // Remove the temporary _fileIndex property if it exists
    const itemToRestore = { ...item };
    delete itemToRestore._fileIndex;
    
    data.unshift(itemToRestore);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to restore archive item:', error);
    return false;
  }
});

ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url);
});
} // End of single instance lock else block
