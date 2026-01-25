const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFile, execFileSync } = require('child_process');
const { app } = require('electron');

function createPdfService() {
  let cliPath = null;

  function getCliPath() {
    if (cliPath) return cliPath;
    if (process.env.PDFKIT_CLI_PATH) {
      cliPath = process.env.PDFKIT_CLI_PATH;
      return cliPath;
    }

    if (app.isPackaged) {
      cliPath = path.join(process.resourcesPath, 'pdfkit-cli', 'pdfkit-cli');
      return cliPath;
    }

    const appRoot = app.getAppPath();
    cliPath = path.join(appRoot, 'src', 'infrastructure', 'pdf', 'pdfkit-cli', 'bin', 'pdfkit-cli');
    return cliPath;
  }

  function ensureCli() {
    const resolved = getCliPath();
    if (fs.existsSync(resolved)) return resolved;

    if (app.isPackaged) {
      throw new Error(`pdfkit-cli not found at ${resolved}. Ensure it is packaged in the app resources.`);
    }

    const appRoot = app.getAppPath();
    const script = path.join(appRoot, 'scripts', 'build-pdfkit-cli.sh');
    execFileSync('bash', [script], { stdio: 'inherit' });
    return resolved;
  }

  function runCli(args) {
    const resolved = ensureCli();
    return new Promise((resolve, reject) => {
      execFile(resolved, args, { encoding: 'utf8' }, (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve((stdout || '').trim());
      });
    });
  }

  function cacheKey(filePath) {
    const stats = fs.statSync(filePath);
    const key = `${filePath}:${stats.mtimeMs}:${stats.size}`;
    return crypto.createHash('sha1').update(key).digest('hex');
  }

  async function getDocumentInfo(filePath) {
    const output = await runCli(['info', filePath]);
    return JSON.parse(output || '{}');
  }

  async function getAnnotations(filePath, pageIndex) {
    const output = await runCli(['annotations', filePath, String(pageIndex)]);
    return JSON.parse(output || '{}');
  }

  async function renderPage(filePath, pageIndex, scale) {
    const docKey = cacheKey(filePath);
    const cacheRoot = path.join(app.getPath('userData'), 'LibraryCache', docKey);
    const safeScale = Number(scale).toFixed(2);
    const filename = `p${pageIndex}@${safeScale}.png`;
    const outputPath = path.join(cacheRoot, filename);

    if (!fs.existsSync(outputPath)) {
      await runCli(['render', filePath, String(pageIndex), String(scale), outputPath]);
    }

    return outputPath;
  }

  return {
    getDocumentInfo,
    getAnnotations,
    renderPage
  };
}

module.exports = { createPdfService };
