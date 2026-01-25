# AI PDF Guitar Tab Reader

macOS Electron app for a guitar score PDF gallery and focused reading experience.

## Quick Start

```bash
npm install
```

Development (Vite + Electron):

```bash
npm run dev
```

Recommended: Node.js 20+ for Vite and pdfjs-dist tooling.

PDF.js assets:
- `npm install` copies `cmaps` and `standard_fonts` into `src/renderer/public/pdfjs/`
- These are required for reliable text rendering.

Production build (renderer) + run:

```bash
npm run build:renderer
npm start
```

## Notes
- Default library folder: `~/Documents/AI Guitar Tabs`
- SQLite database: `app.getPath("userData")/library.sqlite`
- PDF rendering is handled in the renderer using PDF.js.
- The PDFKit CLI is optional and only used for lightweight metadata (page count) when available.

## Packaging the PDFKit CLI
- Build the CLI on a macOS build machine: `npm run build:pdfkit`
- Copy the compiled binary into the app resources at `pdfkit-cli/pdfkit-cli`
- The app will load it from `process.resourcesPath` when packaged
- You can override the path at runtime with `PDFKIT_CLI_PATH=/path/to/pdfkit-cli`
