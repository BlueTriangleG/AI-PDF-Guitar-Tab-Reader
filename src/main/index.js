const { app, BrowserWindow } = require('electron');
const { createMainWindow } = require('./windows/main_window');
const { createLibraryWindow } = require('./windows/library_window');
const { createMetronomeWindow } = require('./windows/metronome_window');
const { registerIpcHandlers } = require('./ipc/handlers');
const { initServices } = require('./bootstrap/init_services');
const { setAppMenu } = require('./menus/app_menu');

let mainWindow;
let libraryWindow;
let metronomeWindow;

app.whenReady().then(async () => {
  const services = await initServices();
  const createAndTrackWindow = () => {
    const window = createMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = window;
    }
    window.on('closed', () => {
      if (mainWindow === window) {
        mainWindow = null;
      }
    });
    return window;
  };
  const openReaderWindow = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      return mainWindow;
    }
    mainWindow = createMainWindow();
    mainWindow.on('closed', () => {
      if (mainWindow) {
        mainWindow = null;
      }
    });
    return mainWindow;
  };
  const openLibraryWindow = () => {
    if (libraryWindow && !libraryWindow.isDestroyed()) {
      libraryWindow.focus();
      return libraryWindow;
    }
    libraryWindow = createLibraryWindow();
    libraryWindow.on('closed', () => {
      libraryWindow = null;
    });
    return libraryWindow;
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

  libraryWindow = openLibraryWindow();
  setAppMenu({ onOpenWindow: createAndTrackWindow, onOpenLibraryWindow: openLibraryWindow });
  registerIpcHandlers({
    window: libraryWindow,
    services,
    onOpenMetronomeWindow: openMetronomeWindow,
    onOpenReaderWindow: openReaderWindow
  });

  services.library.on('changed', async () => {
    BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send('library:changed');
      }
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      libraryWindow = openLibraryWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
