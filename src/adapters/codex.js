import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CODEX_SESSIONS_DIR } from "../config.js";
import { listFilesRecursive, parseErrorSummary, readJsonLines, sortByModifiedDesc } from "../utils/fs.js";
import { basenameFromPath, cleanTitleCandidate, displayText, deriveTitle, hasInternalContext, hashText, snippet } from "../utils/text.js";

function detectCodexSource() {
  return fs.existsSync(CODEX_SESSIONS_DIR);
}

function normalizeRole(role) {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }

  return "tool";
}

function stringifyUnknown(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value == null) {
    return "";
  }

  return JSON.stringify(value, null, 2).trim();
}

function extractTextParts(content = []) {
  if (!Array.isArray(content)) {
    return stringifyUnknown(content);
  }

  return content
    .map((part) => {
      if (!part || typeof part !== "object") {
        return "";
      }

      if (typeof part.text === "string") {
        return part.text.trim();
      }

      if (typeof part.content === "string") {
        return part.content.trim();
      }

      if (part.type === "input_image") {
        return "[Image]";
      }

      if (part.type === "input_file") {
        return part.filename ? `[File] ${part.filename}` : "[File]";
      }

      return "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function buildToolMessage(label, body) {
  const normalizedBody = stringifyUnknown(body);
  if (!normalizedBody) {
    return label;
  }

  return `${label}\n\n${normalizedBody}`.trim();
}

function normalizeCodexRecord(record, ordinal, sessionId) {
  if (!record || record.type !== "response_item") {
    return null;
  }

  const payload = record.payload || {};
  const timestamp = record.timestamp || null;

  if (payload.type === "message") {
    if (payload.role === "developer") {
      return null;
    }

    const content = extractTextParts(payload.content);
    if (!content) {
      return null;
    }

    const visibleContent = displayText(content);
    if (!visibleContent) {
      return {
        id: `${sessionId}:context:${ordinal}`,
        ordinal,
        role: "tool",
        content,
        timestamp,
        model: payload.model || null,
        referencedFiles: [],
        metadata: {
          hiddenByDefault: true,
          rawType: payload.type,
          kind: "internal_context"
        }
      };
    }

    return {
      id: `${sessionId}:message:${ordinal}`,
      ordinal,
      role: normalizeRole(payload.role),
      content: visibleContent,
      timestamp,
      model: payload.model || null,
      referencedFiles: [],
      metadata: {
        phase: payload.phase || null,
        rawType: payload.type,
        originalHiddenByDefault: hasInternalContext(content)
      }
    };
  }

  if (payload.type === "function_call") {
    return {
      id: `${sessionId}:tool:${ordinal}`,
      ordinal,
      role: "tool",
      content: buildToolMessage(`Tool call: ${payload.name || "unknown"}`, payload.arguments || {}),
      timestamp,
      model: null,
      referencedFiles: [],
      metadata: {
        rawType: payload.type,
        toolName: payload.name || null,
        callId: payload.call_id || null
      }
    };
  }

  if (payload.type === "function_call_output") {
    return {
      id: `${sessionId}:tool-output:${ordinal}`,
      ordinal,
      role: "tool",
      content: buildToolMessage(`Tool output: ${payload.call_id || "unknown"}`, payload.output || ""),
      timestamp,
      model: null,
      referencedFiles: [],
      metadata: {
        rawType: payload.type,
        callId: payload.call_id || null
      }
    };
  }

  if (payload.type === "reasoning") {
    const reasoningText = Array.isArray(payload.summary)
      ? payload.summary
          .map((entry) => (typeof entry === "string" ? entry.trim() : stringifyUnknown(entry)))
          .filter(Boolean)
          .join("\n")
      : stringifyUnknown(payload.summary);

    if (!reasoningText) {
      return null;
    }

    return {
      id: `${sessionId}:reasoning:${ordinal}`,
      ordinal,
      role: "tool",
      content: reasoningText,
      timestamp,
      model: null,
      referencedFiles: [],
      metadata: {
        hiddenByDefault: true,
        rawType: payload.type
      }
    };
  }

  return null;
}

function extractThreadName(records) {
  for (const record of records) {
    if (record.type === "event_msg" && record.payload?.type === "thread_name_updated") {
      const threadName = String(record.payload.thread_name || "").trim();
      if (threadName) {
        return threadName;
      }
    }
  }

  return "";
}

function extractFirstUserPrompt(records) {
  for (const record of records) {
    if (record.type === "event_msg" && record.payload?.type === "user_message") {
      const text = cleanTitleCandidate(record.payload.message || "");
      if (text) {
        return text;
      }
    }
  }

  return "";
}

function normalizeWorkspacePath(value) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    return path.normalize(trimmed);
  } catch {
    return trimmed;
  }
}

function isCodexScratchWorkspace(workspacePath) {
  if (!workspacePath) {
    return false;
  }

  const normalizedPath = normalizeWorkspacePath(workspacePath).toLowerCase();
  const scratchRoot = path.join(os.homedir(), "Documents", "Codex").toLowerCase();

  return normalizedPath === scratchRoot || normalizedPath.startsWith(`${scratchRoot}${path.sep}`);
}

function addWorkspaceEvidence(evidence, rawPath, weight, lastSeenAt) {
  const workspacePath = normalizeWorkspacePath(rawPath);
  if (!workspacePath) {
    return;
  }

  const key = workspacePath.toLowerCase();
  const existing = evidence.get(key);
  if (existing) {
    existing.score += weight;
    existing.lastSeenAt = Math.max(existing.lastSeenAt, lastSeenAt);
    return;
  }

  evidence.set(key, {
    workspacePath,
    score: weight,
    lastSeenAt
  });
}

function extractWorkspacePathFromToolCall(record) {
  if (record?.type !== "response_item" || record.payload?.type !== "function_call") {
    return "";
  }

  const rawArguments = record.payload.arguments;
  if (typeof rawArguments !== "string" || !rawArguments.trim()) {
    return "";
  }

  try {
    const parsed = JSON.parse(rawArguments);
    return typeof parsed?.workdir === "string" ? parsed.workdir : "";
  } catch {
    return "";
  }
}

function deriveWorkspacePath(records, sessionMeta) {
  const evidence = new Map();

  addWorkspaceEvidence(evidence, sessionMeta.cwd, 1, -1);

  records.forEach((record, index) => {
    if (record?.type === "turn_context") {
      addWorkspaceEvidence(evidence, record.payload?.cwd, 4, index);
    }

    addWorkspaceEvidence(evidence, extractWorkspacePathFromToolCall(record), 3, index);
  });

  const candidates = [...evidence.values()];
  if (candidates.length === 0) {
    return null;
  }

  const nonScratchCandidates = candidates.filter((candidate) => !isCodexScratchWorkspace(candidate.workspacePath));
  const pool = nonScratchCandidates.length > 0 ? nonScratchCandidates : candidates;

  pool.sort((left, right) => right.score - left.score || right.lastSeenAt - left.lastSeenAt);

  return pool[0]?.workspacePath || null;
}

function normalizeSession(records, filePath) {
  const sessionMeta = records.find((record) => record.type === "session_meta")?.payload || {};
  const sourceSessionId = sessionMeta.id || path.basename(filePath, path.extname(filePath));
  const sessionId = `codex:${sourceSessionId}`;
  const messages = [];
  let ordinal = 0;

  for (const record of records) {
    const normalized = normalizeCodexRecord(record, ordinal, sourceSessionId);
    if (!normalized) {
      continue;
    }

    messages.push(normalized);
    ordinal += 1;
  }

  if (messages.length === 0) {
    return null;
  }

  const firstUserMessage = messages.find((message) => message.role === "user")?.content || "";
  const firstPrompt = extractFirstUserPrompt(records) || firstUserMessage;
  const workspacePath = deriveWorkspacePath(records, sessionMeta);
  const title = deriveTitle(extractThreadName(records), firstPrompt, "Untitled Codex Session");
  const createdAt = sessionMeta.timestamp || records[0]?.timestamp || null;
  const updatedAt = records[records.length - 1]?.timestamp || createdAt;
  const searchableText = messages.map((message) => message.content).join("\n");
  const fingerprint = hashText([
    "codex",
    sourceSessionId,
    workspacePath || "",
    title,
    createdAt || "",
    messages.length,
    snippet(messages[0]?.content || "", 80),
    snippet(messages[messages.length - 1]?.content || "", 80)
  ].join("|"));

  return {
    id: sessionId,
    sourceId: "codex",
    sourceLabel: "Codex",
    sourceSessionId,
    title,
    workspacePath,
    workspaceName: basenameFromPath(workspacePath),
    createdAt,
    updatedAt,
    resumeType: workspacePath ? "workspace_only" : "archive_only",
    fingerprint,
    sourcePath: filePath,
    status: "ready",
    summary: snippet(searchableText, 220),
    parseConfidence: 0.9,
    metadata: {
      originator: sessionMeta.originator || null,
      source: sessionMeta.source || null,
      cliVersion: sessionMeta.cli_version || null,
      modelProvider: sessionMeta.model_provider || null,
      parseErrors: parseErrorSummary(records.parseErrors)
    },
    messages
  };
}

export function scanCodexSessions() {
  if (!detectCodexSource()) {
    return [];
  }

  const files = listFilesRecursive(CODEX_SESSIONS_DIR)
    .filter((filePath) => filePath.endsWith(".jsonl"));
  const sortedFiles = sortByModifiedDesc(files);

  const sessions = [];
  for (const filePath of sortedFiles) {
    try {
      const records = readJsonLines(filePath);
      const normalized = normalizeSession(records, filePath);
      if (normalized) {
        sessions.push(normalized);
      }
    } catch (error) {
      sessions.push({
        id: `codex:error:${path.basename(filePath)}`,
        sourceId: "codex",
        sourceLabel: "Codex",
        sourceSessionId: path.basename(filePath),
        title: `Parse error: ${path.basename(filePath)}`,
        workspacePath: null,
        workspaceName: null,
        createdAt: null,
        updatedAt: null,
        resumeType: "archive_only",
        fingerprint: hashText(`codex:error|${filePath}`),
        sourcePath: filePath,
        status: "parse_error",
        summary: String(error.message || error),
        parseConfidence: 0,
        metadata: {
          error: String(error.message || error)
        },
        messages: []
      });
    }
  }

  return sessions;
}
