const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');

function createLibraryService({ libraryRepo, pdfService, fileScanner, watcher, getDefaultLibraryPath }) {
  const emitter = new EventEmitter();
  let libraryRoot = null;
  let activeWatcher = null;

  async function init() {
    const storedRoot = libraryRepo.getSetting('library_root');
    libraryRoot = storedRoot || getDefaultLibraryPath();
    if (storedRoot) {
      try {
        await fs.promises.access(storedRoot, fs.constants.R_OK);
      } catch (error) {
        libraryRoot = getDefaultLibraryPath();
      }
    }
    await fileScanner.ensureDirectory(libraryRoot);
    libraryRepo.setSetting('library_root', libraryRoot);
    await scanLibrary();
    startWatcher();
  }

  function getLibraryRoot() {
    return libraryRoot;
  }

  async function setLibraryRoot(newRoot) {
    libraryRoot = newRoot;
    await fileScanner.ensureDirectory(libraryRoot);
    libraryRepo.setSetting('library_root', libraryRoot);
    await scanLibrary();
    startWatcher();
    emitter.emit('changed');
  }

  async function scanLibrary() {
    if (!libraryRoot) return [];
    const files = await fileScanner.listPdfFiles(libraryRoot);
    libraryRepo.pruneMissing(files);
    for (const filePath of files) {
      await upsertFile(filePath);
    }
    emitter.emit('changed');
    return files;
  }

  async function upsertFile(filePath) {
    const stats = await fs.promises.stat(filePath);
    let pageCount = null;
    try {
      const info = await pdfService.getDocumentInfo(filePath);
      pageCount = info.pageCount ?? null;
    } catch (error) {
      pageCount = null;
    }

    const now = new Date().toISOString();
    const title = path.basename(filePath, path.extname(filePath));

    libraryRepo.upsertDocument({
      title,
      artist: null,
      file_path: filePath,
      page_count: pageCount,
      file_mtime: stats.mtimeMs,
      file_size: stats.size,
      created_at: now,
      updated_at: now,
      last_opened: null
    });
  }

  async function removeFile(filePath) {
    libraryRepo.deleteByPath(filePath);
  }

  function startWatcher() {
    if (!libraryRoot) return;
    if (activeWatcher) {
      activeWatcher.close();
    }
    activeWatcher = watcher.watch(libraryRoot, {
      onAdd: async (filePath) => {
        await upsertFile(filePath);
        emitter.emit('changed');
      },
      onChange: async (filePath) => {
        await upsertFile(filePath);
        emitter.emit('changed');
      },
      onRemove: async (filePath) => {
        await removeFile(filePath);
        emitter.emit('changed');
      }
    });
  }

  async function importFiles(filePaths) {
    if (!libraryRoot) return [];
    const copied = await fileScanner.copyPdfFiles(filePaths, libraryRoot);
    for (const filePath of copied) {
      await upsertFile(filePath);
    }
    emitter.emit('changed');
    return copied;
  }

  function listDocuments() {
    return libraryRepo.listDocuments();
  }

  function getSetting(key) {
    return libraryRepo.getSetting(key);
  }

  function setSetting(key, value) {
    return libraryRepo.setSetting(key, value);
  }

  function saveReadingState(documentId, state) {
    const now = new Date().toISOString();
    libraryRepo.saveReadingState({
      document_id: documentId,
      page_index: state.pageIndex,
      zoom: state.zoom,
      scroll_offset: state.scrollOffset,
      view_mode: state.viewMode,
      auto_scroll_speed: state.autoScrollSpeed,
      auto_page_turn_delay: state.autoPageTurnDelay
    });
    libraryRepo.updateLastOpened(documentId, now);
  }

  return {
    init,
    getLibraryRoot,
    setLibraryRoot,
    scanLibrary,
    importFiles,
    listDocuments,
    getSetting,
    setSetting,
    saveReadingState,
    on: emitter.on.bind(emitter)
  };
}

module.exports = { createLibraryService };
