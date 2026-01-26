const path = require('path');
const { app } = require('electron');
const { initDb } = require('../../infrastructure/sqlite/db');
const { createLibraryRepository } = require('../../infrastructure/sqlite/library_repository');
const { createPdfService } = require('../../infrastructure/pdf/pdf_service');
const { createFileScanner } = require('../../infrastructure/filesystem/file_scanner');
const { createLibraryWatcher } = require('../../infrastructure/filesystem/library_watcher');
const { createLibraryService } = require('../../application/use_cases/library_service');

async function initServices() {
  const db = initDb();
  const libraryRepo = createLibraryRepository(db);
  const pdfService = createPdfService();
  const fileScanner = createFileScanner();
  const watcher = createLibraryWatcher();

  const library = createLibraryService({
    libraryRepo,
    pdfService,
    fileScanner,
    watcher,
    getDefaultLibraryPath: () => path.join(app.getPath('userData'), 'library'),
  });

  await library.init();

  return {
    db,
    library,
    pdfService,
  };
}

module.exports = { initServices };
