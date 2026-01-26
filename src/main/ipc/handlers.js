const { ipcMain, dialog } = require('electron');
const fs = require('fs/promises');

function registerIpcHandlers({ window, services, onOpenMetronomeWindow }) {
  const { library, pdfService } = services;

  ipcMain.handle('library:list', async () => library.listDocuments());
  ipcMain.handle('library:scan', async () => library.scanLibrary());
  ipcMain.handle('library:getRoot', async () => library.getLibraryRoot());

  ipcMain.handle('library:setRoot', async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    await library.setLibraryRoot(result.filePaths[0]);
    return library.getLibraryRoot();
  });

  ipcMain.handle('library:import', async () => {
    const result = await dialog.showOpenDialog(window, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    return library.importFiles(result.filePaths);
  });

  ipcMain.handle('pdf:info', async (_event, filePath) => {
    return await pdfService.getDocumentInfo(filePath);
  });

  ipcMain.handle('pdf:annotations', async (_event, filePath, pageIndex) => {
    return await pdfService.getAnnotations(filePath, pageIndex);
  });

  ipcMain.handle('pdf:render', async (_event, filePath, pageIndex, scale) => {
    return await pdfService.renderPage(filePath, pageIndex, scale);
  });

  ipcMain.handle('pdf:read', async (_event, filePath) => {
    return fs.readFile(filePath);
  });

  ipcMain.handle('reader:saveState', async (_event, documentId, state) => {
    library.saveReadingState(documentId, state);
    return true;
  });

  ipcMain.handle('settings:get', async (_event, key) => {
    return services.library.getSetting(key);
  });

  ipcMain.handle('settings:set', async (_event, key, value) => {
    return services.library.setSetting(key, value);
  });

  ipcMain.handle('window:setTrafficLights', async (_event, visible) => {
    if (process.platform === 'darwin' && window.setWindowButtonVisibility) {
      window.setWindowButtonVisibility(visible);
    }
    return true;
  });

  ipcMain.handle('window:openMetronome', async () => {
    if (onOpenMetronomeWindow) {
      onOpenMetronomeWindow();
    }
    return true;
  });
}

module.exports = { registerIpcHandlers };
