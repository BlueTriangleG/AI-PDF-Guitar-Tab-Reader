const { app, BrowserWindow } = require('electron');
const { createMainWindow } = require('./windows/main_window');
const { registerIpcHandlers } = require('./ipc/handlers');
const { initServices } = require('./bootstrap/init_services');
const { setAppMenu } = require('./menus/app_menu');

let mainWindow;

app.whenReady().then(async () => {
  const services = await initServices();
  const createAndTrackWindow = () => {
    const window = createMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = window;
    }
    return window;
  };
  mainWindow = createAndTrackWindow();
  setAppMenu({ onOpenWindow: createAndTrackWindow });
  registerIpcHandlers({ window: mainWindow, services });

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
