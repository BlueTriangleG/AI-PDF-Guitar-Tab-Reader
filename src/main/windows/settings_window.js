const path = require('path');
const { app, BrowserWindow } = require('electron');
const { getWindowTitle } = require('./window_titles');

function createSettingsWindow(language = 'en') {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const isMac = process.platform === 'darwin';
  const settingsWindow = new BrowserWindow({
    width: 420,
    height: 360,
    minWidth: 360,
    minHeight: 300,
    title: getWindowTitle('settings', language),
    titleBarStyle: isMac ? 'hidden' : 'default',
    backgroundColor: '#f6f1e6',
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  if (isMac) {
    settingsWindow.setWindowButtonPosition({ x: 18, y: 14 });
  } else {
    settingsWindow.setMenuBarVisibility(false);
  }

  if (devServerUrl) {
    const url = new URL(devServerUrl);
    url.searchParams.set('view', 'settings');
    settingsWindow.loadURL(url.toString());
  } else {
    settingsWindow.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'), {
      query: { view: 'settings' }
    });
  }

  return settingsWindow;
}

module.exports = { createSettingsWindow };
