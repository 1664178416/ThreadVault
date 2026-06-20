import { safeErrorMessage } from "./text.js";

function cloneValue(value) {
  return structuredClone(value);
}

const MAX_PARSE_ERROR_SAMPLES = 20;

function ensurePath(root, pathParts) {
  let current = root;
  for (let index = 0; index < pathParts.length - 1; index += 1) {
    const key = pathParts[index];
    const nextKey = pathParts[index + 1];
    if (current[key] === undefined) {
      current[key] = typeof nextKey === "number" ? [] : {};
    }
    current = current[key];
  }
  return current;
}

export function applyJsonLineOperations(lines) {
  let state = null;
  const errorSamples = [];
  let errorTotal = 0;

  for (const [index, line] of lines.entries()) {
    if (!line.trim()) {
      continue;
    }

    let entry;
    try {
      entry = JSON.parse(line);
    } catch (error) {
      if (errorSamples.length < MAX_PARSE_ERROR_SAMPLES) {
        errorSamples.push({
          line: index + 1,
          error: safeErrorMessage(error, "JSON patch line could not be parsed.")
        });
      }
      errorTotal += 1;
      continue;
    }

    if (entry.kind === 0) {
      state = cloneValue(entry.v);
      continue;
    }

    if (!state || !Array.isArray(entry.k)) {
      continue;
    }

    const target = ensurePath(state, entry.k);
    const finalKey = entry.k[entry.k.length - 1];

    if (entry.kind === 1) {
      target[finalKey] = cloneValue(entry.v);
      continue;
    }

    if (entry.kind === 2) {
      if (!Array.isArray(target[finalKey])) {
        target[finalKey] = [];
      }
      const values = Array.isArray(entry.v) ? entry.v : [entry.v];
      target[finalKey].push(...cloneValue(values));
    }
  }

  if (state && typeof state === "object") {
    Object.defineProperty(state, "parseErrors", {
      enumerable: false,
      value: {
        total: errorTotal,
        samples: errorSamples
      }
    });
  }

  return state;
}
