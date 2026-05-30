function cloneValue(value) {
  return structuredClone(value);
}

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

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const entry = JSON.parse(line);
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

  return state;
}
