import { getDatabase } from "./database.js";
import { redactLocalPath, safeErrorMessage, snippet } from "../utils/text.js";
import { fileCacheKey } from "../utils/fs.js";

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 64;
const MAX_NOTE_TEXT_LENGTH = 20000;
const MAX_SOURCE_ID_LENGTH = 128;
const MAX_PARSER_VERSION_LENGTH = 256;
const MESSAGE_INSERT_BATCH_SIZE = 100;

const SESSION_ANNOTATION_QUERY = `
  SELECT
    session_id AS sessionId,
    favorite,
    archived,
    tags_json AS tagsJson,
    note_text AS noteText,
    updated_at AS updatedAt
  FROM session_annotations
  WHERE session_id = ?
`;

function json(value) {
  return JSON.stringify(value ?? {});
}

function nowIso() {
  return new Date().toISOString();
}

function buildFtsQuery(query) {
  const terms = Array.from(String(query || "").matchAll(/[\p{L}\p{N}_][\p{L}\p{N}_-]*/gu), (match) => match[0])
    .filter((term) => /[\p{L}\p{N}_]/u.test(term))
    .slice(0, 12);

  if (terms.length === 0) {
    return "";
  }

  return terms.map((term) => `"${term.replaceAll("\"", "\"\"")}"*`).join(" AND ");
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalized = [];
  const seen = new Set();

  for (const tag of tags) {
    const text = String(tag || "").replace(/\s+/g, " ").trim().slice(0, MAX_TAG_LENGTH);
    const key = text.toLocaleLowerCase();
    if (!text || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(text);
    if (normalized.length >= MAX_TAGS) {
      break;
    }
  }

  return normalized;
}

function normalizeAnnotationNote(value) {
  return String(value || "").trim().slice(0, MAX_NOTE_TEXT_LENGTH);
}

function annotationTagsEqual(left, right) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

function optionalBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeQuery(value) {
  return String(value || "").trim().slice(0, 500);
}

function escapeLikeQuery(value) {
  return `%${String(value || "").replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
}

function normalizeLimit(value, fallback = 200, maximum = 500) {
  const limit = Number(value || fallback);
  if (!Number.isInteger(limit) || limit <= 0) {
    return fallback;
  }
  return Math.min(limit, maximum);
}

function normalizeSourceId(value) {
  if (typeof value !== "string") {
    return "";
  }

  const sourceId = value.trim();
  if (!sourceId) {
    return "";
  }

  if (sourceId.length > MAX_SOURCE_ID_LENGTH || /[\u0000-\u001f\u007f]/u.test(sourceId)) {
    return null;
  }

  return sourceId;
}

function fallbackSnippetTerms(query) {
  const normalized = normalizeQuery(query);
  const terms = normalized
    ? [normalized, ...Array.from(normalized.matchAll(/[\p{L}\p{N}_][\p{L}\p{N}_-]*/gu), (match) => match[0])]
    : [];
  const seen = new Set();

  return terms
    .map((term) => term.trim())
    .filter(Boolean)
    .filter((term) => {
      const key = term.toLocaleLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

function indexOfInsensitive(value, term) {
  return String(value || "").toLocaleLowerCase().indexOf(String(term || "").toLocaleLowerCase());
}

function highlightFallbackSnippet(value, terms) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  const firstMatch = terms
    .map((term) => ({ term, index: indexOfInsensitive(normalized, term) }))
    .filter((match) => match.index >= 0)
    .sort((left, right) => left.index - right.index || right.term.length - left.term.length)[0];

  if (!firstMatch) {
    return snippet(normalized, 180);
  }

  const windowStart = Math.max(0, firstMatch.index - 72);
  const windowEnd = Math.min(normalized.length, firstMatch.index + firstMatch.term.length + 96);
  let fragment = normalized.slice(windowStart, windowEnd);
  const prefix = windowStart > 0 ? "... " : "";
  const suffix = windowEnd < normalized.length ? " ..." : "";
  const lowerFragment = fragment.toLocaleLowerCase();
  const ranges = [];

  for (const term of [...terms].sort((left, right) => right.length - left.length)) {
    const lowerTerm = term.toLocaleLowerCase();
    let searchFrom = 0;
    while (searchFrom < lowerFragment.length) {
      const matchIndex = lowerFragment.indexOf(lowerTerm, searchFrom);
      if (matchIndex < 0) {
        break;
      }

      const start = matchIndex;
      const end = start + term.length;
      const overlaps = ranges.some((range) => start < range.end && end > range.start);
      if (!overlaps) {
        ranges.push({ start, end });
      }
      searchFrom = end;
    }
  }

  for (const range of ranges.sort((left, right) => right.start - left.start)) {
    fragment = `${fragment.slice(0, range.start)}<mark>${fragment.slice(range.start, range.end)}</mark>${fragment.slice(range.end)}`;
  }

  return `${prefix}${fragment}${suffix}`;
}

function buildFallbackSearchSnippet(row, query) {
  const terms = fallbackSnippetTerms(query);
  if (terms.length === 0) {
    return null;
  }

  const values = [
    row.title,
    row.summary,
    row.noteText,
    row.workspaceName,
    row.tagsJson,
    row.fallbackMessageContent,
    row.fallbackReferencedFiles,
    row.fallbackModel
  ];

  for (const value of values) {
    const highlighted = highlightFallbackSnippet(value, terms);
    if (highlighted.includes("<mark>")) {
      return highlighted;
    }
  }

  return null;
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

function getAnnotationForSession(db, sessionId, statement = null) {
  const row = (statement || db.prepare(SESSION_ANNOTATION_QUERY)).get(sessionId);

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

function sourceFileCacheRecord(session) {
  const sourceFile = session?.sourceFile;
  const parserVersion = String(sourceFile?.parserVersion || "").trim();
  if (
    typeof session?.sourcePath !== "string" ||
    !session.sourcePath ||
    typeof session?.sourceId !== "string" ||
    !session.sourceId ||
    typeof session?.id !== "string" ||
    !session.id ||
    !Number.isSafeInteger(sourceFile?.size) ||
    sourceFile.size < 0 ||
    !Number.isFinite(sourceFile?.modifiedAtMs) ||
    !Number.isFinite(sourceFile?.changedAtMs) ||
    !parserVersion ||
    parserVersion.length > MAX_PARSER_VERSION_LENGTH ||
    /[\u0000-\u001f\u007f]/u.test(parserVersion)
  ) {
    return null;
  }

  return {
    sourcePath: session.sourcePath,
    sourceId: session.sourceId,
    sessionId: session.id,
    fileSize: sourceFile.size,
    modifiedAtMs: sourceFile.modifiedAtMs,
    changedAtMs: sourceFile.changedAtMs,
    parserVersion
  };
}

function prepareSourceFileCacheStatement(db) {
  return db.prepare(`
    INSERT INTO source_scan_cache (
      source_path, source_id, session_id, file_size, modified_at_ms,
      changed_at_ms, parser_version, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_path) DO UPDATE SET
      source_id = excluded.source_id,
      session_id = excluded.session_id,
      file_size = excluded.file_size,
      modified_at_ms = excluded.modified_at_ms,
      changed_at_ms = excluded.changed_at_ms,
      parser_version = excluded.parser_version,
      updated_at = excluded.updated_at
  `);
}

function upsertSourceFileCache(statement, record) {
  statement.run(
    record.sourcePath,
    record.sourceId,
    record.sessionId,
    record.fileSize,
    record.modifiedAtMs,
    record.changedAtMs,
    record.parserVersion,
    nowIso()
  );
}

function prepareSearchDocumentStatements(db) {
  return {
    getAnnotation: db.prepare(SESSION_ANNOTATION_QUERY),
    deleteSearch: db.prepare(`DELETE FROM session_search WHERE session_id = ?`),
    insertSearch: db.prepare(`
      INSERT INTO session_search (
        session_id, title, summary, workspace_name, body
      ) VALUES (?, ?, ?, ?, ?)
    `)
  };
}

function prepareImportWriteStatements(db) {
  return {
    db,
    upsertSession: db.prepare(`
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
    `),
    deleteMessages: db.prepare(`DELETE FROM messages WHERE session_id = ?`),
    insertMessageBatches: new Map(),
    ...prepareSearchDocumentStatements(db)
  };
}

function upsertSessionRecord(statement, session) {
  statement.run(
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

function replaceSessionMessages(statements, session) {
  statements.deleteMessages.run(session.id);

  for (let start = 0; start < session.messages.length; start += MESSAGE_INSERT_BATCH_SIZE) {
    const batch = session.messages.slice(start, start + MESSAGE_INSERT_BATCH_SIZE);
    let statement = statements.insertMessageBatches.get(batch.length);
    if (!statement) {
      const rows = Array.from({ length: batch.length }, () => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
      statement = statements.db.prepare(`
        INSERT INTO messages (
          id, session_id, ordinal, role, content, timestamp, model, referenced_files_json, metadata_json
        ) VALUES ${rows}
      `);
      statements.insertMessageBatches.set(batch.length, statement);
    }

    const parameters = [];
    for (const message of batch) {
      parameters.push(
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
    statement.run(...parameters);
  }
}

function refreshSearchDocumentWithSession(db, session, statements = prepareSearchDocumentStatements(db)) {
  const annotation = getAnnotationForSession(db, session.id, statements.getAnnotation);

  statements.deleteSearch.run(session.id);
  statements.insertSearch.run(
    session.id,
    session.title,
    [session.summary || "", annotation.noteText].filter(Boolean).join("\n\n"),
    [session.workspaceName || "", annotation.tags.join(" ")].filter(Boolean).join(" "),
    buildSearchBody(session, annotation)
  );
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
    cachedSessions: 0,
    failedSessions: 0,
    errors: []
  };

  if (sessions.length === 0) {
    return stats;
  }

  let fingerprintStatement = null;
  let writeStatements = null;
  let sourceCacheStatement = null;
  let transactionOpen = false;

  const openSessionSavepoint = () => {
    if (!transactionOpen) {
      db.exec("BEGIN TRANSACTION");
      transactionOpen = true;
    }
    db.exec("SAVEPOINT threadvault_session_import");
  };

  for (const session of sessions) {
    let savepointOpen = false;
    try {
      if (session?.scanCacheHit === true) {
        stats.skippedSessions += 1;
        stats.cachedSessions += 1;
        continue;
      }

      const sourceCacheRecord = sourceFileCacheRecord(session);
      fingerprintStatement ||= db.prepare(`SELECT fingerprint FROM sessions WHERE id = ?`);
      const existing = fingerprintStatement.get(session.id);
      if (existing && existing.fingerprint === session.fingerprint) {
        if (sourceCacheRecord) {
          openSessionSavepoint();
          savepointOpen = true;
          sourceCacheStatement ||= prepareSourceFileCacheStatement(db);
          upsertSourceFileCache(sourceCacheStatement, sourceCacheRecord);
          db.exec("RELEASE SAVEPOINT threadvault_session_import");
          savepointOpen = false;
        }
        stats.skippedSessions += 1;
        continue;
      }

      writeStatements ||= prepareImportWriteStatements(db);
      openSessionSavepoint();
      savepointOpen = true;
      upsertSessionRecord(writeStatements.upsertSession, session);
      replaceSessionMessages(writeStatements, session);
      refreshSearchDocumentWithSession(db, session, writeStatements);
      if (sourceCacheRecord) {
        sourceCacheStatement ||= prepareSourceFileCacheStatement(db);
        upsertSourceFileCache(sourceCacheStatement, sourceCacheRecord);
      }

      db.exec("RELEASE SAVEPOINT threadvault_session_import");
      savepointOpen = false;

      if (existing) {
        stats.updatedSessions += 1;
      } else {
        stats.importedSessions += 1;
      }
    } catch (error) {
      if (savepointOpen) {
        try {
          db.exec("ROLLBACK TO SAVEPOINT threadvault_session_import");
          db.exec("RELEASE SAVEPOINT threadvault_session_import");
        } catch (rollbackError) {
          try {
            db.exec("ROLLBACK");
          } catch {
            // Preserve the savepoint failure that made the batch state uncertain.
          }
          transactionOpen = false;
          throw rollbackError;
        }
      }
      stats.failedSessions += 1;
      if (stats.errors.length < 20) {
        stats.errors.push({
          sessionId: session?.id || "",
          sourcePath: redactLocalPath(session?.sourcePath),
          error: safeErrorMessage(error, "Session import failed.")
        });
      }
    }
  }

  if (transactionOpen) {
    try {
      db.exec("COMMIT");
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // Preserve the commit failure; the connection may already have rolled back.
      }
      throw error;
    }
  }

  return stats;
}

export function getSourceScanCache() {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT
      cache.source_path AS sourcePath,
      cache.source_id AS sourceId,
      cache.session_id AS sessionId,
      cache.file_size AS fileSize,
      cache.modified_at_ms AS modifiedAtMs,
      cache.changed_at_ms AS changedAtMs,
      cache.parser_version AS parserVersion,
      sessions.fingerprint,
      sessions.updated_at AS sessionUpdatedAt
    FROM source_scan_cache cache
    JOIN sessions ON sessions.id = cache.session_id
  `).all();
  const cache = new Map();

  for (const row of rows) {
    if (!row.sourcePath || !row.sourceId || !row.sessionId || !row.parserVersion) {
      continue;
    }
    cache.set(fileCacheKey(row.sourcePath), row);
  }

  return cache;
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
  const normalizedQuery = normalizeQuery(query);
  const normalizedLimit = normalizeLimit(limit);
  const normalizedSourceId = normalizeSourceId(sourceId);
  if (normalizedSourceId === null) {
    return [];
  }

  const archivedClause = archivedOnly
    ? "AND COALESCE(a.archived, 0) = 1"
    : includeArchived
      ? ""
      : "AND COALESCE(a.archived, 0) = 0";
  const favoriteClause = favoritesOnly ? "AND COALESCE(a.favorite, 0) = 1 AND COALESCE(a.archived, 0) = 0" : "";
  const sourceClauseFts = normalizedSourceId ? "AND s.source_id = ?" : "";
  const sourceClausePlain = normalizedSourceId ? "AND sessions.source_id = ?" : "";

  if (normalizedQuery) {
    const ftsQuery = buildFtsQuery(normalizedQuery);
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
      const params = normalizedSourceId ? [ftsQuery, normalizedSourceId, normalizedLimit] : [ftsQuery, normalizedLimit];
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
          COALESCE(a.updated_at, '') AS annotationUpdatedAt,
          (
            CASE WHEN sessions.title LIKE ? ESCAPE '\\' THEN 80 ELSE 0 END +
            CASE WHEN COALESCE(a.tags_json, '[]') LIKE ? ESCAPE '\\' THEN 70 ELSE 0 END +
            CASE WHEN sessions.summary LIKE ? ESCAPE '\\' THEN 55 ELSE 0 END +
            CASE WHEN COALESCE(a.note_text, '') LIKE ? ESCAPE '\\' THEN 45 ELSE 0 END +
            CASE WHEN sessions.workspace_name LIKE ? ESCAPE '\\' THEN 35 ELSE 0 END +
            CASE WHEN EXISTS (
              SELECT 1
              FROM messages m
              WHERE m.session_id = sessions.id
              AND m.content LIKE ? ESCAPE '\\'
            ) THEN 30 ELSE 0 END +
            CASE WHEN EXISTS (
              SELECT 1
              FROM messages m
              WHERE m.session_id = sessions.id
              AND m.referenced_files_json LIKE ? ESCAPE '\\'
            ) THEN 25 ELSE 0 END +
            CASE WHEN EXISTS (
              SELECT 1
              FROM messages m
              WHERE m.session_id = sessions.id
              AND COALESCE(m.model, '') LIKE ? ESCAPE '\\'
            ) THEN 20 ELSE 0 END
          ) AS fallbackRank,
          (
            SELECT m.content
            FROM messages m
            WHERE m.session_id = sessions.id
            AND m.content LIKE ? ESCAPE '\\'
            ORDER BY m.ordinal ASC
            LIMIT 1
          ) AS fallbackMessageContent,
          (
            SELECT m.referenced_files_json
            FROM messages m
            WHERE m.session_id = sessions.id
            AND m.referenced_files_json LIKE ? ESCAPE '\\'
            ORDER BY m.ordinal ASC
            LIMIT 1
          ) AS fallbackReferencedFiles,
          (
            SELECT m.model
            FROM messages m
            WHERE m.session_id = sessions.id
            AND COALESCE(m.model, '') LIKE ? ESCAPE '\\'
            ORDER BY m.ordinal ASC
            LIMIT 1
          ) AS fallbackModel
        FROM sessions
        LEFT JOIN session_annotations a ON a.session_id = sessions.id
        WHERE (
          sessions.title LIKE ? ESCAPE '\\' OR
          sessions.summary LIKE ? ESCAPE '\\' OR
          COALESCE(a.note_text, '') LIKE ? ESCAPE '\\' OR
          sessions.workspace_name LIKE ? ESCAPE '\\' OR
          COALESCE(a.tags_json, '[]') LIKE ? ESCAPE '\\' OR
          EXISTS (
            SELECT 1
            FROM messages m
            WHERE m.session_id = sessions.id
            AND (
              m.content LIKE ? ESCAPE '\\' OR
              m.referenced_files_json LIKE ? ESCAPE '\\' OR
              COALESCE(m.model, '') LIKE ? ESCAPE '\\'
            )
          )
        )
        ${archivedClause}
        ${favoriteClause}
        ${sourceClausePlain}
        ORDER BY fallbackRank DESC, COALESCE(sessions.updated_at, sessions.created_at) DESC
        LIMIT ?
      `);
      const likeQuery = escapeLikeQuery(normalizedQuery);
      const fallbackRankParams = Array(8).fill(likeQuery);
      const fallbackSnippetParams = Array(3).fill(likeQuery);
      const fallbackMatchParams = Array(8).fill(likeQuery);
      const params = normalizedSourceId
        ? [
            ...fallbackRankParams,
            ...fallbackSnippetParams,
            ...fallbackMatchParams,
            normalizedSourceId,
            normalizedLimit
          ]
        : [
            ...fallbackRankParams,
            ...fallbackSnippetParams,
            ...fallbackMatchParams,
            normalizedLimit
          ];
      return fallback.all(...params).map((row) => deserializeSessionRow({
        ...row,
        searchSnippet: buildFallbackSearchSnippet(row, normalizedQuery)
      }));
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

  const params = normalizedSourceId ? [normalizedSourceId, normalizedLimit] : [normalizedLimit];
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
      COALESCE(SUM(CASE WHEN COALESCE(a.archived, 0) = 0 THEN 1 ELSE 0 END), 0) AS visibleSessionCount,
      COALESCE(SUM(CASE WHEN s.source_id = 'copilot' THEN 1 ELSE 0 END), 0) AS copilotSessionCount,
      COALESCE(SUM(CASE WHEN s.source_id = 'codex' THEN 1 ELSE 0 END), 0) AS codexSessionCount,
      COALESCE(SUM(CASE WHEN s.source_id = 'claude' THEN 1 ELSE 0 END), 0) AS claudeSessionCount,
      COALESCE(SUM(CASE WHEN a.favorite = 1 AND COALESCE(a.archived, 0) = 0 THEN 1 ELSE 0 END), 0) AS favoriteCount,
      COALESCE(SUM(CASE WHEN a.archived = 1 THEN 1 ELSE 0 END), 0) AS archivedCount,
      MAX(COALESCE(s.updated_at, s.created_at)) AS updatedAt
    FROM sessions s
    LEFT JOIN session_annotations a ON a.session_id = s.id
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
    lastIndexedAt: counts.updatedAt || null
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

  if (updateArchived === true) {
    nextFavorite = false;
  } else if (updateFavorite === true) {
    nextArchived = false;
  }

  const next = {
    sessionId,
    favorite: nextFavorite,
    archived: nextArchived,
    tags: updates.tags ? normalizeTags(updates.tags) : current.tags,
    noteText: typeof updates.noteText === "string" ? normalizeAnnotationNote(updates.noteText) : current.noteText,
    updatedAt: nowIso()
  };

  const isUnchanged =
    next.favorite === current.favorite &&
    next.archived === current.archived &&
    next.noteText === current.noteText &&
    annotationTagsEqual(next.tags, current.tags);

  if (isUnchanged) {
    return current;
  }

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
