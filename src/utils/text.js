import crypto from "node:crypto";
import path from "node:path";

export function hashText(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function snippet(value, maxLength = 120) {
  if (!value) {
    return "";
  }

  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function stripInternalContext(value) {
  return String(value || "")
    .replace(/<environment_context>[\s\S]*?<\/environment_context>/gi, " ")
    .replace(/<ide_opened_file>[\s\S]*?<\/ide_opened_file>/gi, " ")
    .replace(/<ide_selection>[\s\S]*?<\/ide_selection>/gi, " ")
    .replace(/<turn_aborted>[\s\S]*?<\/turn_aborted>/gi, " ")
    .replace(/<user_editable_context>[\s\S]*?<\/user_editable_context>/gi, " ");
}

export function displayText(value) {
  return stripInternalContext(value).trim();
}

export function hasInternalContext(value) {
  return stripInternalContext(value) !== String(value || "");
}

export function cleanTitleCandidate(value) {
  let text = String(value || "");

  text = text
    .replace(/<environment_context>[\s\S]*?<\/environment_context>/gi, " ")
    .replace(/<ide_opened_file>[\s\S]*?<\/ide_opened_file>/gi, " ")
    .replace(/<ide_selection>[\s\S]*?<\/ide_selection>/gi, " ")
    .replace(/<turn_aborted>[\s\S]*?<\/turn_aborted>/gi, " ")
    .replace(/<user_editable_context>[\s\S]*?<\/user_editable_context>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ");

  return normalizeWhitespace(text);
}

function isPathLike(value) {
  return /^[a-zA-Z]:\\/.test(value) || /(^|[\\/])[^\\/]+\.(jsonl|json|md|txt|js|ts|py)$/i.test(value);
}

export function isLowSignalTitle(value) {
  const normalized = normalizeWhitespace(value).toLowerCase();
  if (!normalized) {
    return true;
  }

  if (normalized.length <= 2) {
    return true;
  }

  const lowSignalSet = new Set([
    "hi",
    "hello",
    "你好",
    "您好",
    "在吗",
    "继续",
    "test",
    "测试"
  ]);

  if (lowSignalSet.has(normalized) || isPathLike(normalized)) {
    return true;
  }

  if (normalized.startsWith("the user opened the file")) {
    return true;
  }

  if (normalized.startsWith("the user selected the lines")) {
    return true;
  }

  if (normalized.startsWith("conversation compacted")) {
    return true;
  }

  return false;
}

export function deriveTitle(customTitle, firstMessage, fallbackTitle = "Untitled Session") {
  const custom = cleanTitleCandidate(customTitle);
  if (custom && !isLowSignalTitle(custom)) {
    return snippet(custom, 72);
  }

  const candidate = cleanTitleCandidate(firstMessage);
  if (candidate && !isLowSignalTitle(candidate)) {
    return snippet(candidate, 72);
  }

  return fallbackTitle;
}

export function basenameFromPath(filePath) {
  if (!filePath) {
    return null;
  }

  return path.basename(filePath);
}
