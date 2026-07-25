import { scanAllSources } from "../adapters/index.js";
import { RUNTIME_FINGERPRINT } from "../config.js";
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
    parserVersion: RUNTIME_FINGERPRINT,
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

export function getDashboardData(query = "", filters = {}) {
  return {
    stats: getStats(),
    sessions: listSessions({ query, limit: 300, ...filters })
  };
}

export function getSessionById(sessionId) {
  return getSessionDetail(sessionId);
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
