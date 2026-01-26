# Architecture Design Document

Project: AI PDF Guitar Tab Reader

Status: Implementation snapshot (MVP)

Owner: BlueTriangleG

Date: 2026-01-26

Assumptions:
- V1 focuses on a PDF library and reading experience; no OCR or transcription.
- The primary asset is PDF files; rendering happens in the renderer with PDF.js.
- Platform is macOS desktop via Electron.
- Storage is local SQLite; no server dependency or sync.
- The app creates a default library folder on first launch; users can switch to a custom location.
- The app watches the active library folder for external changes.
- Input is keyboard and mouse only.
- A macOS PDFKit CLI is optional for metadata and annotation extraction.

## 1. Goals
- Provide a fast, stable PDF gallery for guitar scores/tabs.
- Deliver a reader with smooth zoom, pan, and continuous or single-page view.
- Support guided reading via auto-scroll and auto page turn.
- Include a lightweight practice metronome.
- Persist reading state across sessions.

## 2. Non-Goals
- OCR, tab parsing, or transcription in V1.
- Automatic conversion to MusicXML or structured notation.
- Camera scanning and real-time recognition.
- Cloud sync or multi-device accounts.
- Cross-platform support in V1 (Windows/Linux/mobile).

## 3. High-Level Architecture (Current)

Filesystem (library root)
  -> File scanner + watcher (main)
     -> Library service (scan/import/upsert)
        -> SQLite catalog/settings
           -> IPC events (library:changed)
              -> Renderer library UI

Renderer reader flow:
  -> IPC pdf:read (read bytes from main)
     -> PDF.js worker -> canvas rendering
        -> UI controls (zoom/scroll/view mode)

Optional metadata path:
  -> PDFKit CLI (main) -> page count, annotations, cached renders

## 4. Process Boundaries

Main process:
- Owns SQLite, library scanning, file watching.
- Hosts the PDFKit CLI adapter.
- Exposes IPC endpoints to the renderer.

Renderer process:
- React UI for library + reader.
- PDF.js document loading and rendering.
- Metronome and guided reading logic.
- Saves reading state via IPC.

Preload:
- Context-isolated API bridge (library, pdf, reader, settings, window).

## 5. Layered Architecture (Implementation)

- Presentation: React components and view models in src/renderer.
- Application: src/application/use_cases orchestrates library actions.
- Infrastructure: SQLite, filesystem, PDFKit CLI wrappers.
- Main process wiring in src/main.

Dependencies flow from renderer -> IPC -> main -> application -> infrastructure.

## 6. Technology Decisions (Current)

PDF rendering: PDF.js (renderer)
- Uses pdfjs-dist/legacy with a worker.
- Loads PDF bytes via IPC (pdf:read).
- Uses cmaps and standard_fonts copied to src/renderer/public/pdfjs.

Metadata/annotations: PDFKit CLI (main, optional)
- Swift CLI wrapper around PDFKit.
- Used for page counts; annotations endpoints exist.

File watching: chokidar
- Filters for .pdf and waits for stable writes.

SQLite driver: better-sqlite3
- Synchronous access from main process.
- WAL + foreign keys enabled.

Renderer UI: React + Vite

## 7. Core Modules (Current)

### 7.1 Library Service
- Resolves library root (setting or default).
- Scans folders for PDFs and upserts metadata.
- Watches filesystem changes and emits library:changed.
- Imports PDFs by copying into the library root.

### 7.2 SQLite Repository
- Stores documents, reading state, and settings.
- Tables for tags/collections/setlists/annotations exist but are not yet surfaced in UI.

### 7.3 PDF Service (PDFKit CLI)
- getDocumentInfo, getAnnotations, renderPage.
- Caches rendered pages under userData/LibraryCache when used.

### 7.4 Reader View Model (Renderer)
- Loads PDF bytes and renders with PDF.js.
- Manages zoom, view mode, scroll offsets, and auto-scroll/page-turn.

### 7.5 Practice Tools
- Metronome in the renderer using Web Audio.
- Visual pulse and basic time signature support.

## 8. Data Model (Current)

Document (SQLite)
- id
- title
- artist
- file_path
- page_count
- file_mtime
- file_size
- created_at
- updated_at
- last_opened

ReadingState (SQLite)
- document_id
- page_index
- zoom
- scroll_offset
- view_mode
- auto_scroll_speed
- auto_page_turn_delay

Settings
- key
- value

Scaffolded but unused in UI:
- document_tags, collections, collection_items, setlists, setlist_items, annotations

## 9. Storage and SQLite Schema (Current)

settings
- key (pk)
- value

documents
- id (pk)
- title
- artist
- file_path (unique)
- page_count
- file_mtime
- file_size
- created_at
- updated_at
- last_opened

document_tags
- document_id (fk)
- tag

collections
- id (pk)
- name

collection_items
- collection_id (fk)
- document_id (fk)
- sort_order

setlists
- id (pk)
- name

setlist_items
- setlist_id (fk)
- document_id (fk)
- sort_order
- per_item_timer

reading_states
- document_id (pk, fk)
- page_index
- zoom
- scroll_offset
- view_mode
- auto_scroll_speed
- auto_page_turn_delay

annotations
- id (pk)
- document_id (fk)
- page_index
- rect_x
- rect_y
- rect_w
- rect_h
- note
- label
- source

Indices:
- documents(file_path)
- document_tags(tag)
- collection_items(collection_id, sort_order)
- setlist_items(setlist_id, sort_order)

## 10. PDF Rendering Pipeline (Current)

Renderer:
- api.pdf.readFile(filePath) retrieves bytes from main.
- PDF.js loads the document with cMapUrl and standardFontDataUrl.
- Each page renders to a canvas via PageCanvas.

Main (optional):
- PDFKit CLI provides info, annotations, or PNG renders.
- PNG renders are cached by (path, mtime, size, scale).

## 11. IPC Contracts (Main <-> Renderer)

Main process services:
- library.listDocuments
- library.scan
- library.getRoot
- library.setRoot
- library.import
- pdf.info
- pdf.annotations
- pdf.render
- pdf.read
- reader.saveState
- settings.get
- settings.set
- window.setTrafficLights

Renderer events:
- library:changed
- menu:import-pdf
- menu:library-location

## 12. UI Surfaces (Current)

- Library sidebar: search, import, library location.
- Reader: continuous/single view, zoom, pan, auto-scroll.
- Auto page turn (single-page mode).
- Metronome and focus/fullscreen controls.

## 13. Observability

- No structured telemetry.
- Errors surface in renderer UI or console during load/render.

## 14. Risks and Mitigations

- Large PDFs can stress memory in PDF.js -> prefer lower zoom and pagination.
- File watcher churn on large folders -> debounce via chokidar awaitWriteFinish.
- Missing PDFKit CLI -> page count falls back to null (renderer still renders).

## 15. Testing Strategy (Current)

- No automated tests are present yet.
- Manual verification: library scan/import, render, auto-scroll, state persistence.

## 16. References
- PDF.js: https://github.com/mozilla/pdf.js
- pdfjs-dist: https://www.npmjs.com/package/pdfjs-dist
- Electron app.getPath: https://www.electronjs.org/docs/latest/api/app
- Chokidar: https://github.com/paulmillr/chokidar
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- Apple PDFKit Guide: https://developer.apple.com/library/archive/documentation/GraphicsImaging/Conceptual/PDFKitGuide/
