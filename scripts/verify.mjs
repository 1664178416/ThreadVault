import fs from "node:fs";
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

assertGlobLikeSelfTest();

for (const relativePath of sourceCheckFiles()) {
  if (!fs.existsSync(path.join(projectRoot, relativePath))) {
    fail(`${relativePath} is missing.`);
    continue;
  }
  run(process.execPath, ["--check", relativePath]);
}

readJson("package.json");
const extensionPackage = readJson("extension/package.json");
if (extensionPackage) {
  const properties = extensionPackage.contributes?.configuration?.properties || {};
  for (const key of ["threadvault.port", "threadvault.host", "threadvault.clientHost", "threadvault.nodePath", "threadvault.dataDirectory", "threadvault.memoryDirectory"]) {
    if (!properties[key]) {
      fail(`extension/package.json is missing setting ${key}.`);
    }
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

  if (extensionPackage.scripts?.verify !== "node ../scripts/verify.mjs") {
    fail("extension/package.json should expose a verify script that runs ../scripts/verify.mjs.");
  }

  const packageScript = extensionPackage.scripts?.["package:vsix"] || "";
  if (!packageScript.includes("npm run prepare:app") || !packageScript.includes("npm run verify")) {
    fail("extension/package.json package:vsix should run prepare:app and verify before vsce.");
  }

  if (extensionPackage.scripts?.["verify:publish"] !== "node ../scripts/verify.mjs --publish") {
    fail("extension/package.json should expose verify:publish for strict Marketplace checks.");
  }

  const publishScript = extensionPackage.scripts?.["publish:vsce"] || "";
  if (!publishScript.includes("npm run prepare:app") || !publishScript.includes("npm run verify:publish")) {
    fail("extension/package.json publish:vsce should run prepare:app and verify:publish before vsce.");
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
}

const runtimePackage = readJson("extension/app/package.json");
if (runtimePackage?.type !== "module") {
  fail("extension/app/package.json should set type to module for the bundled ESM server.");
}

assertRequiredFiles([
  "README.md",
  "CHANGELOG.md",
  "SUPPORT.md",
  "LICENSE",
  "extension/README.md",
  "extension/CHANGELOG.md",
  "extension/SUPPORT.md",
  "extension/LICENSE"
]);

assertDirectorySynced("public", "extension/app/public");
assertDirectorySynced("src", "extension/app/src");

assertFileContains("src/services/exporter.js", [
  "WINDOWS_RESERVED_NAMES",
  "WINDOWS_RESERVED_NAMES.has(slug)",
  "function oneLine",
  "function markdownInline",
  "function markdownHeading",
  "function markdownListValue",
  "lines.push(fence(annotation.noteText))",
  "function ensureInsideDirectory",
  "function uniqueMarkdownPath",
  "path.relative(root, target)",
  "fs.existsSync(candidate)",
  "directory: path.dirname"
]);

assertFileContains("public/app.js", [
  "function normalizeAnnotationState",
  "favorite: archived ? false : Boolean(annotation.favorite)",
  "delete elements.sessionDetail.dataset.actionBusy",
  "function isAllowedHostBridgeOrigin",
  "state.hostBridgeOrigin = event.origin",
  "state.hostBridgeOrigin",
  "sessionId: session.id",
  "target: \"source\"",
  "target: \"workspace\"",
  "...(!isArchived ? { favorite: false } : {})",
  "result.failedSessions",
  "result.failedSources",
  "scanSourceFailed",
  "result.fileName || result.path",
  "status.textContent = `${t(\"exportedTo\")} ${result.path}`",
  "status.textContent = `${t(\"memorySaved\")} ${result.path}`"
]);

assertFileContains("public/styles.css", [
  "[hidden]",
  "display: none !important"
]);

assertFileContains("public/index.html", [
  "href=\"/favicon.svg\"",
  "type=\"image/svg+xml\""
]);

assertFileContains("src/db/repository.js", [
  "favorite: archived ? false : Boolean(row.favorite)",
  "a.favorite = 1 AND COALESCE(a.archived, 0) = 0",
  "if (updateFavorite === true)",
  "nextArchived = false",
  "else if (updateArchived === true)",
  "nextFavorite = false",
  "failedSessions",
  "stats.errors",
  "db.exec(\"BEGIN TRANSACTION\")"
]);

assertFileContains("src/db/database.js", [
  "SET favorite = 0",
  "WHERE favorite = 1 AND archived = 1"
]);

assertFileContains("extension/extension.js", [
  "function normalizeHostSetting",
  "parsed.hostname.replace(/^\\[(.*)\\]$/, \"$1\")",
  "function urlHost",
  "function dashboardBaseUrl",
  "frame-src ${urlOrigin}",
  "localResourceRoots: []",
  "showWarningMessage(message)",
  "result.failedSources",
  "Ignoring port in ${settingName}; use threadvault.port instead.",
  "Invalid ${settingName} value",
  "function stopServerProcess",
  "let restartedForSettings = false",
  "await stopServerProcess(\"ThreadVault settings changed. Restarting the local server.\")",
  "if (!restartedForSettings && await isServerReady())",
  "message.hostToken !== hostToken",
  "...payload,\n    source: \"threadvault-host\",\n    hostToken",
  "threadvault-open-browser",
  "error: error.message || String(error)"
]);

assertFileContains("src/server.js", [
  "function corsHeaders",
  "function requestHasAllowedWriteOrigin",
  "function urlHost",
  "function hasSessionId",
  "function runInitialScanSoon",
  "Promise.resolve(callback(payload)).catch",
  "if (!response.headersSent)",
  "setTimeout(() =>",
  "http://${urlHost(APP_HOST)}:${APP_PORT}",
  "source errors ${result.failedSources || 0}",
  "!hasSessionId(payload)",
  "Session id is required.",
  "openSessionTargetInVsCode(payload.sessionId, payload.target)",
  "origin === serverOrigin(request)",
  "\"Access-Control-Allow-Origin\": origin || \"*\"",
  "Cross-origin write requests are not allowed."
]);

assertFileContains("src/services/actions.js", [
  "import { getSessionDetail }",
  "return new Promise",
  "child.once(\"error\"",
  "child.once(\"spawn\"",
  "function pathForSessionTarget",
  "export async function openSessionTargetInVsCode",
  "const launchResult = await launchCode",
  "const targetPath = pathForSessionTarget(session, target)"
]);

assertFileContains("src/services/indexer.js", [
  "function summarizeSourceErrors",
  "failedSources",
  "sourceErrors: sourceErrors.slice(0, 20)"
]);

assertFileContains("src/utils/fs.js", [
  "export function safeStat",
  "export function sortByModifiedDesc",
  "safeStat(filePath)?.isFile()",
  "try {",
  "MAX_PARSE_ERROR_SAMPLES",
  "export function parseErrorSummary",
  "total: 0",
  "const records = []",
  "const errorSamples = []",
  "let errorTotal = 0",
  "Object.defineProperty(records, \"parseErrors\"",
  "samples: errorSamples"
]);

assertFileContains("src/utils/jsonPatch.js", [
  "MAX_PARSE_ERROR_SAMPLES",
  "const errorSamples = []",
  "let errorTotal = 0",
  "JSON.parse(line)",
  "state, \"parseErrors\"",
  "samples: errorSamples"
]);

for (const relativePath of ["src/adapters/copilot.js", "src/adapters/codex.js", "src/adapters/claude.js"]) {
  assertFileContains(relativePath, ["parseErrorSummary", "parseErrors", "sortByModifiedDesc"]);
}

const vscodeIgnore = fs.readFileSync(path.join(projectRoot, "extension", ".vscodeignore"), "utf8");
for (const pattern of ["*.vsix", "*.log", "app/data/**", "app/**/exports/**", "app/**/memory/**", "app/**/*.sqlite", "app/**/*.sqlite-shm", "app/**/*.sqlite-wal"]) {
  if (!vscodeIgnore.includes(pattern)) {
    fail(`extension/.vscodeignore should include ${pattern}.`);
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
