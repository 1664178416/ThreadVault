import { scanClaudeSessions } from "./claude.js";
import { scanCodexSessions } from "./codex.js";
import { scanCopilotSessions } from "./copilot.js";
import { safeErrorMessage } from "../utils/text.js";

const ADAPTERS = [
  {
    id: "copilot",
    label: "GitHub Copilot Chat",
    scan: scanCopilotSessions
  },
  {
    id: "codex",
    label: "Codex",
    scan: scanCodexSessions
  },
  {
    id: "claude",
    label: "Claude Code",
    scan: scanClaudeSessions
  }
];

export function scanAllSources(options = {}) {
  const sessions = [];
  const sourceStats = [];

  for (const adapter of ADAPTERS) {
    try {
      const nextSessions = adapter.scan(options);
      const cachedCount = nextSessions.filter((session) => session.scanCacheHit === true).length;
      sessions.push(...nextSessions);
      sourceStats.push({
        sourceId: adapter.id,
        sourceLabel: adapter.label,
        scannedCount: nextSessions.length,
        parsedCount: nextSessions.length - cachedCount,
        cachedCount,
        error: null
      });
    } catch (error) {
      sourceStats.push({
        sourceId: adapter.id,
        sourceLabel: adapter.label,
        scannedCount: 0,
        parsedCount: 0,
        cachedCount: 0,
        error: safeErrorMessage(error, "Source scan failed.")
      });
    }
  }

  sessions.sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });

  return {
    sessions,
    sourceStats
  };
}
