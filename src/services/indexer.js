import { scanAllSources } from "../adapters/index.js";
import { getStats, getSessionDetail, listSessions, updateSessionAnnotation, upsertImportedSessions } from "../db/repository.js";

export function runFullScan() {
  const { sessions, sourceStats } = scanAllSources();
  const writeStats = upsertImportedSessions(sessions);

  return {
    ...writeStats,
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
