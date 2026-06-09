import { getDatabase } from "./database.js";

function json(value) {
  return JSON.stringify(value ?? {});
}

function nowIso() {
  return new Date().toISOString();
}

function buildFtsQuery(query) {
  const terms = query
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}_-]+/gu, " ").trim())
    .filter((term) => /[\p{L}\p{N}_]/u.test(term));

  if (terms.length === 0) {
    return "";
  }

  return terms.map((term) => `"${term}"`).join(" AND ");
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return Array.from(
    new Set(
      tags
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 20);
}

function optionalBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}

function defaultAnnotation(sessionId) {
  return {
    sessionId,
    favorite: false,
    archived: false,
    tags: [],
    noteText: "",
    updatedAt: null
  };
}

function deserializeAnnotationRow(row) {
  if (!row) {
    return defaultAnnotation(null);
  }

  let tags = [];
  try {
    tags = normalizeTags(JSON.parse(row.tagsJson || "[]"));
  } catch {
    tags = [];
  }

  const archived = Boolean(row.archived);
  return {
    sessionId: row.sessionId || null,
    favorite: archived ? false : Boolean(row.favorite),
    archived,
    tags,
    noteText: row.noteText || "",
    updatedAt: row.updatedAt || null
  };
}

function getAnnotationForSession(db, sessionId) {
  const row = db.prepare(`
    SELECT
      session_id AS sessionId,
      favorite,
      archived,
      tags_json AS tagsJson,
      note_text AS noteText,
      updated_at AS updatedAt
    FROM session_annotations
    WHERE session_id = ?
  `).get(sessionId);

  const annotation = deserializeAnnotationRow(row);
  return annotation.sessionId ? annotation : defaultAnnotation(sessionId);
}

function buildSearchBody(session, annotation) {
  const parts = [session.sourceLabel || ""];

  if (session.messages?.length) {
    parts.push(session.messages.map((message) => message.content).join("\n\n"));
    parts.push(
      session.messages
        .flatMap((message) => message.referencedFiles || [])
        .filter(Boolean)
        .join(" ")
    );
  }

  if (annotation.tags.length) {
    parts.push(annotation.tags.join(" "));
  }

  if (annotation.noteText) {
    parts.push(annotation.noteText);
  }

  return parts.join("\n\n").trim();
}

function upsertSessionRecord(db, session) {
  db.prepare(`
    INSERT INTO sessions (
      id, source_id, source_label, source_session_id, title, summary, workspace_path,
      workspace_name, created_at, updated_at, status, resume_type, fingerprint,
      source_path, parse_confidence, metadata_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      source_id = excluded.source_id,
      source_label = excluded.source_label,
      source_session_id = excluded.source_session_id,
      title = excluded.title,
      summary = excluded.summary,
      workspace_path = excluded.workspace_path,
      workspace_name = excluded.workspace_name,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      status = excluded.status,
      resume_type = excluded.resume_type,
      fingerprint = excluded.fingerprint,
      source_path = excluded.source_path,
      parse_confidence = excluded.parse_confidence,
      metadata_json = excluded.metadata_json
  `).run(
    session.id,
    session.sourceId,
    session.sourceLabel,
    session.sourceSessionId,
    session.title,
    session.summary,
    session.workspacePath,
    session.workspaceName,
    session.createdAt,
    session.updatedAt,
    session.status,
    session.resumeType,
    session.fingerprint,
    session.sourcePath,
    session.parseConfidence,
    json(session.metadata)
  );
}

function replaceSessionMessages(db, session) {
  db.prepare(`DELETE FROM messages WHERE session_id = ?`).run(session.id);

  const insertMessage = db.prepare(`
    INSERT INTO messages (
      id, session_id, ordinal, role, content, timestamp, model, referenced_files_json, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const message of session.messages) {
    insertMessage.run(
      message.id,
      session.id,
      message.ordinal,
      message.role,
      message.content,
      message.timestamp,
      message.model,
      json(message.referencedFiles || []),
      json(message.metadata)
    );
  }
}

function refreshSearchDocumentWithSession(db, session) {
  const annotation = getAnnotationForSession(db, session.id);

  db.prepare(`DELETE FROM session_search WHERE session_id = ?`).run(session.id);
  db.prepare(`
    INSERT INTO session_search (
      session_id, title, summary, workspace_name, body
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    session.id,
    session.title,
    [session.summary || "", annotation.noteText].filter(Boolean).join("\n\n"),
    [session.workspaceName || "", annotation.tags.join(" ")].filter(Boolean).join(" "),
    buildSearchBody(session, annotation)
  );
}

function getSessionFingerprint(db, sessionId) {
  const row = db.prepare(`SELECT fingerprint FROM sessions WHERE id = ?`).get(sessionId);
  return row?.fingerprint || null;
}

function sessionExists(db, sessionId) {
  if (!sessionId) {
    return false;
  }

  const row = db.prepare(`SELECT 1 AS found FROM sessions WHERE id = ?`).get(sessionId);
  return Boolean(row?.found);
}

export function upsertImportedSessions(sessions) {
  const db = getDatabase();
  const stats = {
    scannedSessions: sessions.length,
    importedSessions: 0,
    updatedSessions: 0,
    skippedSessions: 0,
    failedSessions: 0,
    errors: []
  };

  for (const session of sessions) {
    db.exec("BEGIN TRANSACTION");
    try {
      const existingFingerprint = getSessionFingerprint(db, session.id);
      if (existingFingerprint && existingFingerprint === session.fingerprint) {
        stats.skippedSessions += 1;
        db.exec("COMMIT");
        continue;
      }

      upsertSessionRecord(db, session);
      replaceSessionMessages(db, session);
      refreshSearchDocumentWithSession(db, session);

      if (existingFingerprint) {
        stats.updatedSessions += 1;
      } else {
        stats.importedSessions += 1;
      }

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      stats.failedSessions += 1;
      if (stats.errors.length < 20) {
        stats.errors.push({
          sessionId: session?.id || "",
          sourcePath: session?.sourcePath || "",
          error: String(error.message || error)
        });
      }
    }
  }

  return stats;
}

export function listSessions({
  query = "",
  limit = 200,
  favoritesOnly = false,
  includeArchived = false,
  archivedOnly = false,
  sourceId = ""
} = {}) {
  const db = getDatabase();
  const archivedClause = archivedOnly
    ? "AND COALESCE(a.archived, 0) = 1"
    : includeArchived
      ? ""
      : "AND COALESCE(a.archived, 0) = 0";
  const favoriteClause = favoritesOnly ? "AND COALESCE(a.favorite, 0) = 1 AND COALESCE(a.archived, 0) = 0" : "";
  const sourceClauseFts = sourceId ? "AND s.source_id = ?" : "";
  const sourceClausePlain = sourceId ? "AND sessions.source_id = ?" : "";

  if (query.trim()) {
    const ftsQuery = buildFtsQuery(query);
    try {
      if (!ftsQuery) {
        throw new Error("Empty FTS query.");
      }

      const statement = db.prepare(`
        SELECT
          s.id,
          s.source_id AS sourceId,
          s.source_label AS sourceLabel,
          s.source_session_id AS sourceSessionId,
          s.title,
          s.summary,
          s.workspace_name AS workspaceName,
          s.workspace_path AS workspacePath,
          s.updated_at AS updatedAt,
          s.created_at AS createdAt,
          s.status,
          s.resume_type AS resumeType,
          s.source_path AS sourcePath,
          s.parse_confidence AS parseConfidence,
          s.metadata_json AS metadataJson,
          COALESCE(a.favorite, 0) AS favorite,
          COALESCE(a.archived, 0) AS archived,
          COALESCE(a.tags_json, '[]') AS tagsJson,
          COALESCE(a.note_text, '') AS noteText,
          COALESCE(a.updated_at, '') AS annotationUpdatedAt,
          snippet(session_search, 4, '<mark>', '</mark>', ' ... ', 24) AS searchSnippet
        FROM session_search
        JOIN sessions s ON s.id = session_search.session_id
        LEFT JOIN session_annotations a ON a.session_id = s.id
        WHERE session_search MATCH ?
        ${archivedClause}
        ${favoriteClause}
        ${sourceClauseFts}
        ORDER BY rank
        LIMIT ?
      `);
      const params = sourceId ? [ftsQuery, sourceId, limit] : [ftsQuery, limit];
      return statement.all(...params).map(deserializeSessionRow);
    } catch {
      const fallback = db.prepare(`
        SELECT
          sessions.id,
          sessions.source_id AS sourceId,
          sessions.source_label AS sourceLabel,
          sessions.source_session_id AS sourceSessionId,
          sessions.title,
          sessions.summary,
          sessions.workspace_name AS workspaceName,
          sessions.workspace_path AS workspacePath,
          sessions.updated_at AS updatedAt,
          sessions.created_at AS createdAt,
          sessions.status,
          sessions.resume_type AS resumeType,
          sessions.source_path AS sourcePath,
          sessions.parse_confidence AS parseConfidence,
          sessions.metadata_json AS metadataJson,
          COALESCE(a.favorite, 0) AS favorite,
          COALESCE(a.archived, 0) AS archived,
          COALESCE(a.tags_json, '[]') AS tagsJson,
          COALESCE(a.note_text, '') AS noteText,
          COALESCE(a.updated_at, '') AS annotationUpdatedAt
        FROM sessions
        LEFT JOIN session_annotations a ON a.session_id = sessions.id
        WHERE (
          sessions.title LIKE ? OR
          sessions.summary LIKE ? OR
          COALESCE(a.note_text, '') LIKE ? OR
          sessions.workspace_name LIKE ?
        )
        ${archivedClause}
        ${favoriteClause}
        ${sourceClausePlain}
        ORDER BY COALESCE(sessions.updated_at, sessions.created_at) DESC
        LIMIT ?
      `);
      const likeQuery = `%${query.trim()}%`;
      const params = sourceId
        ? [likeQuery, likeQuery, likeQuery, likeQuery, sourceId, limit]
        : [likeQuery, likeQuery, likeQuery, likeQuery, limit];
      return fallback.all(...params).map(deserializeSessionRow);
    }
  }

  const statement = db.prepare(`
    SELECT
      sessions.id,
      sessions.source_id AS sourceId,
      sessions.source_label AS sourceLabel,
      sessions.source_session_id AS sourceSessionId,
      sessions.title,
      sessions.summary,
      sessions.workspace_name AS workspaceName,
      sessions.workspace_path AS workspacePath,
      sessions.updated_at AS updatedAt,
      sessions.created_at AS createdAt,
      sessions.status,
      sessions.resume_type AS resumeType,
      sessions.source_path AS sourcePath,
      sessions.parse_confidence AS parseConfidence,
      sessions.metadata_json AS metadataJson,
      COALESCE(a.favorite, 0) AS favorite,
      COALESCE(a.archived, 0) AS archived,
      COALESCE(a.tags_json, '[]') AS tagsJson,
      COALESCE(a.note_text, '') AS noteText,
      COALESCE(a.updated_at, '') AS annotationUpdatedAt
    FROM sessions
    LEFT JOIN session_annotations a ON a.session_id = sessions.id
    WHERE 1 = 1
    ${archivedClause}
    ${favoriteClause}
    ${sourceClausePlain}
    ORDER BY COALESCE(sessions.updated_at, sessions.created_at) DESC
    LIMIT ?
  `);

  const params = sourceId ? [sourceId, limit] : [limit];
  return statement.all(...params).map(deserializeSessionRow);
}

export function getSessionDetail(sessionId) {
  const db = getDatabase();
  const sessionStatement = db.prepare(`
    SELECT
      sessions.id,
      sessions.source_id AS sourceId,
      sessions.source_label AS sourceLabel,
      sessions.source_session_id AS sourceSessionId,
      sessions.title,
      sessions.summary,
      sessions.workspace_name AS workspaceName,
      sessions.workspace_path AS workspacePath,
      sessions.updated_at AS updatedAt,
      sessions.created_at AS createdAt,
      sessions.status,
      sessions.resume_type AS resumeType,
      sessions.source_path AS sourcePath,
      sessions.parse_confidence AS parseConfidence,
      sessions.metadata_json AS metadataJson,
      COALESCE(a.favorite, 0) AS favorite,
      COALESCE(a.archived, 0) AS archived,
      COALESCE(a.tags_json, '[]') AS tagsJson,
      COALESCE(a.note_text, '') AS noteText,
      COALESCE(a.updated_at, '') AS annotationUpdatedAt
    FROM sessions
    LEFT JOIN session_annotations a ON a.session_id = sessions.id
    WHERE sessions.id = ?
  `);
  const messageStatement = db.prepare(`
    SELECT
      id,
      ordinal,
      role,
      content,
      timestamp,
      model,
      referenced_files_json AS referencedFilesJson,
      metadata_json AS metadataJson
    FROM messages
    WHERE session_id = ?
    ORDER BY ordinal ASC
  `);

  const session = sessionStatement.get(sessionId);
  if (!session) {
    return null;
  }

  const parseArray = (value) => {
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const parseObject = (value) => {
    try {
      const parsed = JSON.parse(value || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };

  return {
    ...deserializeSessionRow(session),
    messages: messageStatement.all(sessionId).map((row) => ({
      id: row.id,
      ordinal: row.ordinal,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      model: row.model,
      referencedFiles: parseArray(row.referencedFilesJson),
      metadata: parseObject(row.metadataJson)
    }))
  };
}

export function getStats() {
  const db = getDatabase();
  const counts = db.prepare(`
    SELECT
      COUNT(*) AS sessionCount,
      COALESCE((SELECT COUNT(*) FROM messages), 0) AS messageCount,
      COALESCE((SELECT COUNT(*) FROM sessions s LEFT JOIN session_annotations a ON a.session_id = s.id WHERE COALESCE(a.archived, 0) = 0), 0) AS visibleSessionCount,
      COALESCE((SELECT COUNT(*) FROM sessions WHERE source_id = 'copilot'), 0) AS copilotSessionCount,
      COALESCE((SELECT COUNT(*) FROM sessions WHERE source_id = 'codex'), 0) AS codexSessionCount,
      COALESCE((SELECT COUNT(*) FROM sessions WHERE source_id = 'claude'), 0) AS claudeSessionCount,
      COALESCE((SELECT COUNT(*) FROM session_annotations a JOIN sessions s ON s.id = a.session_id WHERE a.favorite = 1 AND COALESCE(a.archived, 0) = 0), 0) AS favoriteCount,
      COALESCE((SELECT COUNT(*) FROM session_annotations a JOIN sessions s ON s.id = a.session_id WHERE a.archived = 1), 0) AS archivedCount
    FROM sessions
  `).get();

  const newest = db.prepare(`
    SELECT COALESCE(updated_at, created_at) AS updatedAt
    FROM sessions
    ORDER BY COALESCE(updated_at, created_at) DESC
    LIMIT 1
  `).get();

  return {
    sessionCount: counts.sessionCount,
    messageCount: counts.messageCount,
    visibleSessionCount: counts.visibleSessionCount,
    copilotSessionCount: counts.copilotSessionCount,
    codexSessionCount: counts.codexSessionCount,
    claudeSessionCount: counts.claudeSessionCount,
    favoriteCount: counts.favoriteCount,
    archivedCount: counts.archivedCount,
    lastIndexedAt: newest?.updatedAt || null
  };
}

export function updateSessionAnnotation(sessionId, updates = {}) {
  const db = getDatabase();
  if (!sessionExists(db, sessionId)) {
    return null;
  }

  const current = getAnnotationForSession(db, sessionId);
  const updateFavorite = optionalBoolean(updates.favorite);
  const updateArchived = optionalBoolean(updates.archived);
  let nextFavorite = updateFavorite ?? current.favorite;
  let nextArchived = updateArchived ?? current.archived;

  if (updateFavorite === true) {
    nextArchived = false;
  } else if (updateArchived === true) {
    nextFavorite = false;
  }

  const next = {
    sessionId,
    favorite: nextFavorite,
    archived: nextArchived,
    tags: updates.tags ? normalizeTags(updates.tags) : current.tags,
    noteText: typeof updates.noteText === "string" ? updates.noteText.trim() : current.noteText,
    updatedAt: nowIso()
  };

  db.prepare(`
    INSERT INTO session_annotations (
      session_id, favorite, archived, tags_json, note_text, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      favorite = excluded.favorite,
      archived = excluded.archived,
      tags_json = excluded.tags_json,
      note_text = excluded.note_text,
      updated_at = excluded.updated_at
  `).run(
    next.sessionId,
    next.favorite ? 1 : 0,
    next.archived ? 1 : 0,
    json(next.tags),
    next.noteText,
    next.updatedAt
  );

  refreshSearchDocument(sessionId);
  return getAnnotationForSession(db, sessionId);
}

export function refreshSearchDocument(sessionId) {
  const db = getDatabase();
  const session = getSessionDetail(sessionId);
  if (!session) {
    return false;
  }

  refreshSearchDocumentWithSession(db, session);
  return true;
}

function deserializeSessionRow(row) {
  let metadata = {};
  try {
    metadata = JSON.parse(row.metadataJson || "{}");
  } catch {
    metadata = {};
  }

  return {
    id: row.id,
    sourceId: row.sourceId,
    sourceLabel: row.sourceLabel,
    sourceSessionId: row.sourceSessionId,
    title: row.title,
    summary: row.summary,
    workspaceName: row.workspaceName,
    workspacePath: row.workspacePath,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    status: row.status,
    resumeType: row.resumeType,
    sourcePath: row.sourcePath,
    parseConfidence: row.parseConfidence,
    metadata,
    searchSnippet: row.searchSnippet || null,
    annotation: deserializeAnnotationRow({
      sessionId: row.id,
      favorite: row.favorite,
      archived: row.archived,
      tagsJson: row.tagsJson,
      noteText: row.noteText,
      updatedAt: row.annotationUpdatedAt
    })
  };
}
