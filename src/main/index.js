const { app, BrowserWindow } = require('electron');
const { createMainWindow } = require('./windows/main_window');
const { createMetronomeWindow } = require('./windows/metronome_window');
const { registerIpcHandlers } = require('./ipc/handlers');
const { initServices } = require('./bootstrap/init_services');
const { setAppMenu } = require('./menus/app_menu');

let mainWindow;
let metronomeWindow;

app.whenReady().then(async () => {
  const services = await initServices();
  const createAndTrackWindow = () => {
    const window = createMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = window;
    }
    return window;
  };
  const openMetronomeWindow = () => {
    if (metronomeWindow && !metronomeWindow.isDestroyed()) {
      metronomeWindow.focus();
      return metronomeWindow;
    }
    metronomeWindow = createMetronomeWindow();
    metronomeWindow.on('closed', () => {
      metronomeWindow = null;
    });
    return metronomeWindow;
  };

  mainWindow = createAndTrackWindow();
  setAppMenu({ onOpenWindow: createAndTrackWindow });
  registerIpcHandlers({ window: mainWindow, services, onOpenMetronomeWindow: openMetronomeWindow });

  services.library.on('changed', async () => {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('library:changed');
      }
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createAndTrackWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
