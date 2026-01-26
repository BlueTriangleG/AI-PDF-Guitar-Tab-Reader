const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const Database = require('better-sqlite3');

function initDb() {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  const dbPath = path.join(userDataPath, 'library.sqlite');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS library_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE,
      kind TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      artist TEXT,
      file_path TEXT UNIQUE,
      page_count INTEGER,
      file_mtime INTEGER,
      file_size INTEGER,
      created_at TEXT,
      updated_at TEXT,
      last_opened TEXT
    );

    CREATE TABLE IF NOT EXISTS document_tags (
      document_id INTEGER,
      tag TEXT,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS collection_items (
      collection_id INTEGER,
      document_id INTEGER,
      sort_order INTEGER,
      FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS setlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS setlist_items (
      setlist_id INTEGER,
      document_id INTEGER,
      sort_order INTEGER,
      per_item_timer INTEGER,
      FOREIGN KEY(setlist_id) REFERENCES setlists(id) ON DELETE CASCADE,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reading_states (
      document_id INTEGER PRIMARY KEY,
      page_index INTEGER,
      zoom REAL,
      scroll_offset REAL,
      view_mode TEXT,
      auto_scroll_speed REAL,
      auto_page_turn_delay REAL,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER,
      page_index INTEGER,
      rect_x REAL,
      rect_y REAL,
      rect_w REAL,
      rect_h REAL,
      note TEXT,
      label TEXT,
      source TEXT,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(file_path);
    CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON document_tags(tag);
    CREATE INDEX IF NOT EXISTS idx_collection_items_order ON collection_items(collection_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_setlist_items_order ON setlist_items(setlist_id, sort_order);
  `);

  return db;
}

module.exports = { initDb };
