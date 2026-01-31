const { app, BrowserWindow, Menu } = require('electron');

function sendToFocused(channel) {
  const window = BrowserWindow.getFocusedWindow();
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel);
  }
}

const MENU_I18N = {
  en: {
    settings: 'Settings...',
    openNewWindow: 'Open New Window',
    openLibrary: 'Open Library',
    openTuner: 'Open Tuner',
    file: 'File',
    importPdf: 'Import PDF...',
    openImages: 'Open Images...',
    addFolder: 'Add Folder...',
    edit: 'Edit',
    view: 'View',
    window: 'Window',
    speech: 'Speech'
  },
  zh: {
    settings: '设置...',
    openNewWindow: '打开新窗口',
    openLibrary: '打开乐谱库',
    openTuner: '打开调音器',
    file: '文件',
    importPdf: '导入 PDF...',
    openImages: '打开图片...',
    addFolder: '添加文件夹...',
    edit: '编辑',
    view: '视图',
    window: '窗口',
    speech: '语音'
  }
};

function setAppMenu({ onOpenWindow, onOpenLibraryWindow, onOpenTunerWindow, onOpenSettingsWindow, language = 'en' } = {}) {
  const isMac = process.platform === 'darwin';
  const strings = MENU_I18N[language] || MENU_I18N.en;
  const newWindowItem = {
    label: strings.openNewWindow,
    accelerator: 'CmdOrCtrl+Shift+N',
    enabled: Boolean(onOpenWindow),
    click: () => {
      if (onOpenWindow) onOpenWindow();
    }
  };
  const libraryWindowItem = {
    label: strings.openLibrary,
    enabled: Boolean(onOpenLibraryWindow),
    click: () => {
      if (onOpenLibraryWindow) onOpenLibraryWindow();
    }
  };
  const tunerWindowItem = {
    label: strings.openTuner,
    enabled: Boolean(onOpenTunerWindow),
    click: () => {
      if (onOpenTunerWindow) onOpenTunerWindow();
    }
  };
  const settingsItem = {
    label: strings.settings,
    enabled: Boolean(onOpenSettingsWindow),
    click: () => {
      if (onOpenSettingsWindow) onOpenSettingsWindow();
    }
  };

  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            settingsItem,
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }]
      : []),
    {
      label: strings.file,
      submenu: [
        {
          label: strings.importPdf,
          accelerator: 'CmdOrCtrl+O',
          click: () => sendToFocused('menu:import-pdf')
        },
        {
          label: strings.openImages,
          accelerator: 'Shift+CmdOrCtrl+O',
          click: () => sendToFocused('menu:open-images')
        },
        {
          label: strings.addFolder,
          accelerator: 'Shift+CmdOrCtrl+L',
          click: () => sendToFocused('menu:library-location')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: strings.edit,
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: strings.speech,
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }]
              }
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }])
      ]
    },
    {
      label: strings.view,
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: strings.window,
      submenu: [
        newWindowItem,
        libraryWindowItem,
        tunerWindowItem,
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { setAppMenu };
