const fs = require('fs');
const path = require('path');

const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];

function isSupportedFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

function isPdfFile(filePath) {
  return path.extname(filePath).toLowerCase() === '.pdf';
}

function isImageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function getFileType(filePath) {
  if (isPdfFile(filePath)) return 'pdf';
  if (isImageFile(filePath)) return 'image';
  return null;
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
    } else if (entry.isFile() && isSupportedFile(fullPath)) {
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

async function copySupportedFiles(files, destinationRoot) {
  await ensureDirectory(destinationRoot);
  const results = [];
  for (const sourcePath of files) {
    if (!isSupportedFile(sourcePath)) {
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
    listSupportedFiles: walkDirectory,
    listFolders,
    ensureDirectory,
    copyPdfFiles: copySupportedFiles,
    copySupportedFiles,
    isPdfFile,
    isImageFile,
    getFileType
  };
}

module.exports = { createFileScanner };
