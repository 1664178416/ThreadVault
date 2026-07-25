import { fileCacheKey } from "../utils/fs.js";

export function sourceFileSignature(fileEntry, parserVersion) {
  const version = String(parserVersion || "").trim();
  if (
    !version ||
    !Number.isSafeInteger(fileEntry?.size) ||
    fileEntry.size < 0 ||
    !Number.isFinite(fileEntry?.modifiedAtMs) ||
    !Number.isFinite(fileEntry?.changedAtMs)
  ) {
    return null;
  }

  return {
    size: fileEntry.size,
    modifiedAtMs: fileEntry.modifiedAtMs,
    changedAtMs: fileEntry.changedAtMs,
    parserVersion: version
  };
}

export function cachedSessionForFile(sourceId, fileEntry, sourceCache, parserVersion) {
  if (!(sourceCache instanceof Map)) {
    return null;
  }

  const sourceFile = sourceFileSignature(fileEntry, parserVersion);
  if (!sourceFile) {
    return null;
  }

  const cached = sourceCache.get(fileCacheKey(fileEntry.filePath));
  if (
    !cached ||
    cached.sourceId !== sourceId ||
    cached.fileSize !== sourceFile.size ||
    cached.modifiedAtMs !== sourceFile.modifiedAtMs ||
    cached.changedAtMs !== sourceFile.changedAtMs ||
    cached.parserVersion !== sourceFile.parserVersion ||
    !cached.sessionId
  ) {
    return null;
  }

  return {
    id: cached.sessionId,
    sourceId,
    sourcePath: fileEntry.filePath,
    fingerprint: cached.fingerprint || "",
    updatedAt: cached.sessionUpdatedAt || null,
    sourceFile,
    scanCacheHit: true
  };
}
