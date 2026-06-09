import { scanAllSources } from "../adapters/index.js";
import { getStats, getSessionDetail, listSessions, updateSessionAnnotation, upsertImportedSessions } from "../db/repository.js";

function summarizeSourceErrors(sourceStats = []) {
  const sourceErrors = sourceStats
    .filter((source) => source.error)
    .map((source) => ({
      sourceId: source.sourceId,
      sourceLabel: source.sourceLabel,
      error: source.error
    }));

  return {
    failedSources: sourceErrors.length,
    sourceErrors: sourceErrors.slice(0, 20)
  };
}

export function runFullScan() {
  const { sessions, sourceStats } = scanAllSources();
  const writeStats = upsertImportedSessions(sessions);
  const sourceErrorStats = summarizeSourceErrors(sourceStats);

  return {
    ...writeStats,
    ...sourceErrorStats,
    sourceStats,
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
