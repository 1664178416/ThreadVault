import fs from "node:fs";
import path from "node:path";

import { COPILOT_EMPTY_WINDOW_DIR } from "../config.js";
import { fileEntriesByModifiedDesc, listFiles, parseErrorSummary, readJsonFile } from "../utils/fs.js";
import { applyJsonLineOperations } from "../utils/jsonPatch.js";
import { displayText, deriveTitle, hasInternalContext, hashNormalizedSession, safeErrorMessage, snippet } from "../utils/text.js";
import { toIsoFromEpoch } from "../utils/time.js";
import { cachedSessionForFile, sourceFileSignature } from "./cache.js";

function flattenResponseChunks(response = []) {
  const assistantParts = [];
  const thinkingParts = [];
  const referencedFiles = new Set();

  for (const chunk of response) {
    const textValue = typeof chunk.value === "string" ? chunk.value.trim() : "";

    if (chunk.kind === "thinking") {
      if (textValue) {
        thinkingParts.push(textValue);
      }
      continue;
    }

    if (chunk.kind === "inlineReference" && chunk.inlineReference?.fsPath) {
      referencedFiles.add(chunk.inlineReference.fsPath);
      continue;
    }

    if (textValue) {
      assistantParts.push(textValue);
    }
  }

  return {
    assistantText: assistantParts.join("\n\n").trim(),
    thinkingText: thinkingParts.join("\n\n").trim(),
    referencedFiles: Array.from(referencedFiles)
  };
}

function findWorkspacePath(session) {
  const request = session.requests?.find((item) => item.result?.metadata?.workspaceInfo?.workspaceFolders?.length);
  const workspaceFolder = request?.result?.metadata?.workspaceInfo?.workspaceFolders?.[0];
  if (workspaceFolder?.uri?.fsPath) {
    return workspaceFolder.uri.fsPath;
  }

  const initialLocation = session.initialLocation;
  if (typeof initialLocation === "object" && initialLocation?.workspace?.fsPath) {
    return initialLocation.workspace.fsPath;
  }

  return null;
}

function normalizeSession(rawSession, filePath) {
  const sessionId = rawSession.sessionId || path.basename(filePath, path.extname(filePath));
  const messages = [];
  let ordinal = 0;

  for (const request of rawSession.requests || []) {
    const userText =
      request.message?.text?.trim() ||
      request.message?.parts
        ?.map((part) => (typeof part.text === "string" ? part.text.trim() : ""))
        .filter(Boolean)
        .join("\n\n") ||
      "";
    if (userText) {
      const visibleUserText = displayText(userText);
      messages.push({
        id: `${sessionId}:user:${ordinal}`,
        ordinal,
        role: visibleUserText ? "user" : "tool",
        content: visibleUserText || userText,
        timestamp: toIsoFromEpoch(request.timestamp),
        model: request.modelId || null,
        referencedFiles: [],
        metadata: {
          requestId: request.requestId || null,
          mode: request.modeInfo?.modeId || rawSession.mode?.id || null,
          hiddenByDefault: !visibleUserText,
          originalHiddenByDefault: hasInternalContext(userText)
        }
      });
      ordinal += 1;
    }

    const flattened = flattenResponseChunks(request.response);
    if (flattened.assistantText) {
      messages.push({
        id: `${sessionId}:assistant:${ordinal}`,
        ordinal,
        role: "assistant",
        content: flattened.assistantText,
        timestamp: toIsoFromEpoch(request.modelState?.completedAt || rawSession.lastMessageDate || request.timestamp),
        model: request.modelId || rawSession.selectedModel?.identifier || null,
        referencedFiles: flattened.referencedFiles,
        metadata: {
          requestId: request.requestId || null,
          responseId: request.responseId || null
        }
      });
      ordinal += 1;
    }

    if (flattened.thinkingText) {
      messages.push({
        id: `${sessionId}:thinking:${ordinal}`,
        ordinal,
        role: "tool",
        content: flattened.thinkingText,
        timestamp: toIsoFromEpoch(request.timestamp),
        model: request.modelId || null,
        referencedFiles: [],
        metadata: {
          kind: "thinking",
          hiddenByDefault: true
        }
      });
      ordinal += 1;
    }
  }

  const firstUserMessage = messages.find((message) => message.role === "user")?.content || "";
  const title = deriveTitle(rawSession.customTitle, firstUserMessage, "Untitled Copilot Session");
  const workspacePath = findWorkspacePath(rawSession);
  const searchableText = messages.map((message) => message.content).join("\n");
  const session = {
    id: `copilot:${sessionId}`,
    sourceId: "copilot",
    sourceLabel: "GitHub Copilot Chat",
    sourceSessionId: sessionId,
    title,
    workspacePath,
    workspaceName: workspacePath ? path.basename(workspacePath) : null,
    createdAt: toIsoFromEpoch(rawSession.creationDate),
    updatedAt: toIsoFromEpoch(rawSession.lastMessageDate || rawSession.creationDate),
    resumeType: workspacePath ? "workspace_only" : "archive_only",
    fingerprint: "",
    sourcePath: filePath,
    status: rawSession.hasPendingEdits ? "pending_edits" : "ready",
    summary: snippet(searchableText, 220),
    parseConfidence: 0.84,
    metadata: {
      rawVersion: rawSession.version || null,
      initialLocation: rawSession.initialLocation || null,
      selectedModel: rawSession.selectedModel?.identifier || null,
      mode: rawSession.mode?.id || null,
      parseErrors: parseErrorSummary(rawSession.parseErrors)
    },
    messages
  };
  session.fingerprint = hashNormalizedSession(session);
  return session;
}

function parseJsonFile(filePath) {
  return readJsonFile(filePath);
}

function parseJsonlFile(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  return applyJsonLineOperations(lines);
}

function parseSessionFile(filePath) {
  if (filePath.endsWith(".json")) {
    return parseJsonFile(filePath);
  }
  if (filePath.endsWith(".jsonl")) {
    return parseJsonlFile(filePath);
  }
  return null;
}

export function detectCopilotSource() {
  return fs.existsSync(COPILOT_EMPTY_WINDOW_DIR);
}

export function scanCopilotSessions(options = {}) {
  if (!detectCopilotSource()) {
    return [];
  }

  const files = listFiles(COPILOT_EMPTY_WINDOW_DIR)
    .filter((filePath) => filePath.endsWith(".json") || filePath.endsWith(".jsonl"));
  const sortedFiles = fileEntriesByModifiedDesc(files);

  const sessions = [];
  for (const fileEntry of sortedFiles) {
    const { filePath } = fileEntry;
    const sourceFile = sourceFileSignature(fileEntry, options.parserVersion);
    const cachedSession = cachedSessionForFile("copilot", fileEntry, options.sourceCache, options.parserVersion);
    if (cachedSession) {
      sessions.push(cachedSession);
      continue;
    }

    try {
      const rawSession = parseSessionFile(filePath);
      if (!rawSession || !Array.isArray(rawSession.requests)) {
        continue;
      }
      const normalized = normalizeSession(rawSession, filePath);
      if (normalized.messages.length === 0) {
        continue;
      }
      normalized.sourceFile = sourceFile;
      sessions.push(normalized);
    } catch (error) {
      const parseError = safeErrorMessage(error, "Session file could not be parsed.");
      const session = {
        id: `copilot:error:${path.basename(filePath)}`,
        sourceId: "copilot",
        sourceLabel: "GitHub Copilot Chat",
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
