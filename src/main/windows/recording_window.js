const path = require('path');
const { app, BrowserWindow } = require('electron');

function createRecordingWindow() {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const isMac = process.platform === 'darwin';
  const recordingWindow = new BrowserWindow({
    width: 520,
    height: 620,
    minWidth: 420,
    minHeight: 520,
    title: 'Recording',
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
    recordingWindow.setWindowButtonPosition({ x: 18, y: 14 });
  } else {
    recordingWindow.setMenuBarVisibility(false);
  }

  if (devServerUrl) {
    const url = new URL(devServerUrl);
    url.searchParams.set('view', 'recording');
    recordingWindow.loadURL(url.toString());
  } else {
    recordingWindow.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'), {
      query: { view: 'recording' }
    });
  }

  return recordingWindow;
}

module.exports = { createRecordingWindow };
