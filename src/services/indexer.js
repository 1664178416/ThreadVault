import { scanCopilotSessions } from "../adapters/copilot.js";
import { replaceAllSessions, getStats, listSessions, getSessionDetail, updateSessionAnnotation } from "../db/repository.js";

export function runFullScan() {
  const sessions = scanCopilotSessions();
  replaceAllSessions(sessions);

  return {
    importedSessions: sessions.length,
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
