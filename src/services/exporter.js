import path from "node:path";

import { EXPORT_DIR } from "../config.js";
import { getSessionDetail } from "../db/repository.js";
import { ensureDir, writeText } from "../utils/fs.js";

function slugify(value) {
  return String(value || "session")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "session";
}

function fence(content) {
  return `\`\`\`text\n${content || ""}\n\`\`\``;
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
  const lines = [
    `# ${session.title}`,
    "",
    "- Source: " + session.sourceLabel,
    "- Source session id: " + (session.sourceSessionId || "Unknown"),
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
  const fileName = `${slugify(session.title)}-${slugify(session.sourceSessionId || session.id)}.md`;
  const exportPath = path.join(EXPORT_DIR, fileName);
  writeText(exportPath, buildMarkdown(session));

  return {
    ok: true,
    path: exportPath,
    fileName
  };
}
