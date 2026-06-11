import path from "node:path";
import fs from "node:fs";

import { EXPORT_DIR, MEMORY_DIR } from "../config.js";
import { getSessionDetail } from "../db/repository.js";
import { ensureDir, writeText } from "../utils/fs.js";

const WINDOWS_RESERVED_NAMES = new Set([
  "con",
  "prn",
  "aux",
  "nul",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9"
]);

function slugify(value, fallback = "session") {
  const slug = String(value || fallback)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;

  return WINDOWS_RESERVED_NAMES.has(slug) ? `${slug}-item` : slug;
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

function oneLine(value, fallback = "Unknown") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function markdownInline(value, fallback = "Unknown") {
  return oneLine(value, fallback)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]");
}

function markdownHeading(value, fallback = "Untitled Session") {
  return markdownInline(value, fallback).replace(/^#+\s*/, "");
}

function markdownListValue(value, fallback = "Unknown") {
  return markdownInline(value, fallback).replace(/^([-*+]|\d+\.)\s+/, "\\$&");
}

function ensureInsideDirectory(rootDir, targetPath) {
  const root = path.resolve(rootDir);
  const target = path.resolve(targetPath);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside ${root}.`);
  }
  return target;
}

function uniqueMarkdownPath(directory, fileName) {
  const safeDirectory = path.resolve(directory);
  const parsed = path.parse(fileName);
  const baseName = parsed.name || "session";
  const extension = parsed.ext || ".md";
  let candidate = ensureInsideDirectory(safeDirectory, path.join(safeDirectory, `${baseName}${extension}`));
  let index = 2;

  while (fs.existsSync(candidate)) {
    candidate = ensureInsideDirectory(safeDirectory, path.join(safeDirectory, `${baseName}-${index}${extension}`));
    index += 1;
  }

  return candidate;
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
    ...references.map((file) => `- ${markdownListValue(file)}`)
  ].join("\n");
}

function renderAnnotation(annotation) {
  const lines = [];

  if (annotation.favorite) {
    lines.push("- Favorite: yes");
  }
  if (annotation.archived) {
    lines.push("- Hidden: yes");
  }
  if (annotation.tags.length) {
    lines.push(`- Tags: ${annotation.tags.map((tag) => markdownInline(tag)).join(", ")}`);
  }
  if (annotation.noteText) {
    lines.push("- Note:");
    lines.push("");
    lines.push(fence(annotation.noteText));
  }

  return lines.join("\n");
}

function buildMarkdown(session, action = "export") {
  const sourcePath = markdownListValue(session.sourcePath);
  const lines = [
    `# ${markdownHeading(session.title)}`,
    "",
    "> Exported from ThreadVault. This file may contain private prompts, paths, notes, and transcripts.",
    "",
    "- ThreadVault action: " + markdownListValue(action),
    "- Source: " + markdownListValue(session.sourceLabel),
    "- Source session id: " + markdownListValue(session.sourceSessionId),
    "- Source path: " + sourcePath,
    "- Workspace: " + markdownListValue(session.workspacePath),
    "- Created: " + markdownListValue(session.createdAt),
    "- Updated: " + markdownListValue(session.updatedAt),
    "- Status: " + markdownListValue(session.status, "unknown"),
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
    lines.push(`### ${markdownHeading(message.role, "Message")}`);
    lines.push("");
    lines.push(`- Timestamp: ${markdownListValue(message.timestamp)}`);
    if (message.model) {
      lines.push(`- Model: ${markdownListValue(message.model)}`);
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
  const exportPath = uniqueMarkdownPath(EXPORT_DIR, fileName);
  writeText(exportPath, buildMarkdown(session, "export"));

  return {
    ok: true,
    path: exportPath,
    directory: path.dirname(exportPath),
    fileName: path.basename(exportPath)
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
  const memoryDir = ensureInsideDirectory(MEMORY_DIR, path.join(MEMORY_DIR, dateDir, sourceDir, workspaceDir));
  const memoryPath = uniqueMarkdownPath(memoryDir, fileName);
  writeText(memoryPath, buildMarkdown(session, "memory"));

  return {
    ok: true,
    path: memoryPath,
    directory: path.dirname(memoryPath),
    fileName: path.basename(memoryPath)
  };
}
