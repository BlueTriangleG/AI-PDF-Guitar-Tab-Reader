const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('api', {
  library: {
    listDocuments: () => ipcRenderer.invoke('library:list'),
    rescan: () => ipcRenderer.invoke('library:scan'),
    getRoot: () => ipcRenderer.invoke('library:getRoot'),
    setRoot: () => ipcRenderer.invoke('library:setRoot'),
    importFiles: () => ipcRenderer.invoke('library:import'),
    listSources: () => ipcRenderer.invoke('library:listSources'),
    listDocumentsBySource: (sourcePath) => ipcRenderer.invoke('library:listDocumentsBySource', sourcePath),
    listRecent: (limit) => ipcRenderer.invoke('library:listRecent', limit),
    listFolders: (parentPath) => ipcRenderer.invoke('library:listFolders', parentPath),
    createFolder: (name, parentPath) => ipcRenderer.invoke('library:createFolder', name, parentPath),
    linkFolder: () => ipcRenderer.invoke('library:linkFolder'),
    linkFolderPath: (folderPath) => ipcRenderer.invoke('library:linkFolderPath', folderPath),
    unlinkFolder: (folderPath) => ipcRenderer.invoke('library:unlinkFolder', folderPath),
    deleteDocuments: (docIds, alsoDeleteFiles) => ipcRenderer.invoke('library:deleteDocuments', docIds, alsoDeleteFiles),
    deleteFolder: (folderPath) => ipcRenderer.invoke('library:deleteFolder', folderPath),
    moveFolder: (sourcePath, targetParentPath) => ipcRenderer.invoke('library:moveFolder', sourcePath, targetParentPath),
    moveDocument: (docId, targetFolderPath) => ipcRenderer.invoke('library:moveDocument', docId, targetFolderPath),
    copyDocument: (docId, targetFolderPath) => ipcRenderer.invoke('library:copyDocument', docId, targetFolderPath),
    copyFolder: (sourcePath, targetParentPath) => ipcRenderer.invoke('library:copyFolder', sourcePath, targetParentPath),
    importFilesTo: (filePaths, targetFolder) => ipcRenderer.invoke('library:importFilesTo', filePaths, targetFolder),
    handleDroppedPaths: (paths, targetFolder) => ipcRenderer.invoke('library:handleDroppedPaths', paths, targetFolder),
    openDocument: (docId) => ipcRenderer.invoke('library:openDocument', docId)
  },
  pdf: {
    getInfo: (filePath) => ipcRenderer.invoke('pdf:info', filePath),
    getAnnotations: (filePath, pageIndex) => ipcRenderer.invoke('pdf:annotations', filePath, pageIndex),
    renderPage: (filePath, pageIndex, scale) => ipcRenderer.invoke('pdf:render', filePath, pageIndex, scale),
    readFile: (filePath) => ipcRenderer.invoke('pdf:read', filePath)
  },
  reader: {
    saveReadingState: (documentId, state) => ipcRenderer.invoke('reader:saveState', documentId, state)
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value)
  },
  window: {
    setTrafficLights: (visible) => ipcRenderer.invoke('window:setTrafficLights', visible),
    openMetronome: () => ipcRenderer.invoke('window:openMetronome'),
    openLibrary: () => ipcRenderer.invoke('window:openLibrary'),
    openLibraryAt: (folderPath) => ipcRenderer.invoke('window:openLibraryAt', folderPath)
  },
  fileUrlFromPath: (filePath) => ipcRenderer.invoke('file:toUrl', filePath),
  fileReadAsDataUrl: (filePath) => ipcRenderer.invoke('file:readAsDataUrl', filePath),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  onLibraryChanged: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('library:changed', handler);
    return () => ipcRenderer.removeListener('library:changed', handler);
  },
  onMenuImportPdf: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu:import-pdf', handler);
    return () => ipcRenderer.removeListener('menu:import-pdf', handler);
  },
  onMenuLibraryLocation: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('menu:library-location', handler);
    return () => ipcRenderer.removeListener('menu:library-location', handler);
  },
  onReaderOpenDocument: (callback) => {
    const handler = (_event, docId) => callback(docId);
    ipcRenderer.on('reader:open-document', handler);
    return () => ipcRenderer.removeListener('reader:open-document', handler);
  },
  onLibraryRevealFolder: (callback) => {
    const handler = (_event, folderPath) => callback(folderPath);
    ipcRenderer.on('library:reveal-folder', handler);
    return () => ipcRenderer.removeListener('library:reveal-folder', handler);
  }
});
