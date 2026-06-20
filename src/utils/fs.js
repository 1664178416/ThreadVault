import fs from "node:fs";
import path from "node:path";

import { safeErrorMessage } from "./text.js";

const MAX_PARSE_ERROR_SAMPLES = 20;
const EMPTY_PARSE_ERRORS = {
  total: 0,
  samples: []
};

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function parseErrorSummary(value) {
  if (
    value &&
    typeof value === "object" &&
    Number.isInteger(value.total) &&
    Array.isArray(value.samples)
  ) {
    return {
      total: value.total,
      samples: value.samples.slice(0, MAX_PARSE_ERROR_SAMPLES).map((sample) => ({
        ...sample,
        error: safeErrorMessage(sample?.error, "Parse error.")
      }))
    };
  }

  return EMPTY_PARSE_ERRORS;
}

export function safeStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

export function sortByModifiedDesc(filePaths) {
  return [...filePaths].sort((left, right) => {
    const leftTime = safeStat(left)?.mtimeMs || 0;
    const rightTime = safeStat(right)?.mtimeMs || 0;
    return rightTime - leftTime;
  });
}

export function listFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  try {
    return fs
      .readdirSync(dirPath)
      .map((name) => path.join(dirPath, name))
      .filter((filePath) => safeStat(filePath)?.isFile());
  } catch {
    return [];
  }
}

export function listFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const results = [];
  const queue = [dirPath];

  while (queue.length > 0) {
    const currentDir = queue.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        queue.push(entryPath);
        continue;
      }

      if (entry.isFile()) {
        results.push(entryPath);
      }
    }
  }

  return results;
}

export function readJsonLines(filePath) {
  const records = [];
  const errorSamples = [];
  let errorTotal = 0;

  fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      try {
        records.push(JSON.parse(line));
      } catch (error) {
        if (errorSamples.length < MAX_PARSE_ERROR_SAMPLES) {
          errorSamples.push({
            line: index + 1,
            error: safeErrorMessage(error, "JSON line could not be parsed.")
          });
        }
        errorTotal += 1;
      }
    });

  Object.defineProperty(records, "parseErrors", {
    enumerable: false,
    value: {
      total: errorTotal,
      samples: errorSamples
    }
  });

  return records;
}

export function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}
