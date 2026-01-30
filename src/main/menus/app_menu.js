const { app, BrowserWindow, Menu } = require('electron');

function sendToFocused(channel) {
  const window = BrowserWindow.getFocusedWindow();
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel);
  }
}

function setAppMenu({ onOpenWindow, onOpenLibraryWindow } = {}) {
  const isMac = process.platform === 'darwin';
  const newWindowItem = {
    label: 'Open New Window',
    accelerator: 'CmdOrCtrl+Shift+N',
    enabled: Boolean(onOpenWindow),
    click: () => {
      if (onOpenWindow) onOpenWindow();
    }
  };
  const libraryWindowItem = {
    label: 'Open Library',
    enabled: Boolean(onOpenLibraryWindow),
    click: () => {
      if (onOpenLibraryWindow) onOpenLibraryWindow();
    }
  };

  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
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
      label: 'File',
      submenu: [
        {
          label: 'Import PDF...',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendToFocused('menu:import-pdf')
        },
        {
          label: 'Open Images...',
          accelerator: 'Shift+CmdOrCtrl+O',
          click: () => sendToFocused('menu:open-images')
        },
        {
          label: 'Add Folder...',
          accelerator: 'Shift+CmdOrCtrl+L',
          click: () => sendToFocused('menu:library-location')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
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
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }]
              }
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }])
      ]
    },
    {
      label: 'View',
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
      label: 'Window',
      submenu: [
        newWindowItem,
        libraryWindowItem,
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
