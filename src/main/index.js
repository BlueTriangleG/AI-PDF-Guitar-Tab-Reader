const { app } = require('electron');
const { createMainWindow } = require('./windows/main_window');
const { registerIpcHandlers } = require('./ipc/handlers');
const { initServices } = require('./bootstrap/init_services');
const { setAppMenu } = require('./menus/app_menu');

let mainWindow;

app.whenReady().then(async () => {
  const services = await initServices();
  mainWindow = createMainWindow();
  setAppMenu();
  registerIpcHandlers({ window: mainWindow, services });

  services.library.on('changed', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('library:changed');
    }
  });

  app.on('activate', () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
