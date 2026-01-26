const chokidar = require('chokidar');
const path = require('path');

function isPdf(filePath) {
  return path.extname(filePath).toLowerCase() === '.pdf';
}

function createLibraryWatcher() {
  function watch(rootPath, handlers) {
    const watcher = chokidar.watch(rootPath, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 750,
        pollInterval: 100
      }
    });

    watcher.on('add', (filePath) => {
      if (isPdf(filePath)) handlers.onAdd(filePath);
    });
    watcher.on('change', (filePath) => {
      if (isPdf(filePath)) handlers.onChange(filePath);
    });
    watcher.on('unlink', (filePath) => {
      if (isPdf(filePath)) handlers.onRemove(filePath);
    });

    return watcher;
  }

  return { watch };
}

module.exports = { createLibraryWatcher };
