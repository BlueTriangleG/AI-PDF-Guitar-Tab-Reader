const path = require('path');
const { app, BrowserWindow } = require('electron');

function createMainWindow() {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hidden',
    backgroundColor: '#f6f1e6',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonPosition({ x: 18, y: 14 });
  }

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'));
  }

  return mainWindow;
}

module.exports = { createMainWindow };
