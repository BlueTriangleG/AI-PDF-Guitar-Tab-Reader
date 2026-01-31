const { app, BrowserWindow } = require('electron');
const { createMainWindow } = require('./windows/main_window');
const { createLibraryWindow } = require('./windows/library_window');
const { createMetronomeWindow } = require('./windows/metronome_window');
const { createTunerWindow } = require('./windows/tuner_window');
const { createRecordingWindow } = require('./windows/recording_window');
const { registerIpcHandlers } = require('./ipc/handlers');
const { initServices } = require('./bootstrap/init_services');
const { setAppMenu } = require('./menus/app_menu');

let libraryWindow;
let metronomeWindow;
let tunerWindow;
let recordingWindow;
const readerWindows = new Set();

app.whenReady().then(async () => {
  const services = await initServices();
  const createAndTrackWindow = () => {
    const window = createMainWindow();
    readerWindows.add(window);
    window.on('closed', () => {
      readerWindows.delete(window);
    });
    return window;
  };
  const openReaderWindow = () => {
    // Always create a new reader window
    const window = createMainWindow();
    readerWindows.add(window);
    window.on('closed', () => {
      readerWindows.delete(window);
    });
    return window;
  };
  const openLibraryWindow = () => {
    if (libraryWindow && !libraryWindow.isDestroyed()) {
      if (libraryWindow.isMinimized()) {
        libraryWindow.restore();
      }
      libraryWindow.show();
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

  const openTunerWindow = () => {
    if (tunerWindow && !tunerWindow.isDestroyed()) {
      tunerWindow.focus();
      return tunerWindow;
    }
    tunerWindow = createTunerWindow();
    tunerWindow.on('closed', () => {
      tunerWindow = null;
    });
    return tunerWindow;
  };

  const openRecordingWindow = () => {
    if (recordingWindow && !recordingWindow.isDestroyed()) {
      recordingWindow.focus();
      return recordingWindow;
    }
    recordingWindow = createRecordingWindow();
    recordingWindow.on('closed', () => {
      recordingWindow = null;
    });
    return recordingWindow;
  };


  libraryWindow = openLibraryWindow();
  setAppMenu({
    onOpenWindow: createAndTrackWindow,
    onOpenLibraryWindow: openLibraryWindow,
    onOpenTunerWindow: openTunerWindow
  });
  registerIpcHandlers({
    window: libraryWindow,
    services,
    onOpenMetronomeWindow: openMetronomeWindow,
    onOpenReaderWindow: openReaderWindow,
    onOpenLibraryWindow: openLibraryWindow,
    onOpenTunerWindow: openTunerWindow,
    onOpenRecordingWindow: openRecordingWindow
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
