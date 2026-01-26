const path = require('path');
const { app, BrowserWindow } = require('electron');

function createMetronomeWindow() {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const isMac = process.platform === 'darwin';
  const metronomeWindow = new BrowserWindow({
    width: 480,
    height: 640,
    minWidth: 360,
    minHeight: 520,
    title: 'Metronome',
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
    metronomeWindow.setWindowButtonPosition({ x: 18, y: 14 });
  } else {
    metronomeWindow.setMenuBarVisibility(false);
  }

  if (devServerUrl) {
    const url = new URL(devServerUrl);
    url.searchParams.set('view', 'metronome');
    metronomeWindow.loadURL(url.toString());
  } else {
    metronomeWindow.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'), {
      query: { view: 'metronome' }
    });
  }

  return metronomeWindow;
}

module.exports = { createMetronomeWindow };
