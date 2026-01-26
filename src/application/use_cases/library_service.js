const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');

function createLibraryService({ libraryRepo, pdfService, fileScanner, watcher, getDefaultLibraryPath }) {
  const emitter = new EventEmitter();
  let internalRoot = null;
  let linkedSources = [];
  const activeWatchers = new Map();

  function normalizeRoot(root) {
    if (!root) return '';
    return root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  }

  function isUnderRoot(targetPath, rootPath) {
    if (!targetPath || !rootPath) return false;
    const normalizedRoot = normalizeRoot(rootPath);
    const normalizedTarget = normalizeRoot(targetPath);
    return normalizedTarget.startsWith(normalizedRoot);
  }

  function resolveFolderPath(parentPath) {
    if (!parentPath) return internalRoot;
    if (isUnderRoot(parentPath, internalRoot)) return parentPath;
    const linked = linkedSources.find((source) => isUnderRoot(parentPath, source.path));
    if (linked) return parentPath;
    return internalRoot;
  }

  function getAllRoots() {
    const roots = [internalRoot, ...linkedSources.map((source) => source.path)];
    return roots.filter(Boolean);
  }

  async function init() {
    const storedInternal = libraryRepo.getSetting('library_internal_root');
    const legacyRoot = libraryRepo.getSetting('library_root');
    internalRoot = storedInternal || getDefaultLibraryPath();
    if (storedInternal) {
      try {
        await fs.promises.access(storedInternal, fs.constants.R_OK);
      } catch (error) {
        internalRoot = getDefaultLibraryPath();
      }
    }
    await fileScanner.ensureDirectory(internalRoot);
    libraryRepo.setSetting('library_internal_root', internalRoot);

    if (legacyRoot && legacyRoot !== internalRoot) {
      const now = new Date().toISOString();
      libraryRepo.upsertSource({ path: legacyRoot, kind: 'linked', created_at: now });
    }

    linkedSources = libraryRepo.listSources().filter((source) => source.kind === 'linked');
    await scanLibrary();
    startWatchers();
  }

  function getLibraryRoot() {
    return internalRoot;
  }

  function listSources() {
    return [
      { path: internalRoot, kind: 'internal' },
      ...linkedSources
    ].filter((source) => source.path);
  }

  async function setLibraryRoot(newRoot) {
    if (!newRoot) return;
    internalRoot = newRoot;
    await fileScanner.ensureDirectory(internalRoot);
    libraryRepo.setSetting('library_internal_root', internalRoot);
    await scanLibrary();
    startWatchers();
    emitter.emit('changed');
  }

  async function addLinkedSource(folderPath) {
    if (!folderPath || folderPath === internalRoot) return null;
    try {
      await fs.promises.access(folderPath, fs.constants.R_OK);
    } catch (error) {
      return null;
    }
    const now = new Date().toISOString();
    libraryRepo.upsertSource({ path: folderPath, kind: 'linked', created_at: now });
    linkedSources = libraryRepo.listSources().filter((source) => source.kind === 'linked');
    await scanLibrary();
    startWatchers();
    emitter.emit('changed');
    return folderPath;
  }

  async function removeLinkedSource(folderPath) {
    if (!folderPath) return;
    libraryRepo.deleteSource(folderPath);
    linkedSources = libraryRepo.listSources().filter((source) => source.kind === 'linked');
    await scanLibrary();
    startWatchers();
    emitter.emit('changed');
  }

  async function createFolder(folderName, parentPath = internalRoot) {
    if (!internalRoot) return null;
    const safeName = path.basename((folderName || '').trim());
    if (!safeName) return null;
    const base = resolveFolderPath(parentPath);
    const targetPath = path.join(base, safeName);
    await fileScanner.ensureDirectory(targetPath);
    emitter.emit('changed');
    return targetPath;
  }

  async function listFolders(parentPath = internalRoot) {
    if (!internalRoot) return [];
    try {
      const base = resolveFolderPath(parentPath);
      return await fileScanner.listFolders(base);
    } catch (error) {
      return [];
    }
  }

  async function scanLibrary() {
    const roots = getAllRoots();
    const filesByRoot = new Map();
    for (const root of roots) {
      try {
        const files = await fileScanner.listPdfFiles(root);
        filesByRoot.set(root, files);
      } catch (error) {
        // keep last known entries for unavailable roots
      }
    }

    for (const [root, files] of filesByRoot.entries()) {
      await pruneMissingForRoot(root, files);
      for (const filePath of files) {
        await upsertFile(filePath);
      }
    }

    emitter.emit('changed');
    return Array.from(filesByRoot.values()).flat();
  }

  async function pruneMissingForRoot(root, existingPaths) {
    const normalized = normalizeRoot(root);
    const docs = libraryRepo.listDocumentsByPrefix(`${normalized}%`);
    const existingSet = new Set(existingPaths);
    for (const doc of docs) {
      if (!existingSet.has(doc.file_path)) {
        libraryRepo.deleteByPath(doc.file_path);
      }
    }
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

  function startWatchers() {
    const roots = getAllRoots();
    for (const [root, active] of activeWatchers.entries()) {
      if (!roots.includes(root)) {
        active.close();
        activeWatchers.delete(root);
      }
    }
    for (const root of roots) {
      if (activeWatchers.has(root)) continue;
      const nextWatcher = watcher.watch(root, {
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
      activeWatchers.set(root, nextWatcher);
    }
  }

  async function importFiles(filePaths, targetFolder = internalRoot) {
    if (!internalRoot) return [];
    const destination = targetFolder && targetFolder.startsWith(internalRoot)
      ? targetFolder
      : internalRoot;
    const copied = await fileScanner.copyPdfFiles(filePaths, destination);
    for (const filePath of copied) {
      await upsertFile(filePath);
    }
    emitter.emit('changed');
    return copied;
  }

  function listDocuments() {
    return libraryRepo.listDocuments();
  }

  function listRecentDocuments(limit) {
    return libraryRepo.listRecentDocuments(limit);
  }

  function listDocumentsBySource(sourcePath) {
    if (!sourcePath) return [];
    const prefix = normalizeRoot(sourcePath);
    return libraryRepo.listDocumentsByPrefix(`${prefix}%`);
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
    listSources,
    setLibraryRoot,
    addLinkedSource,
    removeLinkedSource,
    createFolder,
    listFolders,
    scanLibrary,
    importFiles,
    listDocuments,
    listRecentDocuments,
    listDocumentsBySource,
    getSetting,
    setSetting,
    saveReadingState,
    on: emitter.on.bind(emitter)
  };
}

module.exports = { createLibraryService };
