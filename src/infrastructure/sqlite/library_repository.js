const path = require('path');

function createLibraryRepository(db) {
  const listStmt = db.prepare(`
    SELECT d.*, rs.page_index, rs.zoom, rs.scroll_offset, rs.view_mode,
           rs.auto_scroll_speed, rs.auto_page_turn_delay
    FROM documents d
    LEFT JOIN reading_states rs ON rs.document_id = d.id
    ORDER BY d.title COLLATE NOCASE ASC
  `);

  const listRecentStmt = db.prepare(`
    SELECT d.*, rs.page_index, rs.zoom, rs.scroll_offset, rs.view_mode,
           rs.auto_scroll_speed, rs.auto_page_turn_delay
    FROM documents d
    LEFT JOIN reading_states rs ON rs.document_id = d.id
    WHERE d.last_opened IS NOT NULL
    ORDER BY d.last_opened DESC
    LIMIT ?
  `);

  const listByPrefixStmt = db.prepare(`
    SELECT d.*, rs.page_index, rs.zoom, rs.scroll_offset, rs.view_mode,
           rs.auto_scroll_speed, rs.auto_page_turn_delay
    FROM documents d
    LEFT JOIN reading_states rs ON rs.document_id = d.id
    WHERE d.file_path LIKE ?
    ORDER BY d.title COLLATE NOCASE ASC
  `);

  const upsertStmt = db.prepare(`
    INSERT INTO documents (
      title, artist, file_path, page_count, file_mtime, file_size, created_at, updated_at, last_opened
    ) VALUES (
      @title, @artist, @file_path, @page_count, @file_mtime, @file_size, @created_at, @updated_at, @last_opened
    )
    ON CONFLICT(file_path) DO UPDATE SET
      title = excluded.title,
      artist = excluded.artist,
      page_count = excluded.page_count,
      file_mtime = excluded.file_mtime,
      file_size = excluded.file_size,
      updated_at = excluded.updated_at
  `);

  const deleteByPathStmt = db.prepare('DELETE FROM documents WHERE file_path = ?');
  const deleteByIdStmt = db.prepare('DELETE FROM documents WHERE id = ?');
  const selectPathsStmt = db.prepare('SELECT file_path FROM documents');
  const selectByIdStmt = db.prepare('SELECT * FROM documents WHERE id = ?');
  const updateLastOpenedStmt = db.prepare('UPDATE documents SET last_opened = ? WHERE id = ?');

  const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const setSettingStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

  const listSourcesStmt = db.prepare('SELECT id, path, kind, created_at FROM library_sources ORDER BY kind ASC, path ASC');
  const upsertSourceStmt = db.prepare(`
    INSERT INTO library_sources (path, kind, created_at)
    VALUES (@path, @kind, @created_at)
    ON CONFLICT(path) DO UPDATE SET
      kind = excluded.kind
  `);
  const deleteSourceStmt = db.prepare('DELETE FROM library_sources WHERE path = ?');

  const upsertReadingStateStmt = db.prepare(`
    INSERT INTO reading_states (
      document_id, page_index, zoom, scroll_offset, view_mode, auto_scroll_speed, auto_page_turn_delay
    ) VALUES (
      @document_id, @page_index, @zoom, @scroll_offset, @view_mode, @auto_scroll_speed, @auto_page_turn_delay
    )
    ON CONFLICT(document_id) DO UPDATE SET
      page_index = excluded.page_index,
      zoom = excluded.zoom,
      scroll_offset = excluded.scroll_offset,
      view_mode = excluded.view_mode,
      auto_scroll_speed = excluded.auto_scroll_speed,
      auto_page_turn_delay = excluded.auto_page_turn_delay
  `);

  function listDocuments() {
    return listStmt.all();
  }

  function listRecentDocuments(limit = 12) {
    return listRecentStmt.all(limit);
  }

  function listDocumentsByPrefix(prefix) {
    return listByPrefixStmt.all(prefix);
  }

  function upsertDocument(document) {
    return upsertStmt.run(document);
  }

  function deleteByPath(filePath) {
    return deleteByPathStmt.run(filePath);
  }

  function deleteById(id) {
    return deleteByIdStmt.run(id);
  }

  function pruneMissing(existingPaths) {
    const existingSet = new Set(existingPaths);
    const rows = selectPathsStmt.all();
    const tx = db.transaction(() => {
      for (const row of rows) {
        if (!existingSet.has(row.file_path)) {
          deleteByPathStmt.run(row.file_path);
        }
      }
    });
    tx();
  }

  function getDocumentById(id) {
    return selectByIdStmt.get(id);
  }

  function updateLastOpened(id, timestamp) {
    return updateLastOpenedStmt.run(timestamp, id);
  }

  function getSetting(key) {
    const row = getSettingStmt.get(key);
    return row ? row.value : null;
  }

  function setSetting(key, value) {
    setSettingStmt.run(key, value);
  }

  function listSources() {
    return listSourcesStmt.all();
  }

  function upsertSource(source) {
    return upsertSourceStmt.run(source);
  }

  function deleteSource(pathValue) {
    return deleteSourceStmt.run(pathValue);
  }

  function saveReadingState(state) {
    upsertReadingStateStmt.run(state);
  }

  return {
    listDocuments,
    listRecentDocuments,
    listDocumentsByPrefix,
    upsertDocument,
    deleteByPath,
    deleteById,
    pruneMissing,
    getDocumentById,
    updateLastOpened,
    getSetting,
    setSetting,
    listSources,
    upsertSource,
    deleteSource,
    saveReadingState
  };
}

module.exports = { createLibraryRepository };
