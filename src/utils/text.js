import crypto from "node:crypto";
import path from "node:path";

export function hashText(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function snippet(value, maxLength = 120) {
  if (!value) {
    return "";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function deriveTitle(customTitle, firstMessage) {
  if (customTitle && customTitle.trim()) {
    return customTitle.trim();
  }

  if (firstMessage && firstMessage.trim()) {
    return snippet(firstMessage, 72);
  }

  return "Untitled Copilot Session";
}

export function basenameFromPath(filePath) {
  if (!filePath) {
    return null;
  }

  return path.basename(filePath);
}
