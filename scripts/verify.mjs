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
          content: "Please keep this local.",
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

      const favorited = updateSessionAnnotation(session.id, { favorite: true });
      if (!favorited.favorite || favorited.archived) {
        throw new Error(\`favorite should enable favorite and clear hidden: \${JSON.stringify(favorited)}\`);
      }

      const hidden = updateSessionAnnotation(session.id, { archived: true });
      if (hidden.favorite || !hidden.archived) {
        throw new Error(\`hide should clear favorite and enable hidden: \${JSON.stringify(hidden)}\`);
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

      const favorites = listSessions({ favoritesOnly: true });
      const hiddenList = listSessions({ archivedOnly: true });
      if (favorites.length !== 1 || hiddenList.length !== 0) {
        throw new Error(\`unexpected list filters: favorites=\${favorites.length} hidden=\${hiddenList.length}\`);
      }

      const strangeSearch = listSessions({ query: '" ^ * NEAR() ###', limit: 99999 });
      if (!Array.isArray(strangeSearch) || strangeSearch.length > 500) {
        throw new Error(\`search fallback or limit normalization failed: \${strangeSearch.length}\`);
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

      const exportMarkdown = fs.readFileSync(exportResult.path, "utf8");
      const memoryMarkdown = fs.readFileSync(memoryResult.path, "utf8");
      if (!exportMarkdown.includes("- ThreadVault action: export")) {
        throw new Error("export markdown should record the ThreadVault action");
      }
      if (!memoryMarkdown.includes("- ThreadVault action: memory")) {
        throw new Error("memory markdown should record the ThreadVault action");
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

      const server = createServer();
      let baseUrl = "";

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
          if (options.body) {
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

        const health = await request("/api/health");
        if (health.status !== 200) {
          throw new Error("health should return 200, got " + health.status);
        }
        const healthPayload = JSON.parse(health.body);
        if (!healthPayload.ok || healthPayload.app !== "ThreadVault" || !healthPayload.host || !healthPayload.port || !healthPayload.node) {
          throw new Error("health payload is missing diagnostics: " + health.body);
        }

        const healthHead = await request("/api/health", { method: "HEAD" });
        if (healthHead.status !== 200 || healthHead.body !== "") {
          throw new Error("HEAD health should return headers without a body, got " + healthHead.status + " " + healthHead.body.length);
        }
        if (!String(healthHead.headers["content-type"] || "").startsWith("application/json")) {
          throw new Error("HEAD health should keep JSON content type");
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

assertGlobLikeSelfTest();
runStateAndExportRegression();
runServerCorsRegression();
runServerHttpRegression();
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

  for (const keyword of ["copilot", "codex", "claude", "chat", "archive", "search", "history"]) {
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
  "WINDOWS_RESERVED_NAMES.has(slug)",
  "function oneLine",
  "function markdownInline",
  ".replaceAll(\"&\", \"&amp;\")",
  ".replaceAll(\"<\", \"&lt;\")",
  ".replaceAll(\">\", \"&gt;\")",
  "function markdownHeading",
  "function markdownListValue",
  "function buildMarkdown(session, action = \"export\")",
  "- ThreadVault action: ",
  "buildMarkdown(session, \"export\")",
  "buildMarkdown(session, \"memory\")",
  "lines.push(fence(annotation.noteText))",
  "function ensureInsideDirectory",
  "function uniqueMarkdownPath",
  "path.relative(root, target)",
  "fs.existsSync(candidate)",
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
  "requestTimedOut",
  "const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, ...fetchOptions } = options",
  "const controller = new AbortController()",
  "let completed = false",
  "window.setTimeout(() => controller.abort(), timeoutMs)",
  "signal: controller.signal",
  "error?.name === \"AbortError\"",
  "text = await response.text()",
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
  "status.textContent = message",
  "function normalizeAnnotationState",
  "function annotationStatus",
  "function statusViewModel",
  "function statusChipHtml",
  "function stateActionForStatus",
  "function stateButtonTabIndex",
  "function stateButtonLabel",
  "function focusStateButton",
  "favorite: archived ? false : Boolean(annotation.favorite)",
  "statusChipHtml(annotation, { skipDefault: true })",
  "statusChipHtml(annotation, { detail: true })",
  "data-source-filter=\"${escapeHtml(card.sourceId)}\" aria-pressed=\"${card.active ? \"true\" : \"false\"}\"",
  "role=\"button\" tabindex=\"0\" aria-current=",
  "const openSessionItem = (node) =>",
  "event.key === \"Enter\" || event.key === \" \"",
  "delete elements.sessionDetail.dataset.actionBusy",
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
  "#save-note-button",
  "button.disabled = true",
  "label.textContent = t(\"saving\")",
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
  "window.confirm(",
  "window.open(",
  "const isArchived = Boolean(annotation.archived)",
  "\u9356\u70ac\u4eee\u6fb6",
  "role=\"radiogroup\"",
  "role=\"radio\"",
  "aria-checked=",
  "stateRadioTabIndex",
  "status.textContent = `${t(\"exportedTo\")} ${result.path}`",
  "status.textContent = `${t(\"memorySaved\")} ${result.path}`"
]);

assertFileContains("public/index.html", [
  "href=\"/favicon.svg\"",
  "type=\"image/svg+xml\"",
  "aria-label=\"Search sessions\"",
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
  "function normalizeQuery",
  "function normalizeLimit",
  "const seen = new Set()",
  "text.toLocaleLowerCase()",
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
  "db.exec(\"BEGIN TRANSACTION\")"
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
  ".threadvault-bundle.json",
  "currentFingerprint !== bundledFingerprint",
  "const HEALTH_APP_NAME = \"ThreadVault\"",
  "function errorMessage(error)",
  "function runCommandSafely(label, callback)",
  "const message = `${label} failed: ${errorMessage(error)}`",
  "vscode.window.showErrorMessage(message)",
  "function urlHost",
  "function dashboardBaseUrl",
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
  "let receivedBytes = 0",
  "receivedBytes += chunk.length",
  "receivedBytes > MAX_RESPONSE_BYTES",
  "ThreadVault response body is too large.",
  "res.setTimeout(timeoutMs",
  "ThreadVault response timed out after ${timeoutMs}ms.",
  "res.on(\"error\", (error) => settle(reject, error))",
  "ThreadVault returned invalid JSON (${res.statusCode || 0})",
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
  "let restartedForSettings = false",
  "await stopServerProcess(\"ThreadVault settings changed. Restarting the local server.\")",
  "if (!restartedForSettings && await isServerReady())",
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
  "const sessionId = parsedUrl.searchParams.get(\"session\") || \"\"",
  "baseUrl.searchParams.set(\"session\", sessionId)",
  "error: error.message || String(error)"
]);

assertFileExcludes("extension/extension.js", [
  "parsedUrl.searchParams.delete(\"embed\")",
  "parsedUrl.searchParams.delete(\"host\")",
  "parsedUrl.searchParams.delete(\"hostToken\")",
  "parsedUrl.searchParams.delete(\"v\")"
]);

assertFileContains("src/server.js", [
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
  "function hasSessionId",
  "function decodePathComponent",
  "Invalid session id encoding.",
  "GET, HEAD, POST, OPTIONS",
  "request.method === \"HEAD\"",
  "if (request.method === \"HEAD\")",
  "(request.method === \"GET\" || request.method === \"HEAD\") && url.pathname === \"/api/health\"",
  "function methodAllowedForStatic",
  "Method not allowed.",
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
  "!hasSessionId(payload)",
  "Session id is required.",
  "Open target must be source or workspace.",
  "openSessionTargetInVsCode(payload.sessionId, payload.target)",
  "ALLOWED_WRITE_ORIGINS.has(normalizeOrigin(origin))",
  "\"Access-Control-Allow-Origin\": origin || \"*\"",
  "Cross-origin write requests are not allowed."
]);

assertFileContains("README.md", [
  "[![CI](https://github.com/wyh/threadvault/actions/workflows/ci.yml/badge.svg)]",
  "code --install-extension extension/threadvault-vscode-*.vsix",
  "Get-ChildItem extension\\threadvault-vscode-*.vsix",
  "git diff --name-only",
  "git diff --cached --name-only",
  "Session state is intentionally one-of-three",
  "This does not delete the source history file or the local database row.",
  "`Export MD`: create a Markdown copy under `data/exports/`",
  "`Save memory`: save a durable Markdown note under the memory directory",
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
  "npm run prepare:extension",
  "npm run verify",
  "git diff --check",
  "git diff --name-only",
  "git diff --cached --name-only",
  "Do not commit private prompts, transcripts, source history files, SQLite databases, exports, memory notes, logs, screenshots with private code, or generated VSIX files.",
  "Keep session states mutually exclusive: `Regular`, `Favorite`, and `Hidden`.",
  "Preserve local-first defaults."
]);

assertFileContains("SECURITY.md", [
  "ThreadVault is local-first software",
  "Please do not post private prompts, transcripts, SQLite databases, exports, memory notes, full source history files",
  "The local server binds to `127.0.0.1` by default.",
  "Write requests are restricted to local origins plus the explicitly configured bind host.",
  "VS Code webview actions use a tokenized host bridge.",
  "Please treat any change that weakens these defaults as security-sensitive."
]);

assertFileContains("docs/technical-design.md", [
  "This document describes the current implementation.",
  "src/server.js",
  "public/app.js",
  "extension/extension.js",
  "SHA-256 fingerprint",
  "same version number",
  "bundle fingerprint changes",
  "Real HTTP behavior"
]);

assertFileContains("docs/tasks-mvp.md", [
  "This checklist reflects the current repository state",
  "Replace `publisher: \"local\"`",
  "Mutually exclusive session state",
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
  "`Save memory` writes a durable Markdown note",
  "The generated VSIX is written to the `extension` folder.",
  "`preview`",
  "`galleryBanner`",
  "root `SECURITY.md`, and root `CONTRIBUTING.md`",
  "Write requests are restricted to local origins plus the explicitly configured bind host.",
  "If you bind to `0.0.0.0`, usually keep `threadvault.clientHost` on `127.0.0.1`."
]);

assertFileContains("extension/CHANGELOG.md", [
  "Regular/Favorite/Hidden state behavior",
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
  "const maybeBareIpv6 = bracketless.split(\":\").length > 2",
  "APP_PORT = parsePort(process.env.THREADVAULT_PORT)",
  "APP_HOST = normalizeHostSetting(process.env.THREADVAULT_HOST)"
]);

assertFileContains("src/services/actions.js", [
  "import { getSessionDetail }",
  "const VALID_TARGETS = new Set([\"source\", \"workspace\"])",
  "function codeCommandError",
  "error?.code === \"ENOENT\"",
  "Install the VS Code shell command",
  "return new Promise",
  "child.once(\"error\"",
  "child.once(\"spawn\"",
  "function pathForSessionTarget",
  "export async function openSessionTargetInVsCode",
  "!VALID_TARGETS.has(target)",
  "Open target must be source or workspace.",
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
