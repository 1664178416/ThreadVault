import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const strictPublish = process.argv.includes("--publish");
const warnings = [];

function fail(message) {
  console.error(`verify failed: ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  warnings.push(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe",
    ...options
  });

  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")}\n${result.stdout || ""}${result.stderr || ""}`.trim());
    return false;
  }

  return true;
}

function runModuleInput(description, script, env = {}) {
  const result = spawnSync(process.execPath, ["--input-type=module"], {
    cwd: projectRoot,
    input: script,
    encoding: "utf8",
    stdio: "pipe",
    env: {
      ...process.env,
      ...env
    }
  });

  if (result.status !== 0) {
    fail(`${description}\n${result.stdout || ""}${result.stderr || ""}`.trim());
    return false;
  }

  return true;
}

function readJson(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function normalizeContent(value) {
  return value.replace(/\r\n/g, "\n");
}

function assertDirectorySynced(sourceRelative, bundledRelative) {
  const sourceRoot = path.join(projectRoot, sourceRelative);
  const bundledRoot = path.join(projectRoot, bundledRelative);
  if (!fs.existsSync(bundledRoot)) {
    fail(`${bundledRelative} is missing. Run npm run prepare:extension.`);
    return;
  }

  const sourceFiles = listFilesRecursive(sourceRoot)
    .map((filePath) => normalizePathForGit(path.relative(sourceRoot, filePath)))
    .sort();
  const bundledFiles = listFilesRecursive(bundledRoot)
    .map((filePath) => normalizePathForGit(path.relative(bundledRoot, filePath)))
    .sort();

  const sourceSet = new Set(sourceFiles);
  const bundledSet = new Set(bundledFiles);

  for (const relativePath of sourceFiles) {
    if (!bundledSet.has(relativePath)) {
      fail(`${bundledRelative}/${relativePath} is missing. Run npm run prepare:extension.`);
      continue;
    }

    const sourcePath = path.join(sourceRoot, relativePath);
    const bundledPath = path.join(bundledRoot, relativePath);
    const source = fs.readFileSync(sourcePath);
    const bundled = fs.readFileSync(bundledPath);
    if (!source.equals(bundled)) {
      fail(`${bundledRelative}/${relativePath} is out of sync with ${sourceRelative}/${relativePath}. Run npm run prepare:extension.`);
    }
  }

  for (const relativePath of bundledFiles) {
    if (!sourceSet.has(relativePath)) {
      fail(`${bundledRelative}/${relativePath} is extra. Run npm run prepare:extension.`);
    }
  }
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(projectRoot, relativePath));
}

function assertRequiredFiles(files) {
  for (const relativePath of files) {
    if (!fileExists(relativePath)) {
      fail(`${relativePath} is missing.`);
    }
  }
}

function assertFileContains(relativePath, patterns) {
  const content = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  for (const pattern of patterns) {
    if (!content.includes(pattern)) {
      fail(`${relativePath} should include ${pattern}.`);
    }
  }
}

function assertFileExcludes(relativePath, patterns) {
  const content = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  for (const pattern of patterns) {
    if (content.includes(pattern)) {
      fail(`${relativePath} should not include ${pattern}.`);
    }
  }
}

function extractBalancedBlock(content, openIndex) {
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = openIndex; index < content.length; index += 1) {
    const char = content[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return content.slice(openIndex, index + 1);
      }
    }
  }

  fail("Unable to parse a balanced JavaScript object block.");
  return "";
}

function extractBlockAfter(content, marker) {
  const markerIndex = content.indexOf(marker);
  if (markerIndex < 0) {
    fail(`Unable to find ${marker}.`);
    return "";
  }

  const openIndex = content.indexOf("{", markerIndex);
  if (openIndex < 0) {
    fail(`Unable to find object block after ${marker}.`);
    return "";
  }

  return extractBalancedBlock(content, openIndex);
}

function extractPropertyBlock(content, propertyName) {
  const match = new RegExp(`\\b${escapeRegExp(propertyName)}\\s*:\\s*\\{`).exec(content);
  if (!match) {
    fail(`Unable to find ${propertyName} object block.`);
    return "";
  }

  const openIndex = match.index + match[0].lastIndexOf("{");
  return extractBalancedBlock(content, openIndex);
}

function collectObjectKeys(block) {
  return Array.from(block.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm), (match) => match[1]);
}

function collectObjectStringValues(block) {
  return Array.from(block.matchAll(/^\s*[A-Za-z_$][\w$]*\s*:\s*"([^"]+)"/gm), (match) => match[1]);
}

function assertSetEquals(label, leftName, leftValues, rightName, rightValues) {
  const left = new Set(leftValues);
  const right = new Set(rightValues);
  const missing = [...left].filter((value) => !right.has(value)).sort();
  const extra = [...right].filter((value) => !left.has(value)).sort();

  if (missing.length || extra.length) {
    fail(`${label} mismatch. Missing in ${rightName}: ${missing.join(", ") || "none"}. Extra in ${rightName}: ${extra.join(", ") || "none"}. Compared ${leftName} -> ${rightName}.`);
  }
}

function assertI18nIntegrity() {
  const appContent = fs.readFileSync(path.join(projectRoot, "public/app.js"), "utf8");
  const htmlContent = fs.readFileSync(path.join(projectRoot, "public/index.html"), "utf8");
  const i18nBlock = extractBlockAfter(appContent, "const I18N =");
  const enKeys = collectObjectKeys(extractPropertyBlock(i18nBlock, "en"));
  const zhKeys = collectObjectKeys(extractPropertyBlock(i18nBlock, "zh"));

  assertSetEquals("I18N locale keys", "en", enKeys, "zh", zhKeys);

  const enSet = new Set(enKeys);
  const dataI18nKeys = Array.from(htmlContent.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g), (match) => match[1]);
  for (const key of new Set(dataI18nKeys)) {
    if (!enSet.has(key)) {
      fail(`public/index.html references missing I18N key: ${key}.`);
    }
  }

  const iconLabelBlock = extractBlockAfter(appContent, "const ICON_LABEL_KEYS =");
  for (const key of new Set(collectObjectStringValues(iconLabelBlock))) {
    if (!enSet.has(key)) {
      fail(`ICON_LABEL_KEYS references missing I18N key: ${key}.`);
    }
  }
}

function pngDimensions(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
  const buffer = fs.readFileSync(filePath);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function normalizePathForGit(value) {
  return value.replace(/\\/g, "/");
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globLikeToRegExp(pattern) {
  const normalizedPattern = normalizePathForGit(pattern);
  let source = "^";

  for (let index = 0; index < normalizedPattern.length;) {
    if (normalizedPattern.startsWith("**/", index)) {
      source += "(?:.*/)?";
      index += 3;
      continue;
    }

    if (normalizedPattern.startsWith("/**", index)) {
      source += "(?:/.*)?";
      index += 3;
      continue;
    }

    const char = normalizedPattern[index];
    if (char === "*") {
      source += "[^/]*";
    } else {
      source += escapeRegExp(char);
    }
    index += 1;
  }

  return new RegExp(`${source}$`);
}

function gitOutput(args) {
  const result = spawnSync("git", ["-c", "core.excludesfile=", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "pipe"
  });

  if (result.status !== 0) {
    fail(`git ${args.join(" ")}\n${result.stdout || ""}${result.stderr || ""}`.trim());
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizePathForGit);
}

function pathMatchesGlobLike(relativePath, pattern) {
  const normalizedPath = normalizePathForGit(relativePath);
  return globLikeToRegExp(pattern).test(normalizedPath);
}

function assertGlobLikeSelfTest() {
  const cases = [
    ["data/threadvault.sqlite", "data/**", true],
    ["extension/app/public/app.js", "extension/app/**", true],
    ["foo/exports/a.md", "**/exports/**", true],
    ["exports/a.md", "**/exports/**", true],
    ["foo/memory/a.md", "**/memory/**", true],
    ["extension/a.vsix", "*.vsix", false],
    ["threadvault.vsix", "*.vsix", true],
    ["nested/a.sqlite", "**/*.sqlite", true],
    ["nested/a.sqlite-wal", "**/*.sqlite-wal", true],
    ["docs/schema.md", "**/memory/**", false]
  ];

  for (const [relativePath, pattern, expected] of cases) {
    const actual = pathMatchesGlobLike(relativePath, pattern);
    if (actual !== expected) {
      fail(`glob self-test failed: ${pattern} against ${relativePath} expected ${expected}, got ${actual}.`);
    }
  }
}

function assertNoTrackedSensitiveFiles() {
  const trackedFiles = gitOutput(["ls-files"]);
  const sensitivePatterns = [
    "data/**",
    "extension/app/**",
    "**/*.vsix",
    "**/*.log",
    "**/*.sqlite",
    "**/*.sqlite-shm",
    "**/*.sqlite-wal",
    "**/exports/**",
    "**/memory/**",
    "permission_test.txt"
  ];

  for (const relativePath of trackedFiles) {
    if (sensitivePatterns.some((pattern) => pathMatchesGlobLike(relativePath, pattern))) {
      fail(`${relativePath} is tracked by git but should remain local-only.`);
    }
  }
}

function listFilesRecursive(rootPath) {
  const files = [];
  if (!fs.existsSync(rootPath)) {
    return files;
  }

  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function sourceCheckFiles() {
  const roots = [
    "public",
    "src",
    "scripts",
    "extension/app/public",
    "extension/app/src"
  ];
  const files = ["extension/extension.js"];

  for (const root of roots) {
    files.push(
      ...listFilesRecursive(path.join(projectRoot, root))
        .map((filePath) => normalizePathForGit(path.relative(projectRoot, filePath)))
        .filter((relativePath) => /\.(?:js|mjs)$/.test(relativePath))
    );
  }

  return Array.from(new Set(files)).sort();
}

function readIgnorePatterns(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function shouldIgnore(relativePath, patterns) {
  const normalizedPath = normalizePathForGit(relativePath);
  return patterns.some((pattern) => {
    const normalizedPattern = normalizePathForGit(pattern);
    if (normalizedPattern.endsWith("/**")) {
      return normalizedPath === normalizedPattern.slice(0, -3) || normalizedPath.startsWith(normalizedPattern.slice(0, -2));
    }

    if (!normalizedPattern.includes("/")) {
      return normalizedPath
        .split("/")
        .some((segment) => pathMatchesGlobLike(segment, normalizedPattern));
    }

    return pathMatchesGlobLike(normalizedPath, normalizedPattern);
  });
}

function assertExtensionPackageContent() {
  const extensionRoot = path.join(projectRoot, "extension");
  const ignorePatterns = readIgnorePatterns("extension/.vscodeignore");
  const includedFiles = listFilesRecursive(extensionRoot)
    .map((filePath) => normalizePathForGit(path.relative(extensionRoot, filePath)))
    .filter((relativePath) => !shouldIgnore(relativePath, ignorePatterns));

  const requiredFiles = [
    "package.json",
    "extension.js",
    "README.md",
    "CHANGELOG.md",
    "SUPPORT.md",
    "LICENSE",
    "media/threadvault.png",
    "media/threadvault.svg",
    "app/package.json",
    "app/.threadvault-bundle.json",
    "app/public/app.js",
    "app/public/favicon.svg",
    "app/public/index.html",
    "app/public/styles.css",
    "app/src/server.js",
    "app/src/config.js",
    "app/src/db/database.js",
    "app/src/db/repository.js"
  ];

  for (const relativePath of requiredFiles) {
    if (!includedFiles.includes(relativePath)) {
      fail(`VSIX package content would miss required file ${relativePath}.`);
    }
  }

  const forbiddenPatterns = [
    ".vscode/**",
    "**/*.vsix",
    "**/*.log",
    "app/data/**",
    "app/**/exports/**",
    "app/**/memory/**",
    "app/**/*.sqlite",
    "app/**/*.sqlite-shm",
    "app/**/*.sqlite-wal"
  ];

  for (const relativePath of includedFiles) {
    if (forbiddenPatterns.some((pattern) => pathMatchesGlobLike(relativePath, pattern))) {
      fail(`VSIX package content would include private/generated file ${relativePath}.`);
    }
  }
}

function assertExtensionCommandsSynced(extensionPackage) {
  const extensionSource = fs.readFileSync(path.join(projectRoot, "extension", "extension.js"), "utf8");
  const manifestCommands = new Set((extensionPackage.contributes?.commands || [])
    .map((command) => command.command)
    .filter(Boolean));
  const registeredCommands = new Set(
    Array.from(extensionSource.matchAll(/registerCommand\("([^"]+)"/g), (match) => match[1])
      .filter((command) => command.startsWith("threadvault."))
  );
  const activationEvents = new Set(extensionPackage.activationEvents || []);

  for (const command of manifestCommands) {
    if (!registeredCommands.has(command)) {
      fail(`extension/package.json contributes command ${command}, but extension.js does not register it.`);
    }

    if (!activationEvents.has(`onCommand:${command}`)) {
      fail(`extension/package.json command ${command} is missing activation event onCommand:${command}.`);
    }
  }

  for (const command of registeredCommands) {
    if (!manifestCommands.has(command)) {
      fail(`extension.js registers command ${command}, but extension/package.json does not contribute it.`);
    }
  }

  for (const command of registeredCommands) {
    const pattern = new RegExp(`registerCommand\\("${escapeRegExp(command)}",\\s*runCommandSafely\\(`);
    if (!pattern.test(extensionSource)) {
      fail(`extension.js command ${command} should be registered through runCommandSafely.`);
    }
  }
}

function runStateAndExportRegression() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threadvault-verify-"));

  try {
    runModuleInput("state/export regression failed", `
      import fs from "node:fs";
      import path from "node:path";
      import { upsertImportedSessions, updateSessionAnnotation, getSessionDetail, listSessions } from "./src/db/repository.js";
      import { exportSessionToMarkdown, saveSessionToMemory } from "./src/services/exporter.js";

      const session = {
        id: "verify-session",
        sourceId: "codex",
        sourceLabel: "Codex <script>alert(1)</script>",
        sourceSessionId: "CON",
        title: "CON <script>alert(1)</script> [unsafe]",
        summary: "Regression summary",
        workspacePath: "C:/workspace/<demo>/[unsafe]",
        workspaceName: "AUX",
        createdAt: "2026-06-10T01:00:00.000Z",
        updatedAt: "2026-06-10T02:00:00.000Z",
        status: "complete <b>unsafe</b>",
        resumeType: "thread",
        fingerprint: "verify-fingerprint",
        sourcePath: "C:/Users/wyh/.codex/session.jsonl",
        parseConfidence: 1,
        metadata: {},
        messages: [{
          id: "verify-message-1",
          ordinal: 0,
          role: "user",
          content: "Please keep this local. Fallback-only marker ###",
          timestamp: "2026-06-10T01:00:00.000Z",
          model: "test-model <unsafe>",
          referencedFiles: ["C:/workspace/<demo>/[app].js"],
          metadata: {}
        }]
      };

      const stats = upsertImportedSessions([session]);
      if (stats.importedSessions !== 1) {
        throw new Error(\`expected one imported session, got \${stats.importedSessions}\`);
      }

      const skippedStats = upsertImportedSessions([session]);
      if (skippedStats.skippedSessions !== 1 || skippedStats.importedSessions !== 0 || skippedStats.updatedSessions !== 0) {
        throw new Error(\`unchanged sessions should be skipped cleanly: \${JSON.stringify(skippedStats)}\`);
      }

      const failedStats = upsertImportedSessions([{
        ...session,
        id: "verify-failed-session",
        fingerprint: "verify-fingerprint",
        sourcePath: "C:/Users/wyh/.codex/private-session.jsonl",
        messages: [{
          ...session.messages[0],
          id: "verify-failed-message"
        }]
      }]);
      if (failedStats.failedSessions !== 1 || failedStats.errors[0]?.sourcePath !== "[LOCAL_PATH]") {
        throw new Error(\`failed import samples should redact source paths: \${JSON.stringify(failedStats)}\`);
      }
      if (JSON.stringify(failedStats).includes("C:/Users/wyh")) {
        throw new Error(\`failed import samples leaked a local path: \${JSON.stringify(failedStats)}\`);
      }

      const favorited = updateSessionAnnotation(session.id, { favorite: true });
      if (!favorited.favorite || favorited.archived) {
        throw new Error(\`favorite should enable favorite and clear hidden: \${JSON.stringify(favorited)}\`);
      }

      const hidden = updateSessionAnnotation(session.id, { archived: true });
      if (hidden.favorite || !hidden.archived) {
        throw new Error(\`hide should clear favorite and enable hidden: \${JSON.stringify(hidden)}\`);
      }

      const hiddenListAfterHide = listSessions({ archivedOnly: true });
      const favoritesAfterHide = listSessions({ favoritesOnly: true });
      if (hiddenListAfterHide.length !== 1 || hiddenListAfterHide[0].id !== session.id || favoritesAfterHide.length !== 0) {
        throw new Error(\`hidden view should include hidden session and remove it from favorites: hidden=\${hiddenListAfterHide.length} favorites=\${favoritesAfterHide.length}\`);
      }

      const hiddenFromConflictingPayload = updateSessionAnnotation(session.id, { favorite: true, archived: true });
      if (hiddenFromConflictingPayload.favorite || !hiddenFromConflictingPayload.archived) {
        throw new Error(\`hidden should win conflicting favorite/hidden updates: \${JSON.stringify(hiddenFromConflictingPayload)}\`);
      }

      const restoredByFavorite = updateSessionAnnotation(session.id, { favorite: true });
      if (!restoredByFavorite.favorite || restoredByFavorite.archived) {
        throw new Error(\`favorite should restore hidden sessions: \${JSON.stringify(restoredByFavorite)}\`);
      }

      const tagged = updateSessionAnnotation(session.id, { tags: ["Bug", " bug ", "UI", "ui", "Memory", "<script>"] });
      if (JSON.stringify(tagged.tags) !== JSON.stringify(["Bug", "UI", "Memory", "<script>"])) {
        throw new Error(\`tags should be case-insensitive deduplicated while keeping first display form: \${JSON.stringify(tagged.tags)}\`);
      }
      const unchangedTagged = updateSessionAnnotation(session.id, { tags: ["Bug", "UI", "Memory", "<script>"], noteText: "" });
      if (unchangedTagged.updatedAt !== tagged.updatedAt) {
        throw new Error(\`unchanged annotation saves should not rewrite updatedAt: before=\${tagged.updatedAt} after=\${unchangedTagged.updatedAt}\`);
      }
      const longTag = "Long tag with   spaces ".repeat(8);
      const longNote = "x".repeat(20010);
      const boundedAnnotation = updateSessionAnnotation(session.id, {
        tags: [longTag, "Short"],
        noteText: \`  \${longNote}  \`
      });
      if (boundedAnnotation.tags[0].length !== 64 || boundedAnnotation.tags[0].includes("   ")) {
        throw new Error(\`tags should collapse whitespace and cap individual length: \${JSON.stringify(boundedAnnotation.tags)}\`);
      }
      if (boundedAnnotation.noteText.length !== 20000) {
        throw new Error(\`notes should be capped at 20000 characters, got \${boundedAnnotation.noteText.length}\`);
      }
      updateSessionAnnotation(session.id, { tags: ["Bug", "UI", "Memory", "<script>"], noteText: "" });

      const favorites = listSessions({ favoritesOnly: true });
      const hiddenList = listSessions({ archivedOnly: true });
      if (favorites.length !== 1 || hiddenList.length !== 0) {
        throw new Error(\`unexpected list filters: favorites=\${favorites.length} hidden=\${hiddenList.length}\`);
      }
      const invalidSourceFilter = listSessions({ sourceId: "codex" + "x".repeat(200) });
      if (invalidSourceFilter.length !== 0) {
        throw new Error(\`invalid direct source filters should return no sessions instead of all sessions: \${JSON.stringify(invalidSourceFilter)}\`);
      }

      const strangeSearch = listSessions({ query: '" ^ * NEAR() ###', limit: 99999 });
      if (!Array.isArray(strangeSearch) || strangeSearch.length > 500) {
        throw new Error(\`search fallback or limit normalization failed: \${strangeSearch.length}\`);
      }
      const prefixSearch = listSessions({ query: "Regre" });
      if (!prefixSearch.some((result) => result.id === session.id)) {
        throw new Error(\`prefix FTS search should match Regression summary: \${JSON.stringify(prefixSearch)}\`);
      }
      const messagePrefixSearch = listSessions({ query: "loc" });
      if (!messagePrefixSearch.some((result) => result.id === session.id)) {
        throw new Error(\`prefix FTS search should match message text: \${JSON.stringify(messagePrefixSearch)}\`);
      }
      const referencedFileSearch = listSessions({ query: "[app].js" });
      if (!referencedFileSearch.some((result) => result.id === session.id)) {
        throw new Error(\`search should match referenced file names with punctuation: \${JSON.stringify(referencedFileSearch)}\`);
      }
      const tagPrefixSearch = listSessions({ query: "Mem" });
      if (!tagPrefixSearch.some((result) => result.id === session.id)) {
        throw new Error(\`prefix FTS search should match annotation tags: \${JSON.stringify(tagPrefixSearch)}\`);
      }
      const olderFallbackTitleSession = {
        ...session,
        id: "verify-fallback-title-session",
        sourceSessionId: "fallback-title",
        title: "### Important fallback title",
        summary: "Older title match should still rank above a newer message-only match.",
        updatedAt: "2026-06-01T02:00:00.000Z",
        fingerprint: "verify-fallback-title-fingerprint",
        messages: [{
          ...session.messages[0],
          id: "verify-fallback-title-message",
          content: "This message intentionally avoids the punctuation marker."
        }]
      };
      const fallbackTitleStats = upsertImportedSessions([olderFallbackTitleSession]);
      if (fallbackTitleStats.importedSessions !== 1) {
        throw new Error(\`expected one fallback title session, got \${fallbackTitleStats.importedSessions}\`);
      }
      const punctuationFallbackSearch = listSessions({ query: "###" });
      const punctuationFallbackResult = punctuationFallbackSearch.find((result) => result.id === session.id);
      if (!punctuationFallbackResult || !punctuationFallbackResult.searchSnippet?.includes("<mark>###</mark>")) {
        throw new Error(\`punctuation fallback search should return a highlighted snippet: \${JSON.stringify(punctuationFallbackSearch)}\`);
      }
      if (punctuationFallbackSearch[0]?.id !== olderFallbackTitleSession.id) {
        throw new Error(\`fallback ranking should prefer title hits over newer message-only hits: \${JSON.stringify(punctuationFallbackSearch)}\`);
      }
      const wildcardLikeSearch = listSessions({ query: "%" });
      if (wildcardLikeSearch.some((result) => result.id === session.id)) {
        throw new Error(\`LIKE wildcard characters should be treated as literal search text: \${JSON.stringify(wildcardLikeSearch)}\`);
      }

      const exportResult = exportSessionToMarkdown(session.id);
      const memoryResult = saveSessionToMemory(session.id);
      if (!exportResult.ok || !fs.existsSync(exportResult.path)) {
        throw new Error(\`export failed: \${JSON.stringify(exportResult)}\`);
      }
      if (!memoryResult.ok || !fs.existsSync(memoryResult.path)) {
        throw new Error(\`memory failed: \${JSON.stringify(memoryResult)}\`);
      }
      if (!path.basename(exportResult.path).includes("con-item")) {
        throw new Error(\`Windows reserved export name was not sanitized: \${exportResult.path}\`);
      }
      if (!memoryResult.path.split(path.sep).includes("aux-item")) {
        throw new Error(\`Windows reserved memory folder was not sanitized: \${memoryResult.path}\`);
      }

      const longSession = {
        ...session,
        id: "verify-long-filename-session",
        sourceId: "codex-" + "source ".repeat(30),
        sourceLabel: "Codex long filename source",
        sourceSessionId: "thread-" + "identifier ".repeat(40),
        title: "Long export filename " + "project decision memory ".repeat(40),
        workspaceName: "workspace " + "name ".repeat(30),
        fingerprint: "verify-long-filename-fingerprint",
        messages: [{
          ...session.messages[0],
          id: "verify-long-filename-message",
          content: "A long title and source id should still produce a compact Markdown filename."
        }]
      };
      const longStats = upsertImportedSessions([longSession]);
      if (longStats.importedSessions !== 1) {
        throw new Error(\`expected one long filename session, got \${longStats.importedSessions}\`);
      }
      const longExport = exportSessionToMarkdown(longSession.id);
      const duplicateLongExport = exportSessionToMarkdown(longSession.id);
      const longMemory = saveSessionToMemory(longSession.id);
      for (const [label, result] of [["long export", longExport], ["duplicate long export", duplicateLongExport], ["long memory", longMemory]]) {
        if (!result.ok || !fs.existsSync(result.path)) {
          throw new Error(\`\${label} failed: \${JSON.stringify(result)}\`);
        }
        const fileName = path.basename(result.path);
        const baseName = path.basename(fileName, ".md");
        if (baseName.length > 120) {
          throw new Error(\`\${label} basename should stay compact, got \${baseName.length}: \${fileName}\`);
        }
      }
      if (!/-[a-f0-9]{10}\\.md$/.test(path.basename(longExport.path))) {
        throw new Error(\`long export should include a stable hash suffix: \${longExport.path}\`);
      }
      if (duplicateLongExport.path === longExport.path) {
        throw new Error("duplicate long export should choose a unique path");
      }

      const originalExistsSync = fs.existsSync;
      fs.existsSync = (candidatePath) => {
        const text = String(candidatePath || "");
        const exportDir = path.join(process.env.THREADVAULT_DATA_DIR, "exports");
        if (text.startsWith(exportDir) && text.endsWith(".md")) {
          return true;
        }
        return originalExistsSync(candidatePath);
      };

      try {
        let failedSafely = false;
        try {
          exportSessionToMarkdown(longSession.id);
        } catch (error) {
          const message = String(error?.message || error);
          failedSafely = message.includes("Unable to create a unique Markdown file path") && !message.includes(process.env.THREADVAULT_DATA_DIR);
        }

        if (!failedSafely) {
          throw new Error("exhausted export file names should fail with a bounded redacted error");
        }
      } finally {
        fs.existsSync = originalExistsSync;
      }

      const exportMarkdown = fs.readFileSync(exportResult.path, "utf8");
      const memoryMarkdown = fs.readFileSync(memoryResult.path, "utf8");
      if (!exportMarkdown.includes("- ThreadVault action: export")) {
        throw new Error("export markdown should record the ThreadVault action");
      }
      if (!memoryMarkdown.includes("- ThreadVault action: memory")) {
        throw new Error("memory markdown should record the ThreadVault action");
      }
      for (const anchor of [
        "- ThreadVault session id: verify-session",
        "### 1. User",
        "- Turn: 1",
        "- Message id: verify-message-1"
      ]) {
        if (!exportMarkdown.includes(anchor) || !memoryMarkdown.includes(anchor)) {
          throw new Error("markdown should include stable trace anchors: " + anchor);
        }
      }
      for (const unsafe of ["<script>", "<b>unsafe</b>", "C:/workspace/<demo>"]) {
        if (exportMarkdown.includes(unsafe) || memoryMarkdown.includes(unsafe)) {
          throw new Error("markdown metadata should escape raw HTML/control text: " + unsafe);
        }
      }
      for (const escaped of ["&lt;script&gt;", "&lt;b&gt;unsafe&lt;/b&gt;", "C:/workspace/&lt;demo&gt;/\\\\[unsafe\\\\]"]) {
        if (!exportMarkdown.includes(escaped) || !memoryMarkdown.includes(escaped)) {
          throw new Error("markdown metadata should include escaped text: " + escaped);
        }
      }

      const detail = getSessionDetail(session.id);
      if (!detail.annotation.favorite || detail.annotation.archived) {
        throw new Error(\`detail annotation is inconsistent: \${JSON.stringify(detail.annotation)}\`);
      }
    `, {
      THREADVAULT_DATA_DIR: tempRoot,
      THREADVAULT_MEMORY_DIR: path.join(tempRoot, "memory")
    });
  } finally {
    const resolved = path.resolve(tempRoot);
    const temp = path.resolve(os.tmpdir());
    if (path.basename(resolved).startsWith("threadvault-verify-") && resolved.startsWith(temp + path.sep)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

function runServerCorsRegression() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threadvault-cors-"));

  try {
    runModuleInput("server CORS regression failed", `
      import { corsHeaders, requestHasAllowedWriteOrigin } from "./src/server.js";

      function request(origin, host = "127.0.0.1:3187") {
        return {
          headers: { origin, host },
          socket: {}
        };
      }

      const sameLoopback = request("http://127.0.0.1:3187");
      if (!requestHasAllowedWriteOrigin(sameLoopback)) {
        throw new Error("loopback origin should be allowed");
      }

      const localhost = request("http://localhost:3187");
      if (!requestHasAllowedWriteOrigin(localhost)) {
        throw new Error("localhost origin should be allowed");
      }

      const ipv6Loopback = request("http://[::1]:3187");
      if (!requestHasAllowedWriteOrigin(ipv6Loopback)) {
        throw new Error("IPv6 loopback origin should be allowed");
      }

      const forgedHost = request("http://evil.example", "evil.example");
      if (requestHasAllowedWriteOrigin(forgedHost)) {
        throw new Error("forged Host header must not authorize cross-origin writes");
      }

      const headers = corsHeaders(forgedHost);
      if (Object.prototype.hasOwnProperty.call(headers, "Access-Control-Allow-Origin")) {
        throw new Error("cross-origin responses must not echo Access-Control-Allow-Origin");
      }
    `, {
      THREADVAULT_DATA_DIR: tempRoot
    });
  } finally {
    const resolved = path.resolve(tempRoot);
    const temp = path.resolve(os.tmpdir());
    if (path.basename(resolved).startsWith("threadvault-cors-") && resolved.startsWith(temp + path.sep)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

function runServerHttpRegression() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threadvault-http-"));

  try {
    runModuleInput("server HTTP regression failed", `
      import fs from "node:fs";
      import http from "node:http";
      import path from "node:path";
      import { createServer } from "./src/server.js";
      import { upsertImportedSessions, updateSessionAnnotation } from "./src/db/repository.js";

      const server = createServer();
      let baseUrl = "";

      const regularSession = {
        id: "http-regular-session",
        sourceId: "codex",
        sourceLabel: "Codex",
        sourceSessionId: "http-regular",
        title: "HTTP regular session",
        summary: "Regular session",
        workspacePath: "C:/workspace/http",
        workspaceName: "http",
        createdAt: "2026-06-10T01:00:00.000Z",
        updatedAt: "2026-06-10T02:00:00.000Z",
        status: "ready",
        resumeType: "thread",
        fingerprint: "http-regular",
        sourcePath: "C:/history/http-regular.jsonl",
        parseConfidence: 1,
        metadata: {},
        messages: [{
          id: "http-regular-message",
          ordinal: 0,
          role: "user",
          content: "regular",
          timestamp: "2026-06-10T01:00:00.000Z",
          model: null,
          referencedFiles: [],
          metadata: {}
        }]
      };
      const hiddenSession = {
        ...regularSession,
        id: "http-hidden-session",
        sourceSessionId: "http-hidden",
        title: "HTTP hidden session",
        summary: "Hidden session",
        fingerprint: "http-hidden",
        sourcePath: "C:/history/http-hidden.jsonl",
        messages: [{
          ...regularSession.messages[0],
          id: "http-hidden-message",
          content: "hidden"
        }]
      };
      upsertImportedSessions([regularSession, hiddenSession]);
      updateSessionAnnotation(regularSession.id, { favorite: true });
      updateSessionAnnotation(hiddenSession.id, { archived: true });

      function listen() {
        return new Promise((resolve, reject) => {
          server.once("error", reject);
          server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            baseUrl = "http://127.0.0.1:" + address.port;
            resolve();
          });
        });
      }

      function close() {
        return new Promise((resolve, reject) => {
          server.close((error) => error ? reject(error) : resolve());
        });
      }

      function request(pathname, options = {}) {
        return new Promise((resolve, reject) => {
          const url = new URL(pathname, baseUrl);
          let settled = false;
          const settle = (callback, value) => {
            if (!settled) {
              settled = true;
              callback(value);
            }
          };

          const req = http.request(url, {
            method: options.method || "GET",
            headers: options.headers || {}
          }, (res) => {
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => {
              body += chunk;
            });
            res.on("end", () => settle(resolve, {
              status: res.statusCode,
              headers: res.headers,
              body
            }));
            res.on("error", (error) => settle(reject, error));
          });

          req.setTimeout(5000, () => {
            req.destroy(new Error("HTTP regression request timed out"));
          });
          req.on("error", (error) => settle(reject, error));
          if (options.bodyChunks) {
            for (const bodyChunk of options.bodyChunks) {
              req.write(bodyChunk);
            }
          } else if (options.body) {
            req.write(options.body);
          }
          req.end();
        });
      }

      await listen();
      try {
        const root = await request("/");
        if (root.status !== 200 || !root.body.includes("ThreadVault")) {
          throw new Error("root page should render ThreadVault HTML, got status " + root.status);
        }
        if (root.headers["x-content-type-options"] !== "nosniff") {
          throw new Error("root page is missing X-Content-Type-Options nosniff");
        }
        if (root.headers["referrer-policy"] !== "no-referrer") {
          throw new Error("root page is missing Referrer-Policy no-referrer");
        }
        const csp = root.headers["content-security-policy"] || "";
        for (const directive of ["frame-ancestors", "base-uri 'none'", "form-action 'none'"]) {
          if (!csp.includes(directive)) {
            throw new Error("root page CSP is missing " + directive);
          }
        }

        const rootHead = await request("/", { method: "HEAD" });
        if (rootHead.status !== 200 || rootHead.body !== "") {
          throw new Error("HEAD root should return headers without a body, got " + rootHead.status + " " + rootHead.body.length);
        }

        const staticPost = await request("/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}"
        });
        if (staticPost.status !== 405 || !staticPost.body.includes("Method not allowed")) {
          throw new Error("POST root should return 405, got " + staticPost.status + " " + staticPost.body);
        }

        const traversal = await request("/%2e%2e%2fpackage.json");
        if (traversal.status !== 404) {
          throw new Error("path traversal should return 404, got " + traversal.status);
        }
        const traversalPayload = JSON.parse(traversal.body);
        if (traversalPayload.ok !== false || traversalPayload.error !== "Not found") {
          throw new Error("static 404 should return ok:false JSON, got " + traversal.body);
        }

        const unknownApi = await request("/api/unknown-route");
        if (unknownApi.status !== 404) {
          throw new Error("unknown API route should return 404, got " + unknownApi.status);
        }
        const unknownApiPayload = JSON.parse(unknownApi.body);
        if (unknownApiPayload.ok !== false || unknownApiPayload.error !== "Unknown API route") {
          throw new Error("unknown API route should return ok:false JSON, got " + unknownApi.body);
        }

        const badSessionEncoding = await request("/api/sessions/%E0%A4%A");
        if (badSessionEncoding.status !== 400 || !badSessionEncoding.body.includes("Invalid session id encoding")) {
          throw new Error("bad session id encoding should return 400, got " + badSessionEncoding.status + " " + badSessionEncoding.body);
        }
        const blankSessionId = await request("/api/sessions/%20%20");
        if (blankSessionId.status !== 400 || !blankSessionId.body.includes("Invalid session id encoding")) {
          throw new Error("blank session id should return 400, got " + blankSessionId.status + " " + blankSessionId.body);
        }

        const health = await request("/api/health");
        if (health.status !== 200) {
          throw new Error("health should return 200, got " + health.status);
        }
        const healthPayload = JSON.parse(health.body);
        if (!healthPayload.ok || healthPayload.app !== "ThreadVault" || !healthPayload.host || !healthPayload.port || !healthPayload.node || typeof healthPayload.runtimeFingerprint !== "string" || healthPayload.runtimeFingerprint.length === 0) {
          throw new Error("health payload is missing diagnostics: " + health.body);
        }

        const healthHead = await request("/api/health", { method: "HEAD" });
        if (healthHead.status !== 200 || healthHead.body !== "") {
          throw new Error("HEAD health should return headers without a body, got " + healthHead.status + " " + healthHead.body.length);
        }
        if (!String(healthHead.headers["content-type"] || "").startsWith("application/json")) {
          throw new Error("HEAD health should keep JSON content type");
        }

        const archivedOnly = await request("/api/sessions?archivedOnly=1");
        if (archivedOnly.status !== 200) {
          throw new Error("archivedOnly sessions should return 200, got " + archivedOnly.status);
        }
        const archivedOnlyPayload = JSON.parse(archivedOnly.body);
        const archivedIds = archivedOnlyPayload.sessions.map((session) => session.id);
        if (archivedIds.length !== 1 || archivedIds[0] !== hiddenSession.id || archivedOnlyPayload.sessions[0].annotation.archived !== true) {
          throw new Error("archivedOnly should return only hidden sessions, got " + archivedOnly.body);
        }

        const favoritesOnly = await request("/api/sessions?favoritesOnly=1");
        if (favoritesOnly.status !== 200) {
          throw new Error("favoritesOnly sessions should return 200, got " + favoritesOnly.status);
        }
        const favoritesOnlyPayload = JSON.parse(favoritesOnly.body);
        const favoriteIds = favoritesOnlyPayload.sessions.map((session) => session.id);
        if (favoriteIds.length !== 1 || favoriteIds[0] !== regularSession.id || favoritesOnlyPayload.sessions[0].annotation.favorite !== true) {
          throw new Error("favoritesOnly should return only non-hidden favorites, got " + favoritesOnly.body);
        }

        const trimmedSourceFilter = await request("/api/sessions?sourceId=%20codex%20");
        if (trimmedSourceFilter.status !== 200) {
          throw new Error("trimmed sourceId should return 200, got " + trimmedSourceFilter.status);
        }
        const trimmedSourcePayload = JSON.parse(trimmedSourceFilter.body);
        if (trimmedSourcePayload.sessions.length !== 1 || trimmedSourcePayload.sessions[0].id !== regularSession.id) {
          throw new Error("trimmed sourceId should filter visible sessions by source, got " + trimmedSourceFilter.body);
        }

        const badSourceControl = await request("/api/sessions?sourceId=codex%01");
        if (badSourceControl.status !== 400 || !badSourceControl.body.includes("Invalid source id")) {
          throw new Error("control-character sourceId should return 400, got " + badSourceControl.status + " " + badSourceControl.body);
        }

        const badSourceLength = await request("/api/sessions?sourceId=" + "x".repeat(129));
        if (badSourceLength.status !== 400 || !badSourceLength.body.includes("Invalid source id")) {
          throw new Error("too-long sourceId should return 400, got " + badSourceLength.status + " " + badSourceLength.body);
        }

        const missingSource = await request("/api/open", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sessionId: regularSession.id, target: "source" })
        });
        if (missingSource.status !== 404) {
          throw new Error("missing source open should return 404, got " + missingSource.status);
        }
        const missingSourcePayload = JSON.parse(missingSource.body);
        if (!missingSourcePayload.error.includes("[LOCAL_PATH]") || missingSourcePayload.error.includes("C:/history")) {
          throw new Error("missing source error should redact local paths, got " + missingSource.body);
        }
        if (missingSourcePayload.path !== "[LOCAL_PATH]") {
          throw new Error("missing source payload path should be redacted, got " + missingSource.body);
        }

        const trimmedExport = await request("/api/export", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sessionId: "  " + regularSession.id + "  " })
        });
        if (trimmedExport.status !== 200) {
          throw new Error("POST session ids should be normalized before lookup, got " + trimmedExport.status + " " + trimmedExport.body);
        }

        const tooLongSessionId = await request("/api/session-meta", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sessionId: "x".repeat(513), favorite: true })
        });
        if (tooLongSessionId.status !== 400 || !tooLongSessionId.body.includes("Session id is required")) {
          throw new Error("too-long session id should return 400, got " + tooLongSessionId.status + " " + tooLongSessionId.body);
        }

        const splitUtf8Body = Buffer.from(JSON.stringify({
          sessionId: regularSession.id,
          noteText: "跨 chunk 中文笔记"
        }), "utf8");
        const splitIndex = splitUtf8Body.indexOf(Buffer.from("中", "utf8")) + 1;
        const splitUtf8Annotation = await request("/api/session-meta", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          bodyChunks: [
            splitUtf8Body.subarray(0, splitIndex),
            splitUtf8Body.subarray(splitIndex)
          ]
        });
        if (splitUtf8Annotation.status !== 200) {
          throw new Error("split UTF-8 JSON body should parse, got " + splitUtf8Annotation.status + " " + splitUtf8Annotation.body);
        }
        const splitUtf8Payload = JSON.parse(splitUtf8Annotation.body);
        if (splitUtf8Payload.annotation?.noteText !== "跨 chunk 中文笔记") {
          throw new Error("split UTF-8 JSON body should preserve note text, got " + splitUtf8Annotation.body);
        }

        const forbidden = await request("/api/scan", {
          method: "POST",
          headers: {
            Origin: "http://evil.example",
            "Content-Type": "application/json"
          },
          body: "{}"
        });
        if (forbidden.status !== 403 || !forbidden.body.includes("Cross-origin write")) {
          throw new Error("cross-origin write should return 403, got " + forbidden.status + " " + forbidden.body);
        }

        const arrayBody = await request("/api/session-meta", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: "[]"
        });
        if (arrayBody.status !== 400 || !arrayBody.body.includes("JSON object")) {
          throw new Error("array request body should return 400, got " + arrayBody.status + " " + arrayBody.body);
        }

        const nullBody = await request("/api/session-meta", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: "null"
        });
        if (nullBody.status !== 400 || !nullBody.body.includes("JSON object")) {
          throw new Error("null request body should return 400, got " + nullBody.status + " " + nullBody.body);
        }

        const oversized = await request("/api/session-meta", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sessionId: "x".repeat(1024 * 1024 + 1) })
        });
        if (oversized.status !== 413 || !oversized.body.includes("too large")) {
          throw new Error("oversized request should return 413, got " + oversized.status + " " + oversized.body.slice(0, 120));
        }
      } finally {
        await close();
      }

      if (!fs.existsSync(path.resolve(process.env.THREADVAULT_DATA_DIR))) {
        throw new Error("server should create the configured data directory");
      }
    `, {
      THREADVAULT_DATA_DIR: tempRoot
    });
  } finally {
    const resolved = path.resolve(tempRoot);
    const temp = path.resolve(os.tmpdir());
    if (path.basename(resolved).startsWith("threadvault-http-") && resolved.startsWith(temp + path.sep)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

function runParserErrorRedactionRegression() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threadvault-parser-"));

  try {
    runModuleInput("parser error redaction regression failed", `
      import fs from "node:fs";
      import path from "node:path";
      import { parseErrorSummary, readJsonLines } from "./src/utils/fs.js";
      import { applyJsonLineOperations } from "./src/utils/jsonPatch.js";

      const badLine = "C:/Users/wyh/private project/session file.jsonl token=ghp_abcdefghijklmnopqrs email=person@example.com";
      const unixPathError = "/Users/wyh/private project/session file.jsonl token=ghp_abcdefghijklmnopqrs person@example.com";
      const uncPathError = String.raw\`\\\\fileserver\\team share\\session file.jsonl token=ghp_abcdefghijklmnopqrs person@example.com\`;
      const jsonlPath = path.join(${JSON.stringify(tempRoot)}, "bad.jsonl");
      fs.writeFileSync(jsonlPath, \`\\n\\n\${badLine}\`, "utf8");

      const records = readJsonLines(jsonlPath);
      const jsonlErrors = JSON.stringify(records.parseErrors);
      if (records.parseErrors.samples[0]?.line !== 3) {
        throw new Error("JSONL parse errors should preserve physical line numbers: " + jsonlErrors);
      }
      const patchState = applyJsonLineOperations(['{"kind":0,"v":{}}', badLine]) || {};
      const patchErrors = JSON.stringify(patchState.parseErrors || {});
      const summary = parseErrorSummary({
        total: 2,
        samples: [
          { line: 1, error: "Could not open C:/Users/wyh/private project/session file.jsonl token=ghp_abcdefghijklmnopqrs person@example.com" },
          { line: 2, error: "Could not open " + unixPathError }
        ]
      });
      const summaryErrors = JSON.stringify(summary);

      const unixSummary = JSON.stringify(parseErrorSummary({
        total: 1,
        samples: [{ line: 1, error: unixPathError }]
      }));
      const uncSummary = JSON.stringify(parseErrorSummary({
        total: 1,
        samples: [{ line: 1, error: uncPathError }]
      }));

      for (const payload of [jsonlErrors, patchErrors, summaryErrors, unixSummary, uncSummary]) {
        if (payload.includes("C:/Users/wyh") || payload.includes("private project") || payload.includes("session file.jsonl") || payload.includes("person@example.com") || payload.includes("ghp_abcdefghijklmnopqrs")) {
          throw new Error("parser error samples leaked sensitive text: " + payload);
        }
        if (payload.includes("/Users/wyh")) {
          throw new Error("parser error samples leaked a Unix local path: " + payload);
        }
        if (payload.includes("\\\\\\\\fileserver") || payload.includes("team share")) {
          throw new Error("parser error samples leaked a UNC local path: " + payload);
        }
      }

      for (const payload of [jsonlErrors, patchErrors]) {
        if (!payload.includes("[LOCAL_PATH]")) {
          throw new Error("parser JSON errors should redact local paths: " + payload);
        }
      }

      for (const marker of ["[LOCAL_PATH]", "[EMAIL]", "[SECRET]"]) {
        if (!summaryErrors.includes(marker)) {
          throw new Error("parseErrorSummary should include " + marker + ": " + summaryErrors);
        }
      }
    `);
  } finally {
    const resolved = path.resolve(tempRoot);
    const temp = path.resolve(os.tmpdir());
    if (path.basename(resolved).startsWith("threadvault-parser-") && resolved.startsWith(temp + path.sep)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

function runFileUtilityRegression() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threadvault-fs-"));

  try {
    runModuleInput("file utility regression failed", `
      import fs from "node:fs";
      import path from "node:path";
      import { sortByModifiedDesc } from "./src/utils/fs.js";

      const first = path.join(${JSON.stringify(tempRoot)}, "first.jsonl");
      const second = path.join(${JSON.stringify(tempRoot)}, "second.jsonl");
      const newest = path.join(${JSON.stringify(tempRoot)}, "newest.jsonl");
      fs.writeFileSync(first, "{}", "utf8");
      fs.writeFileSync(second, "{}", "utf8");
      fs.writeFileSync(newest, "{}", "utf8");

      const oldDate = new Date("2026-06-20T01:00:00.000Z");
      const newDate = new Date("2026-06-20T02:00:00.000Z");
      fs.utimesSync(first, oldDate, oldDate);
      fs.utimesSync(second, oldDate, oldDate);
      fs.utimesSync(newest, newDate, newDate);

      const sorted = sortByModifiedDesc([first, second, newest]);
      if (sorted[0] !== newest || sorted[1] !== first || sorted[2] !== second) {
        throw new Error("sortByModifiedDesc should sort descending and preserve input order ties: " + JSON.stringify(sorted));
      }
    `);
  } finally {
    const resolved = path.resolve(tempRoot);
    const temp = path.resolve(os.tmpdir());
    if (path.basename(resolved).startsWith("threadvault-fs-") && resolved.startsWith(temp + path.sep)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

function runCodexArchivedSourceRegression() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threadvault-codex-archived-"));

  try {
    const normalSessionId = "019ec001-0000-7000-8000-000000000001";
    const archivedSessionId = "019ec001-0000-7000-8000-000000000002";
    const normalDir = path.join(tempRoot, ".codex", "sessions", "2026", "06", "20");
    const archivedDir = path.join(tempRoot, ".codex", "archived_sessions");
    fs.mkdirSync(normalDir, { recursive: true });
    fs.mkdirSync(archivedDir, { recursive: true });

    function rolloutLines(id, cwd, message) {
      return [
        JSON.stringify({
          timestamp: "2026-06-20T01:00:00.000Z",
          type: "session_meta",
          payload: {
            id,
            cwd,
            timestamp: "2026-06-20T01:00:00.000Z",
            model_provider: "openai"
          }
        }),
        JSON.stringify({
          timestamp: "2026-06-20T01:01:00.000Z",
          type: "response_item",
          payload: {
            type: "message",
            role: "user",
            content: [{
              type: "input_text",
              text: message
            }]
          }
        })
      ].join("\n");
    }

    const duplicateArchivedPath = path.join(archivedDir, `rollout-2026-06-20T09-00-00-${normalSessionId}.jsonl`);
    const normalPath = path.join(normalDir, `rollout-2026-06-20T09-00-00-${normalSessionId}.jsonl`);
    const archivedOnlyPath = path.join(archivedDir, `rollout-2026-06-20T09-05-00-${archivedSessionId}.jsonl`);
    fs.writeFileSync(duplicateArchivedPath, rolloutLines(normalSessionId, "C:/old/project", "archived duplicate should lose"), "utf8");
    fs.writeFileSync(normalPath, rolloutLines(normalSessionId, "C:/workspace/normal", "normal session should win"), "utf8");
    fs.writeFileSync(archivedOnlyPath, rolloutLines(archivedSessionId, "C:/workspace/archived", "archived source should still index"), "utf8");
    const oldDate = new Date("2026-06-20T01:00:00.000Z");
    const newDate = new Date("2026-06-20T02:00:00.000Z");
    fs.utimesSync(normalPath, oldDate, oldDate);
    fs.utimesSync(duplicateArchivedPath, newDate, newDate);

    runModuleInput("codex archived source regression failed", `
      import { scanCodexSessions } from "./src/adapters/codex.js";

      const sessions = scanCodexSessions();
      const normal = sessions.find((session) => session.sourceSessionId === ${JSON.stringify(normalSessionId)});
      const archived = sessions.find((session) => session.sourceSessionId === ${JSON.stringify(archivedSessionId)});

      if (!normal || !archived || sessions.length !== 2) {
        throw new Error("expected one normal and one archived Codex session, got " + JSON.stringify(sessions));
      }
      if (normal.metadata.sourceArchived || normal.sourcePath.includes("archived_sessions") || !normal.summary.includes("normal session should win")) {
        throw new Error("normal Codex sessions should win duplicate source ids: " + JSON.stringify(normal));
      }
      if (!archived.metadata.sourceArchived || !archived.sourcePath.includes("archived_sessions") || !archived.summary.includes("archived source should still index")) {
        throw new Error("archived Codex sessions should remain searchable: " + JSON.stringify(archived));
      }
    `, {
      USERPROFILE: tempRoot,
      HOME: tempRoot,
      THREADVAULT_DATA_DIR: path.join(tempRoot, "data")
    });
  } finally {
    const resolved = path.resolve(tempRoot);
    const temp = path.resolve(os.tmpdir());
    if (path.basename(resolved).startsWith("threadvault-codex-archived-") && resolved.startsWith(temp + path.sep)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

function runSessionFingerprintRegression() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threadvault-fingerprint-"));

  try {
    runModuleInput("session fingerprint regression failed", `
      import { getSessionDetail, upsertImportedSessions } from "./src/db/repository.js";
      import { hashSessionMessages } from "./src/utils/text.js";

      function messages(middleContent, middleModel = "model-a") {
        return [
          {
            id: "fingerprint-message-1",
            ordinal: 0,
            role: "user",
            content: "same first message",
            timestamp: "2026-06-10T01:00:00.000Z",
            model: null,
            referencedFiles: [],
            metadata: {}
          },
          {
            id: "fingerprint-message-2",
            ordinal: 1,
            role: "assistant",
            content: middleContent,
            timestamp: "2026-06-10T01:01:00.000Z",
            model: middleModel,
            referencedFiles: ["C:/workspace/demo/middle.js"],
            metadata: {}
          },
          {
            id: "fingerprint-message-3",
            ordinal: 2,
            role: "user",
            content: "same last message",
            timestamp: "2026-06-10T01:02:00.000Z",
            model: null,
            referencedFiles: [],
            metadata: {}
          }
        ];
      }

      function sessionWith(middleContent, middleModel) {
        const sessionMessages = messages(middleContent, middleModel);
        return {
          id: "fingerprint-session",
          sourceId: "codex",
          sourceLabel: "Codex",
          sourceSessionId: "fingerprint-source",
          title: "Stable title",
          summary: "Stable summary",
          workspacePath: "C:/workspace/demo",
          workspaceName: "demo",
          createdAt: "2026-06-10T01:00:00.000Z",
          updatedAt: "2026-06-10T02:00:00.000Z",
          status: "ready",
          resumeType: "workspace_only",
          fingerprint: hashSessionMessages(sessionMessages),
          sourcePath: "C:/history/fingerprint.jsonl",
          parseConfidence: 1,
          metadata: {},
          messages: sessionMessages
        };
      }

      const initial = sessionWith("middle before", "model-a");
      const changedMiddle = sessionWith("middle after", "model-a");
      const changedModel = sessionWith("middle after", "model-b");
      if (initial.fingerprint === changedMiddle.fingerprint || changedMiddle.fingerprint === changedModel.fingerprint) {
        throw new Error("message fingerprints should change for middle content and model changes");
      }

      const firstStats = upsertImportedSessions([initial]);
      const secondStats = upsertImportedSessions([changedMiddle]);
      if (firstStats.importedSessions !== 1 || secondStats.updatedSessions !== 1 || secondStats.skippedSessions !== 0) {
        throw new Error(\`middle-message changes should update existing sessions: first=\${JSON.stringify(firstStats)} second=\${JSON.stringify(secondStats)}\`);
      }

      const detail = getSessionDetail(initial.id);
      if (detail.messages[1]?.content !== "middle after") {
        throw new Error("updated session detail should include changed middle message");
      }
    `, {
      THREADVAULT_DATA_DIR: tempRoot
    });
  } finally {
    const resolved = path.resolve(tempRoot);
    const temp = path.resolve(os.tmpdir());
    if (path.basename(resolved).startsWith("threadvault-fingerprint-") && resolved.startsWith(temp + path.sep)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

function runOpenActionRedactionRegression() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "threadvault-open-action-"));

  try {
    runModuleInput("open action redaction regression failed", `
      import childProcess from "node:child_process";
      import fs from "node:fs";
      import path from "node:path";
      import { EventEmitter } from "node:events";
      import { upsertImportedSessions } from "./src/db/repository.js";
      import { openSessionTargetInVsCode } from "./src/services/actions.js";

      const sourcePath = path.join(${JSON.stringify(tempRoot)}, "source.jsonl");
      const workspaceFilePath = path.join(${JSON.stringify(tempRoot)}, "workspace.txt");
      fs.writeFileSync(sourcePath, "{}", "utf8");
      fs.writeFileSync(workspaceFilePath, "not a workspace", "utf8");

      const session = {
        id: "open-redaction-session",
        sourceId: "codex",
        sourceLabel: "Codex",
        sourceSessionId: "open-redaction",
        title: "Open redaction",
        summary: "Open redaction",
        workspacePath: ${JSON.stringify(tempRoot)},
        workspaceName: "open-redaction",
        createdAt: "2026-06-10T01:00:00.000Z",
        updatedAt: "2026-06-10T02:00:00.000Z",
        status: "ready",
        resumeType: "thread",
        fingerprint: "open-redaction-fingerprint",
        sourcePath,
        parseConfidence: 1,
        metadata: {},
        messages: [{
          id: "open-redaction-message",
          ordinal: 0,
          role: "user",
          content: "open redaction",
          timestamp: "2026-06-10T01:00:00.000Z",
          model: null,
          referencedFiles: [],
          metadata: {}
        }]
      };

      upsertImportedSessions([session]);
      const badSourceShapeSession = {
        ...session,
        id: "open-source-directory-session",
        sourceSessionId: "open-source-directory",
        fingerprint: "open-source-directory-fingerprint",
        sourcePath: ${JSON.stringify(tempRoot)},
        messages: [{
          ...session.messages[0],
          id: "open-source-directory-message"
        }]
      };
      const badWorkspaceShapeSession = {
        ...session,
        id: "open-workspace-file-session",
        sourceSessionId: "open-workspace-file",
        fingerprint: "open-workspace-file-fingerprint",
        workspacePath: workspaceFilePath,
        messages: [{
          ...session.messages[0],
          id: "open-workspace-file-message"
        }]
      };
      upsertImportedSessions([badSourceShapeSession, badWorkspaceShapeSession]);

      const badSourceShape = await openSessionTargetInVsCode(badSourceShapeSession.id, "source");
      if (badSourceShape.ok || !badSourceShape.error.includes("[LOCAL_PATH]") || badSourceShape.path !== "[LOCAL_PATH]" || JSON.stringify(badSourceShape).includes(${JSON.stringify(tempRoot)})) {
        throw new Error("directory source paths should be rejected and redacted: " + JSON.stringify(badSourceShape));
      }

      const badWorkspaceShape = await openSessionTargetInVsCode(badWorkspaceShapeSession.id, "workspace");
      if (badWorkspaceShape.ok || !badWorkspaceShape.error.includes("[LOCAL_PATH]") || badWorkspaceShape.path !== "[LOCAL_PATH]" || JSON.stringify(badWorkspaceShape).includes(workspaceFilePath)) {
        throw new Error("non-workspace file workspace paths should be rejected and redacted: " + JSON.stringify(badWorkspaceShape));
      }

      const originalStatSync = fs.statSync;
      fs.statSync = (targetPath, ...args) => {
        if (targetPath === sourcePath) {
          throw new Error("stat failed for C:/Users/wyh/private project/source file.jsonl token=ghp_abcdefghijklmnopqrs person@example.com");
        }
        return originalStatSync.call(fs, targetPath, ...args);
      };

      try {
        const missingAfterStatRace = await openSessionTargetInVsCode(session.id, "source");
        const payload = JSON.stringify(missingAfterStatRace);
        if (missingAfterStatRace.ok || missingAfterStatRace.path !== "[LOCAL_PATH]" || !missingAfterStatRace.error.includes("[LOCAL_PATH]")) {
          throw new Error("stat race should be treated as a redacted missing path: " + payload);
        }
        if (payload.includes("C:/Users/wyh") || payload.includes("private project") || payload.includes("source file.jsonl") || payload.includes("person@example.com") || payload.includes("ghp_abcdefghijklmnopqrs")) {
          throw new Error("stat race result leaked sensitive text: " + payload);
        }
      } finally {
        fs.statSync = originalStatSync;
      }

      const originalSpawn = childProcess.spawn;
      childProcess.spawn = () => {
        const child = new EventEmitter();
        child.unref = () => {};
        queueMicrotask(() => {
          child.emit("error", new Error("spawn failed at C:/Users/wyh/private project/source file.jsonl token=ghp_abcdefghijklmnopqrs person@example.com"));
        });
        return child;
      };

      try {
        const result = await openSessionTargetInVsCode(session.id, "source");
        const payload = JSON.stringify(result);
        if (result.ok) {
          throw new Error("open action should fail under mocked spawn");
        }
        if (payload.includes("C:/Users/wyh") || payload.includes("private project") || payload.includes("source file.jsonl") || payload.includes("person@example.com") || payload.includes("ghp_abcdefghijklmnopqrs")) {
          throw new Error("open action error leaked sensitive text: " + payload);
        }
        for (const marker of ["[LOCAL_PATH]", "[EMAIL]", "[SECRET]"]) {
          if (!payload.includes(marker)) {
            throw new Error("open action error should include " + marker + ": " + payload);
          }
        }
      } finally {
        childProcess.spawn = originalSpawn;
      }
    `, {
      THREADVAULT_DATA_DIR: tempRoot
    });
  } finally {
    const resolved = path.resolve(tempRoot);
    const temp = path.resolve(os.tmpdir());
    if (path.basename(resolved).startsWith("threadvault-open-action-") && resolved.startsWith(temp + path.sep)) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

function runConfigPathRegression() {
  runModuleInput("config path normalization regression failed", `
    import os from "node:os";
    import path from "node:path";

    const config = await import("./src/config.js");
    const expectedDataDir = path.resolve(process.cwd(), "relative-data");
    const expectedMemoryDir = path.join(os.homedir(), "threadvault-memory-check");

    if (config.DATA_DIR !== expectedDataDir) {
      throw new Error("relative THREADVAULT_DATA_DIR should resolve against the app root: " + config.DATA_DIR);
    }
    if (config.DB_PATH !== path.join(expectedDataDir, "threadvault.sqlite")) {
      throw new Error("DB_PATH should derive from normalized DATA_DIR: " + config.DB_PATH);
    }
    if (config.EXPORT_DIR !== path.join(expectedDataDir, "exports")) {
      throw new Error("EXPORT_DIR should derive from normalized DATA_DIR: " + config.EXPORT_DIR);
    }
    if (config.MEMORY_DIR !== expectedMemoryDir) {
      throw new Error("THREADVAULT_MEMORY_DIR should expand ~/ paths: " + config.MEMORY_DIR);
    }
  `, {
    THREADVAULT_DATA_DIR: "relative-data",
    THREADVAULT_MEMORY_DIR: "~/threadvault-memory-check",
    THREADVAULT_RUNTIME_FINGERPRINT: "verify"
  });

  runModuleInput("default memory path normalization regression failed", `
    import path from "node:path";

    const config = await import("./src/config.js");
    const expectedDataDir = path.resolve(process.cwd(), "relative-data");
    const expectedMemoryDir = path.join(expectedDataDir, "memory");

    if (config.DATA_DIR !== expectedDataDir) {
      throw new Error("relative THREADVAULT_DATA_DIR should resolve against the app root: " + config.DATA_DIR);
    }
    if (config.MEMORY_DIR !== expectedMemoryDir) {
      throw new Error("default MEMORY_DIR should derive from normalized DATA_DIR: " + config.MEMORY_DIR);
    }
  `, {
    THREADVAULT_DATA_DIR: "relative-data",
    THREADVAULT_MEMORY_DIR: "",
    THREADVAULT_RUNTIME_FINGERPRINT: "verify"
  });
}

assertGlobLikeSelfTest();
runConfigPathRegression();
runStateAndExportRegression();
runServerCorsRegression();
runServerHttpRegression();
runParserErrorRedactionRegression();
runFileUtilityRegression();
runCodexArchivedSourceRegression();
runSessionFingerprintRegression();
runOpenActionRedactionRegression();
assertI18nIntegrity();

for (const relativePath of sourceCheckFiles()) {
  if (!fs.existsSync(path.join(projectRoot, relativePath))) {
    fail(`${relativePath} is missing.`);
    continue;
  }
  run(process.execPath, ["--check", relativePath]);
}

const rootPackage = readJson("package.json");
if (rootPackage) {
  if (rootPackage.packageManager !== "npm@11.9.0") {
    fail("package.json should pin packageManager to npm@11.9.0 for reproducible local and CI commands.");
  }

  if (rootPackage.scripts?.["verify:publish"] !== "node scripts/verify.mjs --publish") {
    fail("package.json should expose verify:publish for strict Marketplace checks.");
  }

  if (rootPackage.scripts?.["package:vsix"] !== "npm --prefix extension run package:vsix") {
    fail("package.json package:vsix should delegate to the extension package script.");
  }

  if (rootPackage.scripts?.["publish:vsce"] !== "npm --prefix extension run publish:vsce") {
    fail("package.json publish:vsce should delegate to the extension publish script.");
  }
}

const extensionPackage = readJson("extension/package.json");
if (extensionPackage) {
  const properties = extensionPackage.contributes?.configuration?.properties || {};
  for (const key of ["threadvault.port", "threadvault.host", "threadvault.clientHost", "threadvault.nodePath", "threadvault.dataDirectory", "threadvault.memoryDirectory"]) {
    if (!properties[key]) {
      fail(`extension/package.json is missing setting ${key}.`);
    }
  }

  const dataDirectoryDescription = properties["threadvault.dataDirectory"]?.description || "";
  if (!dataDirectoryDescription.includes("Absolute paths and ~ paths are supported") || !dataDirectoryDescription.includes("relative paths resolve from the default storage parent")) {
    fail("threadvault.dataDirectory description should explain absolute, ~, and relative path handling.");
  }

  const memoryDirectoryDescription = properties["threadvault.memoryDirectory"]?.description || "";
  if (!memoryDirectoryDescription.includes("Absolute paths and ~ paths are supported") || !memoryDirectoryDescription.includes("relative paths resolve from the current data directory")) {
    fail("threadvault.memoryDirectory description should explain absolute, ~, and relative path handling.");
  }

  if (extensionPackage.publisher === "local") {
    const message = "extension/package.json publisher is still \"local\". Replace it with your VS Code Marketplace publisher id before publishing.";
    if (strictPublish) {
      fail(message);
    } else {
      warn(message);
    }
  }

  if (extensionPackage.type !== "commonjs") {
    fail("extension/package.json should set type to commonjs so extension.js keeps require() semantics.");
  }

  if (extensionPackage.preview !== true) {
    fail("extension/package.json should keep preview: true until the first public release is proven stable.");
  }

  if (!Array.isArray(extensionPackage.categories) || !extensionPackage.categories.includes("Other")) {
    fail("extension/package.json should include the Other category for Marketplace listing.");
  }

  for (const keyword of ["copilot", "codex", "claude", "ai", "chat", "archive", "search", "history", "memory", "local-first"]) {
    if (!extensionPackage.keywords?.includes(keyword)) {
      fail(`extension/package.json keywords should include ${keyword}.`);
    }
  }

  if (extensionPackage.galleryBanner?.color !== "#111614" || extensionPackage.galleryBanner?.theme !== "light") {
    fail("extension/package.json galleryBanner should use #111614 with light theme to match the current UI direction.");
  }

  if (JSON.stringify(extensionPackage.extensionKind || []) !== JSON.stringify(["ui"])) {
    fail("extension/package.json should declare extensionKind as [\"ui\"] because ThreadVault runs a local desktop service.");
  }

  if (extensionPackage.capabilities?.untrustedWorkspaces?.supported !== "limited") {
    fail("extension/package.json should declare limited untrusted workspace support.");
  }

  if (!extensionPackage.capabilities?.untrustedWorkspaces?.description?.includes("local history access")) {
    fail("extension/package.json untrusted workspace description should explain local history/path limitations.");
  }

  if (extensionPackage.capabilities?.virtualWorkspaces !== false) {
    fail("extension/package.json should mark virtualWorkspaces as false for local filesystem history access.");
  }

  if (extensionPackage.license !== rootPackage?.license) {
    fail("extension/package.json license should match the root package license.");
  }

  if (extensionPackage.scripts?.verify !== "node ../scripts/verify.mjs") {
    fail("extension/package.json should expose a verify script that runs ../scripts/verify.mjs.");
  }

  const packageScript = extensionPackage.scripts?.["package:vsix"] || "";
  if (!packageScript.includes("npm run prepare:app") || !packageScript.includes("npm run verify")) {
    fail("extension/package.json package:vsix should run prepare:app and verify before vsce.");
  }

  if (!packageScript.includes("npx --yes @vscode/vsce@3.9.2 package")) {
    fail("extension/package.json package:vsix should pin @vscode/vsce to 3.9.2 and use non-interactive npx --yes.");
  }

  if (extensionPackage.scripts?.["verify:publish"] !== "node ../scripts/verify.mjs --publish") {
    fail("extension/package.json should expose verify:publish for strict Marketplace checks.");
  }

  const publishScript = extensionPackage.scripts?.["publish:vsce"] || "";
  if (!publishScript.includes("npm run prepare:app") || !publishScript.includes("npm run verify:publish")) {
    fail("extension/package.json publish:vsce should run prepare:app and verify:publish before vsce.");
  }

  if (!publishScript.includes("npx --yes @vscode/vsce@3.9.2 publish")) {
    fail("extension/package.json publish:vsce should pin @vscode/vsce to 3.9.2 and use non-interactive npx --yes.");
  }

  if (extensionPackage.icon && !fileExists(path.join("extension", extensionPackage.icon))) {
    fail(`extension/package.json icon points to missing file ${extensionPackage.icon}.`);
  }

  if (extensionPackage.icon) {
    const iconPath = path.join("extension", extensionPackage.icon);
    const dimensions = pngDimensions(iconPath);
    if (!dimensions) {
      fail(`extension/package.json icon should be a PNG file: ${extensionPackage.icon}.`);
    } else if (dimensions.width !== 128 || dimensions.height !== 128) {
      fail(`extension/package.json icon should be 128x128, got ${dimensions.width}x${dimensions.height}.`);
    }
  }

  if (!extensionPackage.icon) {
    warn("extension/package.json has no icon. Add a 128x128 PNG before publishing for a stronger Marketplace listing.");
  }

  assertExtensionCommandsSynced(extensionPackage);
}

const runtimePackage = readJson("extension/app/package.json");
if (runtimePackage?.type !== "module") {
  fail("extension/app/package.json should set type to module for the bundled ESM server.");
}

const bundleMetadata = readJson("extension/app/.threadvault-bundle.json");
if (bundleMetadata && JSON.stringify(bundleMetadata.sourceEntries) !== JSON.stringify(["src", "public"])) {
  fail("extension/app/.threadvault-bundle.json should record src and public as bundled source entries.");
}
if (!/^[a-f0-9]{64}$/.test(bundleMetadata?.fingerprint || "")) {
  fail("extension/app/.threadvault-bundle.json should include a sha256 bundle fingerprint.");
}
if (Object.prototype.hasOwnProperty.call(bundleMetadata || {}, "generatedAt")) {
  fail("extension/app/.threadvault-bundle.json should avoid generatedAt so repeated prepare:extension runs stay stable.");
}

assertRequiredFiles([
  ".gitattributes",
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/feature_request.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "README.md",
  "CHANGELOG.md",
  "SUPPORT.md",
  "LICENSE",
  "extension/README.md",
  "extension/CHANGELOG.md",
  "extension/SUPPORT.md",
  "extension/LICENSE"
]);

assertFileContains("CHANGELOG.md", [
  "local service security headers",
  "request timeouts",
  "CORS write protection",
  "VSIX bundle metadata",
  "SECURITY and CONTRIBUTING guidance",
  "Regular/Favorite/Hidden state behavior",
  "Hidden win conflicting Favorite/Hidden updates",
  "`Copy local link`",
  "output actions rather than session states",
  "Marketplace gallery banner metadata",
  "bundled runtime fingerprints"
]);

assertFileContains(".gitattributes", [
  "* text=auto eol=lf",
  "*.png binary",
  "*.vsix binary",
  "*.sqlite binary",
  "*.sqlite-wal binary"
]);

assertFileContains(".github/ISSUE_TEMPLATE/bug_report.md", [
  "Report a ThreadVault problem without sharing private transcripts",
  "Node.js version (`node --version`)",
  "ThreadVault: Open Logs",
  "I removed private prompts, transcripts, source code, local paths, SQLite databases, exports, and memory notes."
]);

assertFileContains(".github/ISSUE_TEMPLATE/feature_request.md", [
  "Suggest a local-first improvement for ThreadVault",
  "Local-first and privacy notes",
  "Does this require network access?",
  "Can it work with local files only?"
]);

assertFileContains(".github/PULL_REQUEST_TEMPLATE.md", [
  "npm run prepare:extension",
  "npm run verify",
  "git diff --check",
  "No private prompts, transcripts, source history files, SQLite databases, exports, memory notes, logs, or VSIX files are included."
]);

assertFileContains("extension/CHANGELOG.md", [
  "local service security headers",
  "request timeouts",
  "command registration",
  "VSIX bundle metadata",
  "bundled runtime fingerprints"
]);

assertDirectorySynced("public", "extension/app/public");
assertDirectorySynced("src", "extension/app/src");

assertFileContains("src/services/exporter.js", [
  "WINDOWS_RESERVED_NAMES",
  "const MAX_MARKDOWN_BASENAME_LENGTH = 120",
  "const SESSION_FILENAME_HASH_LENGTH = 10",
  "const MAX_UNIQUE_MARKDOWN_ATTEMPTS = 1000",
  "function trimSlug",
  "function compactBaseName",
  "function sessionFileNameHash",
  "WINDOWS_RESERVED_NAMES.has(trimmed)",
  "function oneLine",
  "function markdownInline",
  ".replaceAll(\"&\", \"&amp;\")",
  ".replaceAll(\"<\", \"&lt;\")",
  ".replaceAll(\">\", \"&gt;\")",
  "function markdownHeading",
  "function markdownListValue",
  "function buildMarkdown(session, action = \"export\")",
  "- ThreadVault action: ",
  "- ThreadVault session id: ",
  "buildMarkdown(session, \"export\")",
  "buildMarkdown(session, \"memory\")",
  "for (const [index, message] of session.messages.entries())",
  "const turnNumber = index + 1",
  "- Turn: ${turnNumber}",
  "- Message id: ${markdownListValue(message.id)}",
  "lines.push(fence(annotation.noteText))",
  "function ensureInsideDirectory",
  "function uniqueMarkdownPath",
  "path.relative(root, target)",
  "fs.existsSync(candidate)",
  "index <= MAX_UNIQUE_MARKDOWN_ATTEMPTS",
  "Unable to create a unique Markdown file path after many attempts.",
  "directory: path.dirname"
]);

assertFileContains("scripts/prepare-extension.mjs", [
  "import crypto from \"node:crypto\"",
  "function bundleFingerprint",
  "crypto.createHash(\"sha256\")",
  "fingerprint: bundleFingerprint()"
]);

assertFileContains("public/app.js", [
  "const DEFAULT_REQUEST_TIMEOUT_MS = 30000",
  "const SCAN_REQUEST_TIMEOUT_MS = 120000",
  "const MAX_SESSION_ID_LENGTH = 512",
  "const MAX_SEARCH_QUERY_LENGTH = 500",
  "const MAX_TAGS = 20",
  "const MAX_TAG_LENGTH = 64",
  "const MAX_TAG_INPUT_LENGTH = 1500",
  "const MAX_NOTE_TEXT_LENGTH = 20000",
  "const MAX_RESPONSE_ERROR_TEXT_LENGTH = 20000",
  "maxlength=\"${MAX_TAG_INPUT_LENGTH}\"",
  "maxlength=\"${MAX_NOTE_TEXT_LENGTH}\"",
  "invalidResponse",
  "function safeDisplayError",
  "function redactDisplayLocalPaths",
  "function redactDisplaySensitiveText",
  "api[_-]?key|email|password|secret|token",
  "\\/Users|\\/home|\\/tmp|\\/var\\/folders",
  "showToast(safeDisplayError(error), \"warning\")",
  "requestTimedOut",
  "const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, ...fetchOptions } = options",
  "const controller = new AbortController()",
  "let completed = false",
  "window.setTimeout(() => controller.abort(), timeoutMs)",
  "signal: controller.signal",
  "error?.name === \"AbortError\"",
  "text = await response.text()",
  "function safeResponseErrorDetail",
  "truncateDisplayText(String(value || \"\"), MAX_RESPONSE_ERROR_TEXT_LENGTH)",
  "function parseJsonPayload",
  "payload = JSON.parse(trimmed)",
  "throw new Error(detail ? `${t(\"invalidResponse\")}: ${detail}` : t(\"invalidResponse\"))",
  "Array.isArray(payload)",
  "safeDisplayError(payload.error || `${t(\"requestFailed\")}: ${response.status}`)",
  "if (!completed)",
  "window.clearTimeout(timeoutId)",
  "timeoutMs: SCAN_REQUEST_TIMEOUT_MS",
  "const { headers = {}, ...requestOptions } = options",
  "...requestOptions",
  "...headers",
  "function readLocalStorage",
  "function writeLocalStorage",
  "return window.localStorage.getItem(key)",
  "window.localStorage.setItem(key, value)",
  "readLocalStorage(SETTINGS.storageKey)",
  "writeLocalStorage(SETTINGS.storageKey",
  "readLocalStorage(LAYOUT.storageKey)",
  "writeLocalStorage(LAYOUT.storageKey",
  "let selectSessionSequence = 0",
  "let leaving = false",
  "let autoDismissId = 0",
  "if (leaving)",
  "window.clearTimeout(autoDismissId)",
  "autoDismissId = window.setTimeout(removeToast, 4200)",
  "Drag or use arrow keys to resize the session library",
  "aria-valuetext",
  "elements.drawerResizer.addEventListener(\"keydown\"",
  "event.key === \"ArrowLeft\"",
  "event.key === \"ArrowRight\"",
  "event.key === \"Home\"",
  "event.key === \"End\"",
  "function browserSessionUrl",
  "function normalizeSessionId",
  "function normalizeSearchQuery",
  "sessionId.length > MAX_SESSION_ID_LENGTH",
  "MAX_SEARCH_QUERY_LENGTH",
  "const normalizedSessionId = normalizeSessionId(sessionId || \"\")",
  "new URL(window.location.pathname || \"/\", window.location.origin)",
  "function applyHostMode",
  "topbarRight: document.querySelector(\".topbar-right\")",
  "elements.topbarRight.hidden = !isEmbedMode",
  "elements.openBrowserButton.hidden = !isEmbedMode",
  "window.location.href = fallbackUrl",
  "function restoreFocus",
  "Focus restoration is best-effort",
  "const previousFocus = document.activeElement",
  "return document.execCommand(\"copy\")",
  "finally {",
  "textarea.remove();",
  "restoreFocus(previousFocus)",
  "function showActionError",
  "const message = safeDisplayError(error)",
  "status.textContent = message",
  "function normalizeAnnotationState",
  "function normalizeAnnotationTags",
  "function normalizeAnnotationNote",
  "function annotationDraftChanged",
  "noChangesToSave",
  "function annotationStatus",
  "function statusViewModel",
  "function statusChipHtml",
  "function stateActionForStatus",
  "function stateButtonTabIndex",
  "function stateButtonLabel",
  "function annotationPayloadForStatus",
  "function filterSessionsForCurrentStatusView",
  "function renderNoSessionSelected",
  "state.sessions = filterSessionsForCurrentStatusView(payload.sessions || [])",
  "state.query = normalizedQuery",
  "params.set(\"q\", normalizedQuery)",
  "const preserveUrlSelection = Boolean(urlSessionId && state.selectedSessionId === urlSessionId)",
  "!preserveUrlSelection",
  "const selectedSessionId = state.selectedSessionId",
  "selectedSessionId !== urlSessionId",
  "renderNoSessionSelected()",
  "const sequence = ++selectSessionSequence",
  "sequence !== selectSessionSequence",
  "state.selectedSessionId !== normalizedSessionId",
  "params.set(\"archivedOnly\", \"1\")",
  "params.set(\"includeArchived\", \"1\")",
  "function focusStateButton",
  "favorite: archived ? false : Boolean(annotation.favorite)",
  "Export copy",
  "Save note",
  "Output actions",
  "These actions do not change the session state",
  "statusChipHtml(annotation, { skipDefault: true })",
  "statusChipHtml(annotation, { detail: true })",
  "data-source-filter=\"${escapeHtml(card.sourceId)}\" aria-pressed=\"${card.active ? \"true\" : \"false\"}\"",
  "const nextSourceFilter = node.getAttribute(\"data-source-filter\") || \"\"",
  "state.sourceFilter = state.sourceFilter === nextSourceFilter ? \"\" : nextSourceFilter",
  "role=\"button\" tabindex=\"0\" aria-current=",
  "const openSessionItem = (node) =>",
  "event.key === \"Enter\" || event.key === \" \"",
  "delete elements.sessionDetail.dataset.actionBusy",
  "const actionButtons = Array.from(elements.sessionDetail.querySelectorAll(\"[data-action]\"))",
  "const previousDisabled = new Map(actionButtons.map((actionButton) => [actionButton, actionButton.disabled]))",
  "for (const actionButton of actionButtons)",
  "actionButton.disabled = true",
  "actionButton.disabled = previousDisabled.get(actionButton) || false",
  "data-action=\"state-default\"",
  "data-action=\"state-favorite\"",
  "data-action=\"state-archived\"",
  "id=\"state-actions-label\"",
  "id=\"state-actions-help\"",
  "role=\"group\" aria-labelledby=\"state-actions-label\" aria-describedby=\"state-actions-help\"",
  "id=\"output-actions-label\"",
  "id=\"output-actions-help\"",
  "role=\"group\" aria-labelledby=\"output-actions-label\" aria-describedby=\"output-actions-help\"",
  "aria-pressed=\"${currentStatus === \"default\" ? \"true\" : \"false\"}\"",
  "aria-pressed=\"${currentStatus === \"favorite\" ? \"true\" : \"false\"}\"",
  "aria-pressed=\"${currentStatus === \"archived\" ? \"true\" : \"false\"}\"",
  "tabindex=\"${stateButtonTabIndex(currentStatus, \"default\")}\"",
  "tabindex=\"${stateButtonTabIndex(currentStatus, \"favorite\")}\"",
  "tabindex=\"${stateButtonTabIndex(currentStatus, \"archived\")}\"",
  "stateButtonLabel(currentStatus, \"favorite\")",
  "stateButtonLabel(currentStatus, \"archived\")",
  "querySelector(\".action-group-state\")?.addEventListener(\"keydown\"",
  "\"ArrowLeft\", \"ArrowUp\", \"ArrowRight\", \"ArrowDown\", \"Home\", \"End\"",
  "buttons[nextIndex]?.focus({ preventScroll: true })",
  "focusStateButton(annotationStatus(nextAnnotation))",
  "const nextAnnotation = await saveAnnotation(session.id, annotationPayloadForStatus(nextStatus))",
  "#save-note-button",
  "button.disabled = true",
  "label.textContent = t(\"saving\")",
  "if (!annotationDraftChanged(annotation, tags, noteText))",
  "const message = t(\"noChangesToSave\")",
  "showActionError(t(\"sourceMissing\"), status)",
  "showActionError(t(\"workspaceMissing\"), status)",
  "showActionError(result.error || t(\"exportFailed\"), status)",
  "showActionError(result.error || t(\"memoryFailed\"), status)",
  "showActionError(t(\"copyFailed\"), status)",
  "showActionError(error, status)",
  "showToast(message, \"warning\")",
  "function isAllowedHostBridgeOrigin",
  "state.hostBridgeOrigin = event.origin",
  "state.hostBridgeOrigin",
  "sessionId: session.id",
  "target: \"source\"",
  "target: \"workspace\"",
  "favorite: false,",
  "archived: true",
  "result.failedSessions",
  "result.failedSources",
  "scanSourceFailed",
  "function outputResultName",
  "result?.fileName || basenameFromPath(result?.path) || t(\"unknown\")",
  "const outputName = outputResultName(result)",
  "status.textContent = message"
]);

assertFileContains("public/styles.css", [
  "[hidden]",
  "display: none !important",
  ".visually-hidden",
  ".session-item:focus-visible",
  ".action-cluster-state",
  ".action-cluster-output",
  ".topbar-browser-button",
  "body.embed-mode .topbar-browser-button",
  "display: none"
]);

assertFileExcludes("public/app.js", [
  "archiveAction",
  "archiveConfirm",
  "archive: \"Hide\"",
  "favoritedAction",
  "unfavoriteAction",
  "hideAction",
  "Export MD",
  "Save memory",
  "Copy link",
  "window.confirm(",
  "window.open(",
  "const isArchived = Boolean(annotation.archived)",
  "\u9356\u70ac\u4eee\u6fb6",
  "role=\"radiogroup\"",
  "role=\"radio\"",
  "aria-checked=",
  "stateRadioTabIndex",
  "payload = { error: text }",
  "throw new Error(payload.error || `${t(\"requestFailed\")}: ${response.status}`)",
  "status.textContent = `${t(\"exportedTo\")} ${result.path}`",
  "status.textContent = `${t(\"memorySaved\")} ${result.path}`"
]);

assertFileContains("public/index.html", [
  "href=\"/favicon.svg\"",
  "type=\"image/svg+xml\"",
  "aria-label=\"Search sessions\"",
  "maxlength=\"500\"",
  "data-i18n-aria-label=\"searchSessions\"",
  "id=\"stats\" class=\"source-grid\" role=\"group\"",
  "data-i18n-aria-label=\"sources\"",
  "class=\"topbar-right\" hidden",
  "id=\"drawer-resizer\"",
  "role=\"separator\"",
  "aria-orientation=\"vertical\"",
  "aria-valuemin=\"292\"",
  "aria-valuemax=\"500\"",
  "aria-valuenow=\"328\"",
  "aria-valuetext=\"328px\"",
  "title=\"Drag or use arrow keys to resize the session library\""
]);

assertFileContains("src/db/repository.js", [
  "const MAX_TAGS = 20",
  "const MAX_TAG_LENGTH = 64",
  "const MAX_NOTE_TEXT_LENGTH = 20000",
  "const MAX_SOURCE_ID_LENGTH = 128",
  "function normalizeQuery",
  "function escapeLikeQuery",
  "function normalizeLimit",
  "function normalizeSourceId",
  "const normalizedSourceId = normalizeSourceId(sourceId)",
  "if (normalizedSourceId === null)",
  "function normalizeAnnotationNote",
  "function annotationTagsEqual",
  "const isUnchanged =",
  "return current",
  "const seen = new Set()",
  "text.toLocaleLowerCase()",
  "matchAll(/[\\p{L}\\p{N}_][\\p{L}\\p{N}_-]*/gu)",
  "replaceAll(\"\\\"\", \"\\\"\\\"\")",
  "\"*`).join(\" AND \")",
  "favorite: archived ? false : Boolean(row.favorite)",
  "const normalizedQuery = normalizeQuery(query)",
  "const normalizedLimit = normalizeLimit(limit)",
  "a.favorite = 1 AND COALESCE(a.archived, 0) = 0",
  "if (updateArchived === true)",
  "nextFavorite = false",
  "else if (updateFavorite === true)",
  "nextArchived = false",
  "failedSessions",
  "stats.errors",
  "const likeQuery = escapeLikeQuery(normalizedQuery)",
  "AS fallbackRank",
  "ORDER BY fallbackRank DESC",
  "const fallbackRankParams = Array(8).fill(likeQuery)",
  "ESCAPE '\\\\'",
  "COALESCE(a.tags_json, '[]') LIKE ?",
  "FROM messages m",
  "m.content LIKE ?",
  "m.referenced_files_json LIKE ?",
  "let transactionOpen = false",
  "db.exec(\"BEGIN TRANSACTION\")",
  "if (transactionOpen)"
]);

assertFileContains("src/db/database.js", [
  "SET favorite = 0",
  "WHERE favorite = 1 AND archived = 1"
]);

assertFileContains("extension/extension.js", [
  "function normalizeHostSetting",
  "const maybeBareIpv6 = bracketless.split(\":\").length > 2",
  "parsed.hostname.replace(/^\\[(.*)\\]$/, \"$1\")",
  "function readBundleFingerprint",
  "function computeAppFingerprint",
  "fingerprint: runtime.fingerprint",
  ".threadvault-bundle.json",
  "currentFingerprint !== bundledFingerprint",
  "fingerprint: computeAppFingerprint(devRoot)",
  "fingerprint: readBundleFingerprint(targetRoot) || bundledFingerprint",
  "THREADVAULT_RUNTIME_FINGERPRINT: runtime.fingerprint || \"\"",
  "const HEALTH_APP_NAME = \"ThreadVault\"",
  "const MAX_EXTENSION_ERROR_LENGTH = 360",
  "const MAX_RESPONSE_ERROR_TEXT_LENGTH = 20000",
  "const MAX_SESSION_ID_LENGTH = 512",
  "const VALID_OPEN_TARGETS = new Set([\"source\", \"workspace\"])",
  "function healthMatches",
  "function readServerHealth",
  "function errorMessage(error)",
  "function safeExtensionMessage",
  "function redactLocalPaths",
  "function redactSensitiveText",
  "function expandPath(value, basePath = process.cwd())",
  "return path.resolve(basePath, text)",
  "return expandPath(extensionConfig().get(key, \"\"), path.dirname(fallbackPath)) || fallbackPath",
  "function safeResponseErrorDetail",
  "function parseResponsePayload",
  "safeExtensionMessage(capped, \"\")",
  "payload = JSON.parse(text)",
  "Array.isArray(payload)",
  "ThreadVault returned unexpected JSON (${statusCode || 0}).",
  "api[_-]?key|email|password|secret|token",
  "\\/Users|\\/home|\\/tmp|\\/var\\/folders",
  "[LOCAL_PATH]",
  "[SECRET]",
  "[EMAIL]",
  "function runCommandSafely(label, callback)",
  "const message = `${label} failed: ${errorMessage(error)}`",
  "vscode.window.showErrorMessage(message)",
  "function urlHost",
  "function dashboardBaseUrl",
  "function normalizeSessionId",
  "sessionId.length > MAX_SESSION_ID_LENGTH",
  "function rememberServerStderr",
  "could not start|server failed|EADDRINUSE|listen EADDRINUSE",
  "frame-src ${urlOrigin}",
  "localResourceRoots: []",
  "showWarningMessage(message)",
  "result.failedSources",
  "Ignoring port in ${settingName}; use threadvault.port instead.",
  "Invalid ${settingName} value",
  "function stopServerProcess",
  "const intentionalServerStops = new WeakSet()",
  "function request(method, route, options = {})",
  "const MAX_RESPONSE_BYTES = 2 * 1024 * 1024",
  "const timeoutMs = options.timeoutMs || 2500",
  "let settled = false",
  "const settle = (callback, value) =>",
  "const chunks = []",
  "let receivedBytes = 0",
  "receivedBytes += chunk.length",
  "receivedBytes > MAX_RESPONSE_BYTES",
  "ThreadVault response body is too large.",
  "chunks.push(Buffer.from(chunk))",
  "Buffer.concat(chunks, receivedBytes).toString(\"utf8\")",
  "res.setTimeout(timeoutMs",
  "ThreadVault response timed out after ${timeoutMs}ms.",
  "res.on(\"error\", (error) => settle(reject, error))",
  "ThreadVault returned invalid JSON (${statusCode || 0})",
  "const payload = parseResponsePayload(body, res.statusCode)",
  "new Error(safeExtensionMessage(payload.error || `ThreadVault request failed with status ${res.statusCode}.`))",
  "res.statusCode < 200 || res.statusCode >= 300",
  "ThreadVault request failed with status ${res.statusCode}.",
  "req.setTimeout(timeoutMs",
  "req.on(\"error\", (error) => settle(reject, error))",
  "ThreadVault request timed out after ${timeoutMs}ms.",
  "payload.app === HEALTH_APP_NAME",
  "Number(payload.port) === configuredPort()",
  "Ignoring unexpected health response",
  "intentionalServerStops.add(processToStop)",
  "const launchedProcess = childProcess.spawn",
  "serverProcess = launchedProcess",
  "intentionalServerStops.has(launchedProcess)",
  "if (serverProcess === launchedProcess)",
  "rememberServerStderr(text)",
  "vscode.workspace.onDidChangeConfiguration",
  "event.affectsConfiguration(\"threadvault\")",
  "ThreadVault settings changed. Restarting the local server on next use.",
  "let restartedForRuntime = false",
  "await stopServerProcess(\"ThreadVault settings or runtime changed. Restarting the local server.\")",
  "if (!restartedForRuntime && healthMatches(health, runtime.fingerprint))",
  "if (await isServerReady(runtime.fingerprint))",
  "health.runtimeFingerprint !== runtime.fingerprint",
  "Using runtime fingerprint ${runtime.fingerprint || \"unknown\"}",
  "A different ThreadVault runtime is already running on ${dashboardBaseUrl()}. Stop it or change threadvault.port.",
  "request(\"POST\", \"/api/scan\", { timeoutMs: 120000 })",
  "return stopServerProcess(\"Stopping ThreadVault local server.\")",
  "vscode.commands.registerCommand(\"threadvault.startServer\", runCommandSafely",
  "vscode.commands.registerCommand(\"threadvault.openDashboard\", runCommandSafely",
  "vscode.commands.registerCommand(\"threadvault.openPanel\", runCommandSafely",
  "vscode.commands.registerCommand(\"threadvault.openLogs\", runCommandSafely",
  "vscode.commands.registerCommand(\"threadvault.rescan\", runCommandSafely",
  "message.hostToken !== hostToken",
  "...payload,\n    source: \"threadvault-host\",\n    hostToken",
  "threadvault-open-browser",
  "function openErrorResult",
  "function safeStat",
  "VALID_OPEN_TARGETS.has(target)",
  "const stat = targetPath ? safeStat(targetPath) : null",
  "path: redactedPath(targetPath)",
  "const sessionId = normalizeSessionId(parsedUrl.searchParams.get(\"session\") || \"\")",
  "baseUrl.searchParams.set(\"session\", sessionId)",
  "error: errorMessage(error)"
]);

assertFileExcludes("extension/extension.js", [
  "body += chunk.toString()",
  "${body || error.message}",
  "new Error(payload.error || `ThreadVault request failed with status ${res.statusCode}.`)",
  "error: error.message || String(error)",
  "fs.existsSync(targetPath)",
  "parsedUrl.searchParams.delete(\"embed\")",
  "parsedUrl.searchParams.delete(\"host\")",
  "parsedUrl.searchParams.delete(\"hostToken\")",
  "parsedUrl.searchParams.delete(\"v\")"
]);

assertFileContains("src/server.js", [
  "import { safeErrorMessage }",
  "function sendError",
  "safeErrorMessage(error, fallback)",
  "export function corsHeaders",
  "export function requestHasAllowedWriteOrigin",
  "function baseHeaders",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Content-Security-Policy",
  "frame-ancestors 'self' vscode-webview:",
  "base-uri 'none'",
  "form-action 'none'",
  "const LOOPBACK_WRITE_HOSTS",
  "function normalizeOrigin",
  "function allowedWriteOrigins",
  "const ALLOWED_WRITE_ORIGINS = allowedWriteOrigins()",
  "function urlHost",
  "const MAX_SESSION_ID_LENGTH = 512",
  "const MAX_SOURCE_ID_LENGTH = 128",
  "function normalizeSessionId",
  "function normalizeSourceId",
  "function sessionIdFromPayload",
  "function decodePathComponent",
  "Invalid session id encoding.",
  "GET, HEAD, POST, OPTIONS",
  "request.method === \"HEAD\"",
  "if (request.method === \"HEAD\")",
  "(request.method === \"GET\" || request.method === \"HEAD\") && url.pathname === \"/api/health\"",
  "runtimeFingerprint: RUNTIME_FINGERPRINT",
  "function methodAllowedForStatic",
  "Method not allowed.",
  "function isJsonObject",
  "function runInitialScanSoon",
  "function isMainModule",
  "export function createServer",
  "let fileStat = null",
  "fileStat = filePath ? fs.statSync(filePath) : null",
  "if (!fileStat?.isFile())",
  "error: \"Not found\"",
  "error: \"Session not found\"",
  "error: \"Unknown API route\"",
  "Promise.resolve(callback(payload)).catch",
  "if (!response.headersSent)",
  "setTimeout(() =>",
  "http://${urlHost(APP_HOST)}:${APP_PORT}",
  "source errors ${result.failedSources || 0}",
  "node: process.versions.node",
  "host: APP_HOST",
  "port: APP_PORT",
  "const chunks = []",
  "chunks.push(Buffer.from(chunk))",
  "Buffer.concat(chunks, receivedBytes).toString(\"utf8\")",
  "Request body must be a JSON object.",
  "const sessionId = sessionIdFromPayload(payload)",
  "!sessionId",
  "Invalid source id.",
  "Session id is required.",
  "Open target must be source or workspace.",
  "openSessionTargetInVsCode(sessionId, payload.target)",
  "ALLOWED_WRITE_ORIGINS.has(normalizeOrigin(origin))",
  "\"Access-Control-Allow-Origin\": origin || \"*\"",
  "Cross-origin write requests are not allowed."
]);

assertFileExcludes("src/server.js", [
  "payload.sessionId,",
  "chunk.toString()"
]);

assertFileContains("src/utils/text.js", [
  "export function hashSessionMessages",
  "export function safeErrorMessage",
  "export function redactLocalPath",
  "function redactLocalPaths",
  "function redactSensitiveText",
  "api[_-]?key|email|password|secret|token",
  "\\/Users|\\/home|\\/tmp|\\/var\\/folders",
  "[LOCAL_PATH]",
  "[SECRET]",
  "[EMAIL]"
]);

assertFileContains("src/services/indexer.js", [
  "import { safeErrorMessage }",
  "safeErrorMessage(source.error, \"Source scan failed.\")",
  "sourceStats: sanitizeSourceStats(sourceStats)",
  "function sanitizeSourceStats"
]);

assertFileContains("src/db/repository.js", [
  "import { redactLocalPath, safeErrorMessage, snippet }",
  "sourcePath: redactLocalPath(session?.sourcePath)",
  "safeErrorMessage(error, \"Session import failed.\")"
]);

assertFileContains("src/config.js", [
  "function computeAppFingerprint",
  "RUNTIME_FINGERPRINT = String(process.env.THREADVAULT_RUNTIME_FINGERPRINT || \"\").trim() || computeAppFingerprint(APP_ROOT)"
]);

assertFileContains("scripts/verify.mjs", [
  "http-hidden-session",
  "request(\"/api/sessions?archivedOnly=1\")",
  "archivedOnly should return only hidden sessions",
  "request(\"/api/sessions?favoritesOnly=1\")",
  "favoritesOnly should return only non-hidden favorites"
]);

assertFileContains("README.md", [
  "[![CI](https://github.com/wyh/threadvault/actions/workflows/ci.yml/badge.svg)]",
  "code --install-extension extension/threadvault-vscode-*.vsix",
  "Get-ChildItem extension\\threadvault-vscode-*.vsix",
  "git diff --name-only",
  "git diff --cached --name-only",
  "does not upload transcripts, source paths, exports, memory notes, or the SQLite archive",
  "marked preview for its first VS Code Marketplace release",
  "Session state is intentionally one-of-three",
  "This does not delete the source history file or the local database row.",
  "`Export copy`: create a Markdown copy under `data/exports/`",
  "`Save note`: save a durable Markdown note under the memory directory",
  "They do not change whether a session is `Regular`, `Favorite`, or `Hidden`",
  "`Copy local link`: copy a local-only URL",
  "See `CONTRIBUTING.md` for local setup",
  "See `SECURITY.md` for the supported security model",
  "`preview`, and `galleryBanner`",
  "Keep the Marketplace icon at `extension/media/threadvault.png`",
  "Write requests are restricted to these local origins plus the explicitly configured bind host.",
  "If you bind to `0.0.0.0`, keep browser access on `127.0.0.1`"
]);

assertFileContains("SUPPORT.md", [
  "Confirm `node --version` is 24 or newer.",
  "If you are running from source:",
  "Do not upload private prompts, transcripts, SQLite databases, exports, memory notes, full source history files"
]);

assertFileContains("CONTRIBUTING.md", [
  "Use Node.js 24 or newer.",
  "there is no dependency install step for normal local development",
  "npm run prepare:extension",
  "npm run verify",
  "git diff --check",
  "git diff --name-only",
  "git diff --cached --name-only",
  "pinned non-interactive `npx --yes @vscode/vsce@3.9.2`",
  "Do not commit private prompts, transcripts, source history files, SQLite databases, exports, memory notes, logs, screenshots with private code, or generated VSIX files.",
  "Keep session states mutually exclusive: `Regular`, `Favorite`, and `Hidden`.",
  "Preserve local-first defaults."
]);

assertFileExcludes("CONTRIBUTING.md", [
  "npm install"
]);

assertFileContains("SECURITY.md", [
  "ThreadVault is local-first software",
  "Please do not post private prompts, transcripts, SQLite databases, exports, memory notes, full source history files",
  "The local server binds to `127.0.0.1` by default.",
  "Write requests are restricted to local origins plus the explicitly configured bind host.",
  "VS Code webview actions use a tokenized host bridge.",
  "redact local paths, UNC/network share paths, email addresses, and common token/secret formats",
  "unexpected HTML/text responses are treated as sanitized protocol errors",
  "Source targets must be files, and workspace targets must be folders or `.code-workspace` files.",
  "sanitized, compacted, and bounded",
  "Please treat any change that weakens these defaults as security-sensitive."
]);

assertFileContains("README.md", [
  "ThreadVault does not upload transcripts, source paths, exports, memory notes, or the SQLite archive.",
  "Markdown exports and memory notes include the ThreadVault session id plus per-message turn numbers and message ids",
  "Custom `THREADVAULT_DATA_DIR` and `THREADVAULT_MEMORY_DIR` values may be absolute paths, paths relative to the app root, or `~` paths under your home directory.",
  "The local HTTP API is intended for ThreadVault itself, VS Code, and browser pages opened from `localhost`, `127.0.0.1`, or `::1`.",
  "redact local paths, network share paths, email addresses, and common token formats",
  "validate that saved targets still exist and have the expected shape before launching VS Code",
  "Markdown export and memory-save filenames are sanitized, shortened, and bounded."
]);

assertFileContains("docs/technical-design.md", [
  "This document describes the current implementation.",
  "src/server.js",
  "public/app.js",
  "extension/extension.js",
  "SHA-256 fingerprint",
  "same version number",
  "bundle fingerprint changes",
  "running server signature also includes the runtime fingerprint",
  "health endpoint returns it too",
  "same-version VSIX installs and development source changes restart the local service",
  "Real HTTP behavior",
  "Server, browser, and extension error paths redact local paths",
  "The browser API client accepts JSON object responses only",
  "Open actions validate saved target shape before launching VS Code",
  "Export and memory filenames are sanitized, compacted",
  "frontend response parsing guardrails"
]);

assertFileContains("docs/tasks-mvp.md", [
  "This checklist reflects the current repository state",
  "Replace `publisher: \"local\"`",
  "Mutually exclusive session state",
  "Hidden` wins conflicting Favorite/Hidden updates",
  "Copy local link",
  "copies a local session link",
  "real HTTP behavior"
]);

assertFileContains("docs/schema.md", [
  "This document mirrors the current schema created in `src/db/database.js`.",
  "CREATE TABLE IF NOT EXISTS sessions",
  "source_label TEXT NOT NULL",
  "CREATE TABLE IF NOT EXISTS session_annotations",
  "favorite` and `archived` are mutually exclusive",
  "CREATE VIRTUAL TABLE IF NOT EXISTS session_search USING fts5"
]);

assertFileContains("docs/implementation-plan.md", [
  "ThreadVault has passed the initial MVP stage.",
  "Replace `publisher: \"local\"`",
  "Run `npm run package:vsix`",
  "Markdown export, Markdown memory save, and local-only session links",
  "state/export/memory/link regressions",
  "Confirm `Copy local link` copies a local-only URL",
  "real HTTP behavior",
  "Keep the local-first privacy model as the default."
]);

for (const [relativePath, stalePattern] of [
  ["docs/technical-design.md", "extension.ts"],
  ["docs/technical-design.md", "indexer/"],
  ["docs/technical-design.md", "shared/"],
  ["docs/tasks-mvp.md", "TypeScript project references"],
  ["docs/tasks-mvp.md", "ThreadVault: Scan All"],
  ["docs/schema.md", "CREATE TABLE sources"],
  ["docs/schema.md", "CREATE TABLE tags"],
  ["docs/schema.md", "CREATE TABLE notes"],
  ["docs/schema.md", "CREATE TABLE artifacts"],
  ["docs/schema.md", "CREATE TABLE scan_events"],
  ["docs/schema.md", "resume_payload_json"],
  ["docs/implementation-plan.md", "shared package compiles"],
  ["docs/implementation-plan.md", "first real adapter"],
  ["docs/implementation-plan.md", "IPC request"]
]) {
  const content = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
  if (content.includes(stalePattern)) {
    fail(`${relativePath} contains stale architecture reference: ${stalePattern}.`);
  }
}

assertFileContains("extension/README.md", [
  "a session can be in exactly one state: `Regular`, `Favorite`, or `Hidden`",
  "ThreadVault does not delete the source history file",
  "Output actions do not change that state",
  "`Export copy` creates a Markdown copy",
  "`Save note` writes a durable Markdown note",
  "Directory settings accept absolute paths, `~` paths under your home directory, and relative paths.",
  "Relative `threadvault.dataDirectory` values resolve from the default storage parent",
  "relative `threadvault.memoryDirectory` values resolve from the current data directory",
  "The generated VSIX is written to the `extension` folder.",
  "`preview`",
  "`galleryBanner`",
  "root `SECURITY.md`, and root `CONTRIBUTING.md`",
  "Write requests are restricted to local origins plus the explicitly configured bind host.",
  "If you bind to `0.0.0.0`, usually keep `threadvault.clientHost` on `127.0.0.1`."
]);

assertFileContains("extension/CHANGELOG.md", [
  "Regular/Favorite/Hidden state behavior",
  "Hidden win conflicting Favorite/Hidden updates",
  "`Copy local link`",
  "output actions rather than session states",
  "SECURITY and CONTRIBUTING guidance",
  "Marketplace gallery banner metadata"
]);

assertFileContains("extension/SUPPORT.md", [
  "Confirm `node --version` is 24 or newer",
  "Keep `threadvault.host` on `127.0.0.1`",
  "Do not upload private prompts, transcripts, SQLite databases, exports, memory notes, full source history files"
]);

assertFileContains(".github/workflows/ci.yml", [
  "permissions:",
  "contents: read",
  "timeout-minutes: 10",
  "node-version: 24",
  "npm run verify",
  "name: Package VSIX",
  "npm run package:vsix"
]);

assertFileContains("src/config.js", [
  "function parsePort",
  "function normalizeHostSetting",
  "function expandConfigPath",
  "text === \"~\"",
  "text.startsWith(\"~/\")",
  "path.resolve(APP_ROOT, text)",
  "const maybeBareIpv6 = bracketless.split(\":\").length > 2",
  "APP_PORT = parsePort(process.env.THREADVAULT_PORT)",
  "APP_HOST = normalizeHostSetting(process.env.THREADVAULT_HOST)",
  "DATA_DIR = expandConfigPath(process.env.THREADVAULT_DATA_DIR",
  "MEMORY_DIR = expandConfigPath(process.env.THREADVAULT_MEMORY_DIR",
  "CODEX_ARCHIVED_SESSIONS_DIR"
]);

assertFileContains("src/services/actions.js", [
  "import { getSessionDetail }",
  "import { safeStat }",
  "import { safeErrorMessage }",
  "const VALID_TARGETS = new Set([\"source\", \"workspace\"])",
  "function codeCommandError",
  "function isWorkspaceFile",
  "function targetShapeError",
  "The saved workspace path is not a folder or .code-workspace file",
  "The saved source path is a folder, not a transcript file",
  "error?.code === \"ENOENT\"",
  "const details = safeErrorMessage(error, \"Unknown error\")",
  "Install the VS Code shell command",
  "return new Promise",
  "child.once(\"error\"",
  "child.once(\"spawn\"",
  "function pathForSessionTarget",
  "export async function openSessionTargetInVsCode",
  "safeErrorMessage(`The saved ${label} path no longer exists: ${targetPath}`)",
  "path: targetPath ? \"[LOCAL_PATH]\" : \"\"",
  "!VALID_TARGETS.has(target)",
  "Open target must be source or workspace.",
  "const stat = targetPath ? safeStat(targetPath) : null",
  "const launchResult = await launchCode",
  "const targetPath = pathForSessionTarget(session, target)"
]);

assertFileExcludes("src/services/actions.js", [
  "fs.existsSync(targetPath)",
  "fs.statSync(targetPath)"
]);

assertFileContains("src/services/indexer.js", [
  "function summarizeSourceErrors",
  "failedSources",
  "sourceErrors: sourceErrors.slice(0, 20)"
]);

assertFileContains("src/adapters/index.js", [
  "import { safeErrorMessage }",
  "safeErrorMessage(error, \"Source scan failed.\")"
]);

assertFileContains("src/utils/fs.js", [
  "import { safeErrorMessage }",
  "export function safeStat",
  "export function sortByModifiedDesc",
  "modifiedAt: safeStat(filePath)?.mtimeMs || 0",
  "right.modifiedAt - left.modifiedAt || left.index - right.index",
  "safeStat(filePath)?.isFile()",
  "try {",
  "MAX_PARSE_ERROR_SAMPLES",
  "export function parseErrorSummary",
  "safeErrorMessage(sample?.error, \"Parse error.\")",
  "total: 0",
  "const records = []",
  "const errorSamples = []",
  "let errorTotal = 0",
  "for (const [index, rawLine] of lines.entries())",
  "const line = rawLine.trim()",
  "safeErrorMessage(error, \"JSON line could not be parsed.\")",
  "Object.defineProperty(records, \"parseErrors\"",
  "samples: errorSamples"
]);

assertFileContains("src/utils/jsonPatch.js", [
  "import { safeErrorMessage }",
  "MAX_PARSE_ERROR_SAMPLES",
  "const errorSamples = []",
  "let errorTotal = 0",
  "JSON.parse(line)",
  "safeErrorMessage(error, \"JSON patch line could not be parsed.\")",
  "state, \"parseErrors\"",
  "samples: errorSamples"
]);

for (const relativePath of ["src/adapters/copilot.js", "src/adapters/codex.js", "src/adapters/claude.js"]) {
  assertFileContains(relativePath, [
    "hashSessionMessages",
    "safeErrorMessage",
    "const parseError = safeErrorMessage(error, \"Session file could not be parsed.\")",
    "hashSessionMessages(messages)",
    "summary: parseError",
    "error: parseError",
    "parseErrorSummary",
    "parseErrors",
    "sortByModifiedDesc"
  ]);
}

assertFileContains("src/adapters/codex.js", [
  "CODEX_ARCHIVED_SESSIONS_DIR",
  "function codexSessionFileEntries",
  "sourceArchived: true",
  "metadata: {",
  "sourceArchived: Boolean(options.sourceArchived)"
]);

const vscodeIgnore = fs.readFileSync(path.join(projectRoot, "extension", ".vscodeignore"), "utf8");
for (const pattern of ["*.vsix", "*.log", "app/data/**", "app/**/exports/**", "app/**/memory/**", "app/**/*.sqlite", "app/**/*.sqlite-shm", "app/**/*.sqlite-wal"]) {
  if (!vscodeIgnore.includes(pattern)) {
    fail(`extension/.vscodeignore should include ${pattern}.`);
  }
}

const gitIgnore = fs.readFileSync(path.join(projectRoot, ".gitignore"), "utf8");
for (const pattern of ["data/", "*.vsix", "*.log", "*.sqlite", "*.sqlite-shm", "*.sqlite-wal", "extension/app/"]) {
  if (!gitIgnore.includes(pattern)) {
    fail(`.gitignore should include ${pattern}.`);
  }
}

assertNoTrackedSensitiveFiles();
assertExtensionPackageContent();

run("git", ["diff", "--check"]);

if (process.exitCode) {
  process.exit(process.exitCode);
}

for (const message of warnings) {
  console.warn(`verify warning: ${message}`);
}

console.log("verify ok");
