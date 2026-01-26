const path = require('path');
const { app, BrowserWindow } = require('electron');

function createLibraryWindow() {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const isMac = process.platform === 'darwin';
  const libraryWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: 'Library',
    titleBarStyle: isMac ? 'hidden' : 'default',
    backgroundColor: '#f6f1e6',
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '..', 'preload.js')
    }
  });

  if (isMac) {
    libraryWindow.setWindowButtonPosition({ x: 18, y: 14 });
  }

  if (devServerUrl) {
    const url = new URL(devServerUrl);
    url.searchParams.set('view', 'library');
    libraryWindow.loadURL(url.toString());
  } else {
    libraryWindow.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'), {
      query: { view: 'library' }
    });
  }

  return libraryWindow;
}

module.exports = { createLibraryWindow };
