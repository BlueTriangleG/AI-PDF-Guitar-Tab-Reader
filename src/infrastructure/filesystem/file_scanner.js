const fs = require('fs');
const path = require('path');

function isPdfFile(filePath) {
  return path.extname(filePath).toLowerCase() === '.pdf';
}

async function walkDirectory(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkDirectory(fullPath));
    } else if (entry.isFile() && isPdfFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function ensureDirectory(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function listFolders(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => path.join(dir, entry.name));
}

async function copyPdfFiles(files, destinationRoot) {
  await ensureDirectory(destinationRoot);
  const results = [];
  for (const sourcePath of files) {
    if (!isPdfFile(sourcePath)) {
      continue;
    }
    const baseName = path.basename(sourcePath);
    let targetPath = path.join(destinationRoot, baseName);
    let counter = 1;
    while (fs.existsSync(targetPath)) {
      const parsed = path.parse(baseName);
      targetPath = path.join(destinationRoot, `${parsed.name} (${counter})${parsed.ext}`);
      counter += 1;
    }
    await fs.promises.copyFile(sourcePath, targetPath);
    results.push(targetPath);
  }
  return results;
}

function createFileScanner() {
  return {
    listPdfFiles: walkDirectory,
    listFolders,
    ensureDirectory,
    copyPdfFiles
  };
}

module.exports = { createFileScanner };
