import { scanAllSources } from "../adapters/index.js";
import { PARSER_FINGERPRINT } from "../config.js";
import { getSourceScanCache, getStats, getSessionDetail, listSessions, updateSessionAnnotation, upsertImportedSessions } from "../db/repository.js";
import { safeErrorMessage } from "../utils/text.js";

function summarizeSourceErrors(sourceStats = []) {
  const sourceErrors = sourceStats
    .filter((source) => source.error)
    .map((source) => ({
      sourceId: source.sourceId,
      sourceLabel: source.sourceLabel,
      error: safeErrorMessage(source.error, "Source scan failed.")
    }));

  return {
    failedSources: sourceErrors.length,
    sourceErrors: sourceErrors.slice(0, 20)
  };
}

export function runFullScan() {
  const sourceCache = getSourceScanCache();
  const { sessions, sourceStats } = scanAllSources({
    parserVersion: PARSER_FINGERPRINT,
    sourceCache
  });
  const writeStats = upsertImportedSessions(sessions);
  const sourceErrorStats = summarizeSourceErrors(sourceStats);

  return {
    ...writeStats,
    ...sourceErrorStats,
    sourceStats: sanitizeSourceStats(sourceStats),
    stats: getStats()
  };
}

export function getDashboardData(query = "", filters = {}, sessionPage) {
  const offset = sessionPage?.sessionOffset ?? 0;
  const limit = sessionPage?.sessionLimit ?? 300;
  const sessions = listSessions({
    query,
    ...filters,
    offset,
    limit: sessionPage ? limit + 1 : limit
  });

  if (!sessionPage) {
    return {
      stats: getStats(),
      sessions
    };
  }

  const hasMore = sessions.length > limit;
  const pageSessions = hasMore ? sessions.slice(0, limit) : sessions;
  return {
    stats: getStats(),
    sessions: pageSessions,
    sessionPage: {
      offset,
      limit,
      returned: pageSessions.length,
      hasMore,
      nextOffset: hasMore ? offset + pageSessions.length : null
    }
  };
}

export function getSessionById(sessionId, options) {
  return getSessionDetail(sessionId, options);
}

export function saveSessionAnnotation(sessionId, updates) {
  return updateSessionAnnotation(sessionId, updates);
}

function sanitizeSourceStats(sourceStats = []) {
  return sourceStats.map((source) => ({
    ...source,
    error: source.error ? safeErrorMessage(source.error, "Source scan failed.") : null
  }));
}
