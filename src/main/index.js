const { app, BrowserWindow } = require('electron');
const { createMainWindow } = require('./windows/main_window');
const { createLibraryWindow } = require('./windows/library_window');
const { createMetronomeWindow } = require('./windows/metronome_window');
const { createTunerWindow } = require('./windows/tuner_window');
const { createRecordingWindow } = require('./windows/recording_window');
const { createSettingsWindow } = require('./windows/settings_window');
const { registerIpcHandlers } = require('./ipc/handlers');
const { initServices } = require('./bootstrap/init_services');
const { setAppMenu } = require('./menus/app_menu');
const { getWindowTitle } = require('./windows/window_titles');

let libraryWindow;
let metronomeWindow;
let tunerWindow;
let recordingWindow;
let settingsWindow;
const readerWindows = new Set();

app.setName('AI Guitar Reader');

app.whenReady().then(async () => {
  const services = await initServices();
  let currentLanguage = services.library.getSetting('app.language') || 'en';

  const updateWindowTitles = (language) => {
    const lang = language || currentLanguage || 'en';
    if (libraryWindow && !libraryWindow.isDestroyed()) {
      libraryWindow.setTitle(getWindowTitle('library', lang));
    }
    if (metronomeWindow && !metronomeWindow.isDestroyed()) {
      metronomeWindow.setTitle(getWindowTitle('metronome', lang));
    }
    if (tunerWindow && !tunerWindow.isDestroyed()) {
      tunerWindow.setTitle(getWindowTitle('tuner', lang));
    }
    if (recordingWindow && !recordingWindow.isDestroyed()) {
      recordingWindow.setTitle(getWindowTitle('recording', lang));
    }
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.setTitle(getWindowTitle('settings', lang));
    }
  };

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
    libraryWindow = createLibraryWindow(currentLanguage);
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
    metronomeWindow = createMetronomeWindow(currentLanguage);
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
    tunerWindow = createTunerWindow(currentLanguage);
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
    recordingWindow = createRecordingWindow(currentLanguage);
    recordingWindow.on('closed', () => {
      recordingWindow = null;
    });
    return recordingWindow;
  };

  const openSettingsWindow = () => {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
      settingsWindow.focus();
      return settingsWindow;
    }
    settingsWindow = createSettingsWindow(currentLanguage);
    settingsWindow.on('closed', () => {
      settingsWindow = null;
    });
    return settingsWindow;
  };


  libraryWindow = openLibraryWindow();
  const rebuildMenu = (language) => {
    currentLanguage = language || currentLanguage || 'en';
    setAppMenu({
      onOpenWindow: createAndTrackWindow,
      onOpenLibraryWindow: openLibraryWindow,
      onOpenTunerWindow: openTunerWindow,
      onOpenSettingsWindow: openSettingsWindow,
      language: currentLanguage
    });
    updateWindowTitles(currentLanguage);
  };
  rebuildMenu(currentLanguage);
  registerIpcHandlers({
    window: libraryWindow,
    services,
    onOpenMetronomeWindow: openMetronomeWindow,
    onOpenReaderWindow: openReaderWindow,
    onOpenLibraryWindow: openLibraryWindow,
    onOpenTunerWindow: openTunerWindow,
    onOpenRecordingWindow: openRecordingWindow,
    onSetLanguage: rebuildMenu
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
