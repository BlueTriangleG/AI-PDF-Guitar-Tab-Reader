# Architecture Design Document

Project: AI PDF Guitar Tab Reader

Status: Draft (requirements-aligned, research-backed)

Owner: BlueTriangleG

Date: 2025-02-14

Assumptions:
- V1 focuses on a PDF gallery and reading experience; no OCR or transcription.
- The primary asset is PDF files (digital or scanned), but V1 only renders them for reading.
- The app must include practice utilities like a metronome and guided page traversal.
- Platform is macOS desktop via Electron (latest).
- Storage is local SQLite; no server dependency or sync.
- The app creates a default library folder on first launch; users can switch to a custom location.
- The app supports live file watching to reflect external changes in the library folder.
- Users can choose an iCloud Drive folder as the library location.
- Input is keyboard and mouse only.
- PDF rendering uses macOS PDFKit via a native bridge (renderer consumes bitmap/tiles).
- If PDFs contain embedded annotations, they are displayed; user-created annotations are a future slot.

## 1. Goals
- Provide a fast, stable PDF gallery for guitar scores/tabs.
- Deliver a focused reader with smooth zoom, page navigation, and multi-page view.
- Support guided reading: auto-scroll, page-turn automation, and per-document presets.
- Include essential practice tools (metronome, count-in, session timer).
- Persist reading state and user preferences across sessions.

## 2. Non-Goals
- OCR extraction, tab parsing, or transcription in V1.
- Automatic conversion to MusicXML or other structured notation.
- Camera-based scanning and real-time recognition.
- Cloud sync (unless explicitly required later).
- Cross-platform support in V1 (Windows/Linux/mobile).

## 3. High-Level Architecture

PDF Import
  -> Library Indexer (metadata, tags, collections)
     -> PDF Renderer (page cache, zoom, tiling)
        -> Reader UI (view modes, navigation)
           -> Guided Reading (auto-scroll, page turn)
              -> Practice Tools (metronome, timer)

Future extension:
  -> OCR / AI Services (optional)

## 4. Layered Architecture (Maintainability)

The codebase follows a layered architecture to keep UI, domain logic, and infrastructure concerns separate.

Layers (top to bottom):
- Presentation: Electron renderer UI, view models, UI state.
- Application: use cases (open document, start metronome, auto-scroll).
- Domain: core models and rules (Document, ReadingState, MetronomeSettings).
- Infrastructure: SQLite, file system, PDF rendering, audio output.

Rules:
- Dependencies only point downward.
- Domain has no knowledge of Electron, SQLite, or UI.
- Application coordinates domain and infrastructure via interfaces.

## 5. Technology Decisions (Research)

PDF rendering: PDF.js (renderer)
- PDF.js provides a web-based rendering pipeline that runs in the renderer process with a dedicated worker.
- We load PDF bytes via IPC and render pages to canvas, avoiding file:// constraints in dev.
- Decision: use PDF.js for rendering; keep the PDFKit Swift CLI as an optional metadata helper.

File watching: chokidar
- Chokidar normalizes file system events, supports atomic writes, and has awaitWriteFinish for large file writes.
- Decision: use chokidar to watch the library folder and update the SQLite catalog.

SQLite driver: better-sqlite3
- better-sqlite3 provides a synchronous API, full transaction support, and worker thread support for long-running tasks.
- Decision: keep the SQLite connection in the main process with a small worker queue for heavier queries and bulk scans.

Default paths: Electron app.getPath
- Use app.getPath("documents") for the user-visible default library folder.
- Use app.getPath("userData") for the SQLite database and app settings.

Renderer UI: React + Vite
- React provides the component model for the reader, library, and practice tools UI.
- Vite builds the renderer bundle and supports fast iteration during Electron development.

## 6. Core Modules

### 6.1 Library and Catalog
- Import PDFs from disk and organize into collections/setlists.
- Extract lightweight metadata (title, page count, page size).
- Provide search and filters (tags, composer/artist).
- Manage a default library folder and user-selected library locations.
- Watch the active library folder for external changes; update catalog on add/change/unlink.

### 6.2 PDF Rendering Engine
- Use PDFKit in the main process for rendering pages to images/tiles.
- Provide an IPC-backed renderer service for page rasterization and caching.
- Support view modes: single page, continuous scroll, facing pages.
- Handle mixed page sizes and orientations.

### 6.3 Reader Engine
- Navigation: thumbnails, page scrubber, page jump.
- Reading state persistence: last page, zoom, scroll offset.
- Accessibility: adjustable zoom presets and contrast settings.
- Smooth scrolling uses time-based movement to avoid jitter across refresh rates.

### 6.4 Guided Reading
- Auto-scroll with adjustable speed (pixels per second).
- Auto page turn with configurable delay or per-page timing.
- Profiles per document or per setlist.

### 6.5 Practice Tools
- Metronome: BPM, time signature, accents, audio/visual cues.
- Count-in and practice timer.
- Optional setlist runner: step through pieces with timers.

### 6.6 Annotations and Markers (Placeholder for V1)
- If the PDF includes embedded annotations, display them in the reader.
- Provide a slot in the data model and UI for future user-created annotations.

### 6.7 Future OCR and AI Services
- OCR for scanned PDFs.
- Tab extraction and structured export.
- These are isolated behind a service interface to avoid coupling with V1.

## 7. Data Model (Draft)

Library
- documents: [Document]
- collections: [Collection]
- setlists: [Setlist]

Document
- id
- title
- artist
- file_path
- page_count
- tags: [string]
- last_opened
- reading_state: ReadingState
- annotations: [Annotation]

ReadingState
- page_index
- zoom
- scroll_offset
- view_mode
- auto_scroll_speed
- auto_page_turn_delay

Collection
- name
- document_ids: [id]

Setlist
- name
- items: [SetlistItem]

SetlistItem
- document_id
- order
- per_item_timer (optional)

Annotation
- page_index
- rect (x, y, w, h)
- note
- label
- source (embedded | user)

MetronomeSettings
- bpm
- time_signature
- accents
- sound_profile
- count_in_bars

PracticeSession
- setlist_id
- start_time
- duration
- metronome_settings

## 8. Storage and SQLite Schema (Draft)

documents
- id (pk)
- title
- artist
- file_path (unique)
- file_hash (optional)
- page_count
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

## 9. PDF Rendering Pipeline (PDFKit)

Open document:
- Load PDFDocument from file path.
- Read page count and media box sizes.
- Extract embedded annotations for overlay metadata (page, bounds, type).

Render page:
- Request page image at scale or tile coordinates.
- Use PDFPage to draw into a bitmap context.
- Return PNG or raw RGBA buffer to the renderer.

Cache strategy:
- Memory LRU by (document_id, page_index, scale).
- Prefetch next/previous pages based on scroll direction.
- Optional disk cache for very large documents (future).

## 10. IPC Contracts (Main <-> Renderer)

Main process services:
- library.scanFolder(path)
- library.listDocuments()
- library.getDocument(id)
- pdf.open(path) -> document_handle
- pdf.getPageInfo(handle)
- pdf.renderPage(handle, page_index, scale, tile)
- pdf.getAnnotations(handle, page_index)
- settings.get()
- settings.set(partial)

Renderer process:
- reader.setAutoScroll(speed)
- reader.setPageTurn(delay)
- metronome.start(settings)
- metronome.stop()

## 11. Suggested Folder Structure

repo_root/
  README.md
  ARCHITECTURE.md
  src/
    main/                    # Electron main process
      bootstrap/
      ipc/
      windows/
    renderer/                # Electron renderer process (UI)
      ui/
      view_models/
    application/             # Use cases and orchestration
      use_cases/
      ports/
    domain/                  # Entities and domain logic
      models/
      services/
    infrastructure/          # DB, file system, PDF rendering, audio
      sqlite/
      filesystem/
      pdf/                   # PDFKit wrapper, render cache
      audio/
  tests/
    unit/
    integration/
  data/
    samples/

## 12. Interfaces

App UI:
- Library view: import, search, tags, collections.
- Reader view: page view, continuous scroll, navigation.
- Practice overlay: metronome, auto-scroll, timers.

Local API (internal):
- open_document(path) -> Document
- save_reading_state(document_id, state)
- start_metronome(settings)

## 13. Observability
- Performance metrics: render time, cache hits, memory usage.
- Error logging for failed PDF loads.
- Optional debug overlay for scroll/page timing.

## 14. Risks and Mitigations
- Large PDFs can cause slow rendering
  -> tile-based rendering and cache limits
- Auto-scroll jitter on low-end devices
  -> time-based animation and speed smoothing
- Mixed page sizes break continuous layout
  -> per-page scale normalization
- External file edits cause inconsistent state
  -> watcher debounce + file hash re-check

## 15. Testing Strategy
- Rendering tests with small/large PDFs.
- Reader state persistence tests.
- Guided reading timing tests.
- Metronome accuracy tests (audio and visual).
- Library watcher tests (add/change/remove).

## 16. References
- Apple PDFKit Programming Guide (overview, PDFView/PDFDocument/PDFPage, annotations): https://developer.apple.com/library/archive/documentation/GraphicsImaging/Conceptual/PDFKitGuide/
- Chokidar file watching: https://github.com/paulmillr/chokidar
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- Electron app.getPath: https://github.com/electron/electron/blob/main/docs/api/app.md
