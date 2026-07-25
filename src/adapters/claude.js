import fs from "node:fs";
import path from "node:path";

import { CLAUDE_PROJECTS_DIR } from "../config.js";
import { fileEntriesByModifiedDesc, listFilesRecursive, parseErrorSummary, readJsonLines } from "../utils/fs.js";
import { basenameFromPath, cleanTitleCandidate, displayText, deriveTitle, hasInternalContext, hashNormalizedSession, isLowSignalTitle, safeErrorMessage, snippet } from "../utils/text.js";
import { cachedSessionForFile, sourceFileSignature } from "./cache.js";

function detectClaudeSource() {
  return fs.existsSync(CLAUDE_PROJECTS_DIR);
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

function extractClaudeText(content) {
  if (typeof content === "string") {
    return content.trim();
  }

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

      if (part.type === "tool_use") {
        return `Tool use: ${part.name || "unknown"}`;
      }

      if (part.type === "tool_result") {
        return `Tool result\n\n${stringifyUnknown(part.content || "")}`;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function normalizeClaudeRecord(record, ordinal, sessionId) {
  if (!record || !record.type) {
    return null;
  }

  if (record.type === "user" || record.type === "assistant") {
    const role = record.type === "user" ? "user" : "assistant";
    const message = record.message || {};
    const content = extractClaudeText(message.content);
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
        timestamp: record.timestamp || null,
        model: message.model || null,
        referencedFiles: [],
        metadata: {
          uuid: record.uuid || null,
          hiddenByDefault: true,
          kind: "internal_context"
        }
      };
    }

    return {
      id: `${sessionId}:${role}:${ordinal}`,
      ordinal,
      role,
      content: visibleContent,
      timestamp: record.timestamp || null,
      model: message.model || null,
      referencedFiles: [],
      metadata: {
        uuid: record.uuid || null,
        parentUuid: record.parentUuid || null,
        entrypoint: record.entrypoint || null,
        originalHiddenByDefault: hasInternalContext(content)
      }
    };
  }

  if (record.type === "system") {
    const content = [
      stringifyUnknown(record.content),
      stringifyUnknown(record.error),
      stringifyUnknown(record.message?.content)
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    if (!content) {
      return null;
    }

    return {
      id: `${sessionId}:system:${ordinal}`,
      ordinal,
      role: "system",
      content,
      timestamp: record.timestamp || null,
      model: null,
      referencedFiles: [],
      metadata: {
        uuid: record.uuid || null
      }
    };
  }

  return null;
}

function extractBestClaudePrompt(messages) {
  for (const message of messages) {
    if (message.role !== "user") {
      continue;
    }

    const candidate = cleanTitleCandidate(message.content);
    if (candidate && !isLowSignalTitle(candidate)) {
      return candidate;
    }
  }

  return cleanTitleCandidate(messages.find((message) => message.role === "user")?.content || "");
}

function normalizeSession(records, filePath) {
  const sourceSessionId = records.find((record) => record.sessionId)?.sessionId || path.basename(filePath, path.extname(filePath));
  const sessionId = `claude:${sourceSessionId}`;
  const messages = [];
  let ordinal = 0;

  for (const record of records) {
    const normalized = normalizeClaudeRecord(record, ordinal, sourceSessionId);
    if (!normalized) {
      continue;
    }

    messages.push(normalized);
    ordinal += 1;
  }

  if (messages.length === 0) {
    return null;
  }

  const firstRecord = records.find((record) => record.sessionId === sourceSessionId) || {};
  const firstUserMessage = extractBestClaudePrompt(messages);
  const workspacePath = firstRecord.cwd || null;
  const createdAt = messages[0]?.timestamp || firstRecord.timestamp || null;
  const updatedAt = messages[messages.length - 1]?.timestamp || createdAt;
  const title = deriveTitle("", firstUserMessage, "Untitled Claude Session");
  const searchableText = messages.map((message) => message.content).join("\n");
  const session = {
    id: sessionId,
    sourceId: "claude",
    sourceLabel: "Claude Code",
    sourceSessionId,
    title,
    workspacePath,
    workspaceName: basenameFromPath(workspacePath),
    createdAt,
    updatedAt,
    resumeType: workspacePath ? "workspace_only" : "archive_only",
    fingerprint: "",
    sourcePath: filePath,
    status: "ready",
    summary: snippet(searchableText, 220),
    parseConfidence: 0.87,
    metadata: {
      version: firstRecord.version || null,
      gitBranch: firstRecord.gitBranch || null,
      parseErrors: parseErrorSummary(records.parseErrors)
    },
    messages
  };
  session.fingerprint = hashNormalizedSession(session);
  return session;
}

export function scanClaudeSessions(options = {}) {
  if (!detectClaudeSource()) {
    return [];
  }

  const files = listFilesRecursive(CLAUDE_PROJECTS_DIR)
    .filter((filePath) => filePath.endsWith(".jsonl"))
    .filter((filePath) => !filePath.includes(`${path.sep}subagents${path.sep}`));
  const sortedFiles = fileEntriesByModifiedDesc(files);

  const sessions = [];
  for (const fileEntry of sortedFiles) {
    const { filePath } = fileEntry;
    const sourceFile = sourceFileSignature(fileEntry, options.parserVersion);
    const cachedSession = cachedSessionForFile("claude", fileEntry, options.sourceCache, options.parserVersion);
    if (cachedSession) {
      sessions.push(cachedSession);
      continue;
    }

    try {
      const records = readJsonLines(filePath);
      const normalized = normalizeSession(records, filePath);
      if (normalized) {
        normalized.sourceFile = sourceFile;
        sessions.push(normalized);
      }
    } catch (error) {
      const parseError = safeErrorMessage(error, "Session file could not be parsed.");
      const session = {
        id: `claude:error:${path.basename(filePath)}`,
        sourceId: "claude",
        sourceLabel: "Claude Code",
        sourceSessionId: path.basename(filePath),
        title: `Parse error: ${path.basename(filePath)}`,
        workspacePath: null,
        workspaceName: null,
        createdAt: null,
        updatedAt: null,
        resumeType: "archive_only",
        fingerprint: "",
        sourcePath: filePath,
        status: "parse_error",
        summary: parseError,
        parseConfidence: 0,
        metadata: {
          error: parseError
        },
        sourceFile,
        messages: []
      };
      session.fingerprint = hashNormalizedSession(session);
      sessions.push(session);
    }
  }

  return sessions;
}
