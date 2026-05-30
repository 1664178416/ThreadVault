import fs from "node:fs";
import path from "node:path";

import { COPILOT_EMPTY_WINDOW_DIR } from "../config.js";
import { listFiles, readJsonFile } from "../utils/fs.js";
import { applyJsonLineOperations } from "../utils/jsonPatch.js";
import { deriveTitle, hashText, snippet } from "../utils/text.js";
import { toIsoFromEpoch } from "../utils/time.js";

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
      messages.push({
        id: `${sessionId}:user:${ordinal}`,
        ordinal,
        role: "user",
        content: userText,
        timestamp: toIsoFromEpoch(request.timestamp),
        model: request.modelId || null,
        referencedFiles: [],
        metadata: {
          requestId: request.requestId || null,
          mode: request.modeInfo?.modeId || rawSession.mode?.id || null
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
  const title = deriveTitle(rawSession.customTitle, firstUserMessage);
  const workspacePath = findWorkspacePath(rawSession);
  const searchableText = messages.map((message) => message.content).join("\n");
  const fingerprint = hashText([
    "copilot",
    sessionId,
    workspacePath || "",
    title,
    messages.length,
    snippet(messages[0]?.content || "", 80),
    snippet(messages[messages.length - 1]?.content || "", 80)
  ].join("|"));

  return {
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
    fingerprint,
    sourcePath: filePath,
    status: rawSession.hasPendingEdits ? "pending_edits" : "ready",
    summary: snippet(searchableText, 220),
    parseConfidence: 0.84,
    metadata: {
      rawVersion: rawSession.version || null,
      initialLocation: rawSession.initialLocation || null,
      selectedModel: rawSession.selectedModel?.identifier || null,
      mode: rawSession.mode?.id || null
    },
    messages
  };
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

export function scanCopilotSessions() {
  if (!detectCopilotSource()) {
    return [];
  }

  const files = listFiles(COPILOT_EMPTY_WINDOW_DIR)
    .filter((filePath) => filePath.endsWith(".json") || filePath.endsWith(".jsonl"))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);

  const sessions = [];
  for (const filePath of files) {
    try {
      const rawSession = parseSessionFile(filePath);
      if (!rawSession || !Array.isArray(rawSession.requests)) {
        continue;
      }
      const normalized = normalizeSession(rawSession, filePath);
      if (normalized.messages.length === 0) {
        continue;
      }
      sessions.push(normalized);
    } catch (error) {
      sessions.push({
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
        fingerprint: hashText(`error|${filePath}`),
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
