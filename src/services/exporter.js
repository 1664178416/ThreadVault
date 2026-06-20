import path from "node:path";
import fs from "node:fs";

import { EXPORT_DIR, MEMORY_DIR } from "../config.js";
import { getSessionDetail } from "../db/repository.js";
import { ensureDir, writeText } from "../utils/fs.js";
import { hashText } from "../utils/text.js";

const MAX_SLUG_LENGTH = 80;
const MAX_MARKDOWN_BASENAME_LENGTH = 120;
const SESSION_FILENAME_HASH_LENGTH = 10;
const MAX_UNIQUE_MARKDOWN_ATTEMPTS = 1000;

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

function trimSlug(slug, maxLength = MAX_SLUG_LENGTH) {
  if (slug.length <= maxLength) {
    return slug;
  }

  return slug.slice(0, maxLength).replace(/-+$/g, "") || slug.slice(0, maxLength);
}

function slugify(value, fallback = "session", maxLength = MAX_SLUG_LENGTH) {
  const slug = String(value || fallback)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    || fallback;

  const trimmed = trimSlug(slug, maxLength);

  return WINDOWS_RESERVED_NAMES.has(trimmed) ? `${trimmed}-item` : trimmed;
}

function dateBucket(session) {
  const date = new Date(session.updatedAt || session.createdAt || Date.now());
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compactBaseName(baseName, suffix = "", maxLength = MAX_MARKDOWN_BASENAME_LENGTH) {
  const safeSuffix = String(suffix || "");
  const available = Math.max(1, maxLength - safeSuffix.length);
  return `${trimSlug(baseName, available)}${safeSuffix}`;
}

function sessionFileNameHash(session) {
  return hashText([
    session.id,
    session.sourceId,
    session.sourceSessionId,
    session.title
  ].map((value) => String(value || "")).join("\u001f")).slice(0, SESSION_FILENAME_HASH_LENGTH);
}

function sessionBaseName(session) {
  const titleSlug = slugify(session.title);
  const threadSlug = slugify(session.sourceSessionId || session.id, "thread");
  const baseName = `${titleSlug}-${threadSlug}`;

  if (baseName.length <= MAX_MARKDOWN_BASENAME_LENGTH) {
    return baseName;
  }

  const hashSuffix = `-${sessionFileNameHash(session)}`;
  const compactBudget = MAX_MARKDOWN_BASENAME_LENGTH - hashSuffix.length;
  const titleBudget = Math.max(24, Math.floor(compactBudget * 0.58));
  const compactTitle = trimSlug(titleSlug, titleBudget);
  const threadBudget = Math.max(1, compactBudget - compactTitle.length - 1);
  const compactThread = trimSlug(threadSlug, threadBudget);

  return compactBaseName(`${compactTitle}-${compactThread}`, hashSuffix);
}

function sessionFileName(session) {
  return `${sessionBaseName(session)}.md`;
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

function messageRoleHeading(role) {
  const normalized = String(role || "").trim().toLowerCase();
  const labels = {
    assistant: "Assistant",
    system: "System",
    tool: "Tool",
    user: "User"
  };

  return markdownHeading(labels[normalized] || role, "Message");
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
  const baseName = compactBaseName(parsed.name || "session");
  const extension = parsed.ext || ".md";
  let candidate = ensureInsideDirectory(safeDirectory, path.join(safeDirectory, `${baseName}${extension}`));
  let index = 2;

  while (fs.existsSync(candidate) && index <= MAX_UNIQUE_MARKDOWN_ATTEMPTS) {
    candidate = ensureInsideDirectory(safeDirectory, path.join(safeDirectory, `${compactBaseName(baseName, `-${index}`)}${extension}`));
    index += 1;
  }

  if (fs.existsSync(candidate)) {
    throw new Error("Unable to create a unique Markdown file path after many attempts.");
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
    "- ThreadVault session id: " + markdownListValue(session.id),
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

  for (const [index, message] of session.messages.entries()) {
    const turnNumber = index + 1;
    lines.push(`### ${turnNumber}. ${messageRoleHeading(message.role)}`);
    lines.push("");
    lines.push(`- Turn: ${turnNumber}`);
    if (message.id) {
      lines.push(`- Message id: ${markdownListValue(message.id)}`);
    }
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
