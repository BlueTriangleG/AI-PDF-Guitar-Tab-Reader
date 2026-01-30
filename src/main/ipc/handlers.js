const { BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');

function registerIpcHandlers({ window, services, onOpenMetronomeWindow, onOpenReaderWindow, onOpenLibraryWindow }) {
  const { library, pdfService } = services;

  ipcMain.handle('library:list', async () => library.listDocuments());
  ipcMain.handle('library:scan', async () => library.scanLibrary());
  ipcMain.handle('library:getRoot', async () => library.getLibraryRoot());
  ipcMain.handle('library:listSources', async () => library.listSources());
  ipcMain.handle('library:listDocumentsBySource', async (_event, sourcePath) => {
    return library.listDocumentsBySource(sourcePath);
  });
  ipcMain.handle('library:listRecent', async (_event, limit) => {
    return library.listRecentDocuments(limit);
  });
  ipcMain.handle('library:listFolders', async (_event, parentPath) => {
    return library.listFolders(parentPath);
  });
  ipcMain.handle('library:createFolder', async (_event, name, parentPath) => {
    return library.createFolder(name, parentPath);
  });

  ipcMain.handle('library:setRoot', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || window;
    const result = await dialog.showOpenDialog(owner, {
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    await library.addLinkedSource(result.filePaths[0]);
    return library.getLibraryRoot();
  });

  ipcMain.handle('library:import', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || window;
    const result = await dialog.showOpenDialog(owner, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (result.canceled || result.filePaths.length === 0) return [];
    return library.importFiles(result.filePaths);
  });

  ipcMain.handle('library:linkFolder', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || window;
    const result = await dialog.showOpenDialog(owner, {
      properties: ['openDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return library.addLinkedSource(result.filePaths[0]);
  });

  ipcMain.handle('library:linkFolderPath', async (_event, folderPath) => {
    if (!folderPath) return null;
    return library.addLinkedSource(folderPath);
  });

  ipcMain.handle('library:unlinkFolder', async (_event, folderPath) => {
    await library.removeLinkedSource(folderPath);
    return true;
  });

  ipcMain.handle('library:deleteDocuments', async (_event, docIds, alsoDeleteFiles) => {
    return library.deleteDocuments(docIds, alsoDeleteFiles);
  });

  ipcMain.handle('library:deleteFolder', async (_event, folderPath) => {
    return library.deleteFolder(folderPath);
  });

  ipcMain.handle('library:moveFolder', async (_event, sourcePath, targetParentPath) => {
    return library.moveFolder(sourcePath, targetParentPath);
  });

  ipcMain.handle('library:moveDocument', async (_event, docId, targetFolderPath) => {
    return library.moveDocument(docId, targetFolderPath);
  });

  ipcMain.handle('library:copyDocument', async (_event, docId, targetFolderPath) => {
    return library.copyDocument(docId, targetFolderPath);
  });

  ipcMain.handle('library:copyFolder', async (_event, sourcePath, targetParentPath) => {
    return library.copyFolder(sourcePath, targetParentPath);
  });

  ipcMain.handle('library:importFilesTo', async (_event, filePaths, targetFolder) => {
    if (!filePaths || !filePaths.length) return [];
    return library.importFiles(filePaths, targetFolder);
  });

  ipcMain.handle('library:handleDroppedPaths', async (_event, paths, targetFolder) => {
    if (!paths || !paths.length) return { folders: [], files: [] };

    const folders = [];
    const pdfFiles = [];

    for (const filePath of paths) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
          folders.push(filePath);
        } else if (stats.isFile() && path.extname(filePath).toLowerCase() === '.pdf') {
          pdfFiles.push(filePath);
        }
      } catch (error) {
        // Skip inaccessible paths
      }
    }

    // Link folders as sources
    const linkedFolders = [];
    for (const folderPath of folders) {
      const linked = await library.addLinkedSource(folderPath);
      if (linked) linkedFolders.push(linked);
    }

    // Import PDF files
    let importedFiles = [];
    if (pdfFiles.length > 0) {
      importedFiles = await library.importFiles(pdfFiles, targetFolder);
    }

    return { folders: linkedFolders, files: importedFiles };
  });

  ipcMain.handle('library:openDocument', async (_event, docId) => {
    if (!onOpenReaderWindow) return false;
    const target = onOpenReaderWindow();
    if (!target || target.isDestroyed()) return false;
    const send = () => target.webContents.send('reader:open-document', docId);
    if (target.webContents.isLoading()) {
      target.webContents.once('did-finish-load', send);
    } else {
      send();
    }
    target.focus();
    return true;
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

  ipcMain.handle('file:toUrl', async (_event, filePath) => {
    return pathToFileURL(filePath).toString();
  });

  ipcMain.handle('file:readAsDataUrl', async (_event, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp'
    };
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    const buffer = await fs.readFile(filePath);
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
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

  ipcMain.handle('window:setTrafficLights', async (event, visible) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || window;
    if (process.platform === 'darwin' && owner?.setWindowButtonVisibility) {
      owner.setWindowButtonVisibility(visible);
    }
    return true;
  });

  ipcMain.handle('window:openMetronome', async () => {
    if (onOpenMetronomeWindow) {
      onOpenMetronomeWindow();
    }
    return true;
  });

  ipcMain.handle('window:openLibrary', async () => {
    if (onOpenLibraryWindow) {
      onOpenLibraryWindow();
    }
    return true;
  });
}

module.exports = { registerIpcHandlers };
