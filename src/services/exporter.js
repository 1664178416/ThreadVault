import path from "node:path";

import { EXPORT_DIR, MEMORY_DIR } from "../config.js";
import { getSessionDetail } from "../db/repository.js";
import { ensureDir, writeText } from "../utils/fs.js";

function slugify(value, fallback = "session") {
  return String(value || fallback)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

function dateBucket(session) {
  const date = new Date(session.updatedAt || session.createdAt || Date.now());
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sessionFileName(session) {
  return `${slugify(session.title)}-${slugify(session.sourceSessionId || session.id, "thread")}.md`;
}

function fence(content) {
  const text = String(content || "");
  const fenceSize = Math.max(3, ...Array.from(text.matchAll(/`+/g), (match) => match[0].length + 1));
  const marker = "`".repeat(fenceSize);
  return `${marker}text\n${text}\n${marker}`;
}

function renderReferences(references) {
  if (!Array.isArray(references) || references.length === 0) {
    return "";
  }

  return [
    "",
    "Referenced files:",
    ...references.map((file) => `- ${file}`)
  ].join("\n");
}

function renderAnnotation(annotation) {
  const lines = [];

  if (annotation.favorite) {
    lines.push("- Favorite: yes");
  }
  if (annotation.archived) {
    lines.push("- Archived: yes");
  }
  if (annotation.tags.length) {
    lines.push(`- Tags: ${annotation.tags.join(", ")}`);
  }
  if (annotation.noteText) {
    lines.push("- Note:");
    lines.push("");
    lines.push(annotation.noteText);
  }

  return lines.join("\n");
}

function buildMarkdown(session) {
  const sourcePath = session.sourcePath || "Unknown";
  const lines = [
    `# ${session.title}`,
    "",
    "> Exported from ThreadVault. This file may contain private prompts, paths, notes, and transcripts.",
    "",
    "- Source: " + session.sourceLabel,
    "- Source session id: " + (session.sourceSessionId || "Unknown"),
    "- Source path: " + sourcePath,
    "- Workspace: " + (session.workspacePath || "Unknown"),
    "- Created: " + (session.createdAt || "Unknown"),
    "- Updated: " + (session.updatedAt || "Unknown"),
    "- Status: " + (session.status || "unknown"),
    ""
  ];

  const annotationBlock = renderAnnotation(session.annotation);
  if (annotationBlock) {
    lines.push("## Personal Annotation");
    lines.push("");
    lines.push(annotationBlock);
    lines.push("");
  }

  lines.push("## Transcript");
  lines.push("");

  for (const message of session.messages) {
    lines.push(`### ${message.role}`);
    lines.push("");
    lines.push(`- Timestamp: ${message.timestamp || "Unknown"}`);
    if (message.model) {
      lines.push(`- Model: ${message.model}`);
    }
    lines.push("");
    lines.push(fence(message.content));
    const references = renderReferences(message.referencedFiles);
    if (references) {
      lines.push(references);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function exportSessionToMarkdown(sessionId) {
  const session = getSessionDetail(sessionId);
  if (!session) {
    return {
      ok: false,
      error: "Session not found."
    };
  }

  ensureDir(EXPORT_DIR);
  const fileName = sessionFileName(session);
  const exportPath = path.join(EXPORT_DIR, fileName);
  writeText(exportPath, buildMarkdown(session));

  return {
    ok: true,
    path: exportPath,
    fileName
  };
}

export function saveSessionToMemory(sessionId) {
  const session = getSessionDetail(sessionId);
  if (!session) {
    return {
      ok: false,
      error: "Session not found."
    };
  }

  const dateDir = dateBucket(session);
  const sourceDir = slugify(session.sourceId || session.sourceLabel, "source");
  const workspaceDir = slugify(session.workspaceName || "no-workspace", "no-workspace");
  const fileName = sessionFileName(session);
  const memoryPath = path.join(MEMORY_DIR, dateDir, sourceDir, workspaceDir, fileName);
  writeText(memoryPath, buildMarkdown(session));

  return {
    ok: true,
    path: memoryPath,
    fileName
  };
}
