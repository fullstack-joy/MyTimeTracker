const { app, BrowserWindow, ipcMain, desktopCapturer, screen, Tray, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

let tray = null;
let mainWindow = null;
app.isQuiting = false;

// Directory where screenshots are saved
const screenshotsDir = path.join(os.homedir(), 'TimeTrackerScreenshots');

async function ensureDir() {
  try {
    await fs.mkdir(screenshotsDir, { recursive: true });
  } catch {}
}

function getTrayIconPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'tray_icon.png');
  }
  return path.join(__dirname, 'assets', 'tray_icon.png');
}

function showMainWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  }
}

function createWindow() {
  if (mainWindow) {
    showMainWindow();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 768,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, 'assets', 'icon.png')
      : path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(app.getAppPath(), 'build', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173/');
  }

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      if (process.platform === 'darwin') {
        app.dock.hide();
      }
    } else {
      mainWindow = null;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('show', () => {
    if (process.platform === 'darwin') {
      app.dock.show();
    }
  });
}

function setupTray() {
  if (tray) return;

  const trayIconPath = getTrayIconPath();
  tray = new Tray(trayIconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => showMainWindow()
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('TimeTracker');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => showMainWindow());
  tray.on('double-click', () => showMainWindow());
}

// Ensure only one instance of the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.whenReady().then(async () => {
    await ensureDir();
    createWindow();
    setupTray();
  });
}

app.on('activate', () => {
  if (mainWindow) {
    showMainWindow();
  } else {
    createWindow();
  }
});

app.on('window-all-closed', (event) => {
  if (process.platform !== 'darwin' && !app.isQuiting) {
    event.preventDefault();
  } else if (app.isQuiting) {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC: List Screenshots
ipcMain.handle('time-tracker:list-screenshots', async () => {
  try {
    const files = await fs.readdir(screenshotsDir);
    return files.map(name => path.join(screenshotsDir, name));
  } catch {
    return [];
  }
});

// IPC: Take Screenshot
ipcMain.on('time-tracker:screenshot', async (event, label) => {
  try {
    const cursorPoint = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursorPoint);
    const { width, height } = display.size;
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } });

    let source = sources.find(s =>
      s.display_id ? Number(s.display_id) === display.id : s.id.includes(display.id.toString())
    );

    if (!source) {
      source = sources.find(s => s.thumbnail.getSize().width === width) || sources[0];
    }

    const buffer = source.thumbnail.toPNG();
    const safeLabel = label.replace(/[^a-z0-9_\-]/gi, '_');
    const filePath = path.join(screenshotsDir, `${Date.now()}-${safeLabel}.png`);

    await fs.writeFile(filePath, buffer);
    event.sender.send('time-tracker:screenshot-saved', { filePath, label });
  } catch (error) {
    event.sender.send('time-tracker:screenshot-error', error.message);
  }
});

// IPC: Delete Screenshot
ipcMain.handle('time-tracker:delete-screenshot', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Open DevTools
ipcMain.on('open-devtools', (event, mode = 'left') => {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.openDevTools({ mode });
  }
});
