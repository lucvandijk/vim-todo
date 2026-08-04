const { app, BrowserWindow, globalShortcut, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const store = require('./store');

let mainWindow = null;
let tray = null;
let currentShortcut = store.get('shortcut');

function createWindow() {
  const { width, height } = store.get('windowSize');

  mainWindow = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    transparent: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('blur', () => {
    if (mainWindow && mainWindow.isVisible() && !mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.hide();
    }
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function centerOnCurrentScreen() {
  if (!mainWindow) return;

  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const { x: dx, y: dy, width: dw, height: dh } = display.workArea;
  const [ww, wh] = mainWindow.getSize();

  const x = Math.round(dx + (dw - ww) / 2);
  const y = Math.round(dy + (dh - wh) / 2);

  mainWindow.setPosition(x, y);
}

function toggleWindow() {
  if (!mainWindow) return;

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    centerOnCurrentScreen();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('window-shown');
  }
}

function registerShortcut(accelerator) {
  globalShortcut.unregisterAll();
  const ok = globalShortcut.register(accelerator, toggleWindow);
  if (ok) {
    currentShortcut = accelerator;
    store.set('shortcut', accelerator);
  }
  return ok;
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'renderer', 'icon.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  const menu = Menu.buildFromTemplate([
    { label: 'Toggle Vim Todo', click: toggleWindow },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('Vim Todo');
  tray.setContextMenu(menu);
  tray.on('click', toggleWindow);
}

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.hide();
  }

  createWindow();
  createTray();

  const ok = registerShortcut(currentShortcut);
  if (!ok) {
    registerShortcut('Control+Space');
  }
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.handle('todos:get', () => store.get('todos'));
ipcMain.handle('todos:set', (_e, todos) => {
  store.set('todos', todos);
  return true;
});

ipcMain.handle('shortcut:get', () => currentShortcut);
ipcMain.handle('shortcut:set', (_e, accelerator) => {
  const ok = registerShortcut(accelerator);
  return { ok, shortcut: currentShortcut };
});

ipcMain.on('window:hide', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.on('app:quit', () => {
  app.isQuitting = true;
  app.quit();
});
