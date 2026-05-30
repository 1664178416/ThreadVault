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
    .map((term) => term.replaceAll('"', '""').trim())
    .filter(Boolean);

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

  return {
    sessionId: row.sessionId || null,
    favorite: Boolean(row.favorite),
    archived: Boolean(row.archived),
    tags: normalizeTags(JSON.parse(row.tagsJson || "[]")),
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
  const parts = [];

  if (session.messages?.length) {
    parts.push(session.messages.map((message) => message.content).join("\n\n"));
  }

  if (annotation.tags.length) {
    parts.push(annotation.tags.join(" "));
  }

  if (annotation.noteText) {
    parts.push(annotation.noteText);
  }

  return parts.join("\n\n").trim();
}

export function replaceAllSessions(sessions) {
  const db = getDatabase();
  const insertSession = db.prepare(`
    INSERT INTO sessions (
      id, source_id, source_label, source_session_id, title, summary, workspace_path,
      workspace_name, created_at, updated_at, status, resume_type, fingerprint,
      source_path, parse_confidence, metadata_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  const insertMessage = db.prepare(`
    INSERT INTO messages (
      id, session_id, ordinal, role, content, timestamp, model, referenced_files_json, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSearch = db.prepare(`
    INSERT INTO session_search (
      session_id, title, summary, workspace_name, body
    ) VALUES (?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN TRANSACTION");
  try {
    db.exec("DELETE FROM session_search");
    db.exec("DELETE FROM messages");
    db.exec("DELETE FROM sessions");

    for (const session of sessions) {
      const annotation = getAnnotationForSession(db, session.id);

      insertSession.run(
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

      insertSearch.run(
        session.id,
        session.title,
        [session.summary || "", annotation.noteText].filter(Boolean).join("\n\n"),
        [session.workspaceName || "", annotation.tags.join(" ")].filter(Boolean).join(" "),
        buildSearchBody(session, annotation)
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function listSessions({ query = "", limit = 200, favoritesOnly = false, includeArchived = false } = {}) {
  const db = getDatabase();
  const archivedClause = includeArchived ? "" : "AND COALESCE(a.archived, 0) = 0";
  const favoriteClause = favoritesOnly ? "AND COALESCE(a.favorite, 0) = 1" : "";

  if (query.trim()) {
    const ftsQuery = buildFtsQuery(query);
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
      ORDER BY rank
      LIMIT ?
    `);
    try {
      return statement.all(ftsQuery, limit).map(deserializeSessionRow);
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
        WHERE (sessions.title LIKE ? OR sessions.summary LIKE ? OR COALESCE(a.note_text, '') LIKE ?)
        ${archivedClause}
        ${favoriteClause}
        ORDER BY COALESCE(sessions.updated_at, sessions.created_at) DESC
        LIMIT ?
      `);
      const likeQuery = `%${query.trim()}%`;
      return fallback.all(likeQuery, likeQuery, likeQuery, limit).map(deserializeSessionRow);
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
    ORDER BY COALESCE(sessions.updated_at, sessions.created_at) DESC
    LIMIT ?
  `);

  return statement.all(limit).map(deserializeSessionRow);
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

  return {
    ...deserializeSessionRow(session),
    messages: messageStatement.all(sessionId).map((row) => ({
      id: row.id,
      ordinal: row.ordinal,
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      model: row.model,
      referencedFiles: JSON.parse(row.referencedFilesJson || "[]"),
      metadata: JSON.parse(row.metadataJson || "{}")
    }))
  };
}

export function getStats() {
  const db = getDatabase();
  const counts = db.prepare(`
    SELECT
      COUNT(*) AS sessionCount,
      COALESCE((SELECT COUNT(*) FROM messages), 0) AS messageCount,
      COALESCE((SELECT COUNT(*) FROM sessions WHERE source_id = 'copilot'), 0) AS copilotSessionCount,
      COALESCE((SELECT COUNT(*) FROM session_annotations a JOIN sessions s ON s.id = a.session_id WHERE a.favorite = 1), 0) AS favoriteCount,
      COALESCE((SELECT COUNT(*) FROM session_annotations a JOIN sessions s ON s.id = a.session_id WHERE a.archived = 1), 0) AS archivedCount
    FROM sessions
  `).get();

  const newest = db.prepare(`
    SELECT updated_at AS updatedAt
    FROM sessions
    ORDER BY COALESCE(updated_at, created_at) DESC
    LIMIT 1
  `).get();

  return {
    sessionCount: counts.sessionCount,
    messageCount: counts.messageCount,
    copilotSessionCount: counts.copilotSessionCount,
    favoriteCount: counts.favoriteCount,
    archivedCount: counts.archivedCount,
    lastIndexedAt: newest?.updatedAt || null
  };
}

export function updateSessionAnnotation(sessionId, updates = {}) {
  const db = getDatabase();
  const current = getAnnotationForSession(db, sessionId);
  const next = {
    sessionId,
    favorite: updates.favorite ?? current.favorite,
    archived: updates.archived ?? current.archived,
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

  const annotation = session.annotation || defaultAnnotation(sessionId);
  db.prepare(`DELETE FROM session_search WHERE session_id = ?`).run(sessionId);
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

  return true;
}

function deserializeSessionRow(row) {
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
    metadata: JSON.parse(row.metadataJson || "{}"),
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
