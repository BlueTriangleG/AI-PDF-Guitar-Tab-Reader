const { contextBridge, ipcRenderer } = require('electron');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('api', {
  library: {
    listDocuments: () => ipcRenderer.invoke('library:list'),
    rescan: () => ipcRenderer.invoke('library:scan'),
    getRoot: () => ipcRenderer.invoke('library:getRoot'),
    setRoot: () => ipcRenderer.invoke('library:setRoot'),
    importFiles: () => ipcRenderer.invoke('library:import')
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
    openMetronome: () => ipcRenderer.invoke('window:openMetronome')
  },
  fileUrlFromPath: (filePath) => pathToFileURL(filePath).toString(),
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
  }
});
