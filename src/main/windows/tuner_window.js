const path = require('path');
const { app, BrowserWindow } = require('electron');

function createTunerWindow() {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const isMac = process.platform === 'darwin';
  const tunerWindow = new BrowserWindow({
    width: 420,
    height: 520,
    minWidth: 360,
    minHeight: 480,
    title: 'Tuner',
    titleBarStyle: isMac ? 'hidden' : 'default',
    backgroundColor: '#f6f1e6',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  if (isMac) {
    tunerWindow.setWindowButtonPosition({ x: 18, y: 14 });
  } else {
    tunerWindow.setMenuBarVisibility(false);
  }

  if (devServerUrl) {
    const url = new URL(devServerUrl);
    url.searchParams.set('view', 'tuner');
    tunerWindow.loadURL(url.toString());
  } else {
    tunerWindow.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'), {
      query: { view: 'tuner' }
    });
  }

  return tunerWindow;
}

module.exports = { createTunerWindow };
