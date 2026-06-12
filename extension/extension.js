const vscode = require("vscode");
const path = require("node:path");
const fs = require("node:fs");
const childProcess = require("node:child_process");
const http = require("node:http");
const crypto = require("node:crypto");
const os = require("node:os");
const extensionPackage = require("./package.json");

const DEFAULT_PORT = 3187;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_CLIENT_HOST = "127.0.0.1";
const HEALTH_APP_NAME = "ThreadVault";
const MIN_NODE_MAJOR = 24;
const RUNTIME_APP_DIRNAME = "runtime-app";
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

let serverProcess = null;
let outputChannel = null;
let serverConfigKey = "";
let lastServerError = "";
const intentionalServerStops = new WeakSet();

class ActionItem extends vscode.TreeItem {
  constructor(label, command, description) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.command = command;
    this.description = description;
  }
}

class ThreadVaultActionsProvider {
  getTreeItem(element) {
    return element;
  }

  getChildren() {
    return [
      new ActionItem(
        "Start Local Server",
        {
          command: "threadvault.startServer",
          title: "Start Local Server"
        },
        "Run the local ThreadVault service"
      ),
      new ActionItem(
        "Open Embedded Panel",
        {
          command: "threadvault.openPanel",
          title: "Open Embedded Panel"
        },
        "Show the local dashboard inside VS Code"
      ),
      new ActionItem(
        "Open Dashboard In Browser",
        {
          command: "threadvault.openDashboard",
          title: "Open Dashboard In Browser"
        },
        "Open the local archive UI in your browser"
      ),
      new ActionItem(
        "Open Logs",
        {
          command: "threadvault.openLogs",
          title: "Open Logs"
        },
        "Inspect the local ThreadVault server logs"
      ),
      new ActionItem(
        "Rescan Local History",
        {
          command: "threadvault.rescan",
          title: "Rescan Local History"
        },
        "Refresh the local archive from supported local sources"
      )
    ];
  }
}

function logLine(message) {
  outputChannel?.appendLine(`[ThreadVault] ${message}`);
}

function setServerError(message) {
  lastServerError = message;
  logLine(message);
}

function errorMessage(error) {
  return error?.message || String(error || "Unknown error");
}

function runCommandSafely(label, callback) {
  return async () => {
    try {
      await callback();
    } catch (error) {
      const message = `${label} failed: ${errorMessage(error)}`;
      setServerError(message);
      outputChannel?.show(true);
      vscode.window.showErrorMessage(message);
    }
  };
}

function rememberServerStderr(text) {
  if (!text) {
    return;
  }

  if (/could not start|server failed|EADDRINUSE|listen EADDRINUSE/i.test(text)) {
    setServerError(text);
    return;
  }

  logLine(text);
}

function extensionConfig() {
  return vscode.workspace.getConfiguration("threadvault");
}

function configuredPort() {
  const value = Number(extensionConfig().get("port", DEFAULT_PORT));
  return Number.isInteger(value) && value > 0 && value <= 65535 ? value : DEFAULT_PORT;
}

function normalizeHostSetting(value, fallback, settingName) {
  const text = String(value || "").trim();
  if (!text) {
    return fallback;
  }

  const bracketless = text.replace(/^\[(.*)\]$/, "$1");
  const maybeBareIpv6 = bracketless.split(":").length > 2;
  if (!text.includes("://") && maybeBareIpv6 && /^[0-9a-f:.]+$/i.test(bracketless)) {
    return bracketless;
  }

  try {
    const parsed = new URL(text.includes("://") ? text : `http://${text}`);
    if (parsed.hostname) {
      if (parsed.port) {
        logLine(`Ignoring port in ${settingName}; use threadvault.port instead.`);
      }
      return parsed.hostname.replace(/^\[(.*)\]$/, "$1");
    }
  } catch {
    logLine(`Invalid ${settingName} value "${text}". Falling back to ${fallback}.`);
  }

  return fallback;
}

function configuredHost() {
  return normalizeHostSetting(extensionConfig().get("host", DEFAULT_HOST), DEFAULT_HOST, "threadvault.host");
}

function configuredClientHost() {
  return normalizeHostSetting(extensionConfig().get("clientHost", DEFAULT_CLIENT_HOST), DEFAULT_CLIENT_HOST, "threadvault.clientHost");
}

function urlHost(host) {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

function dashboardBaseUrl() {
  return `http://${urlHost(configuredClientHost())}:${configuredPort()}`;
}

function configuredNodePath() {
  return String(extensionConfig().get("nodePath", "") || "").trim() || "node";
}

function expandPath(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  if (text === "~") {
    return os.homedir();
  }

  if (text.startsWith(`~${path.sep}`) || text.startsWith("~/")) {
    return path.join(os.homedir(), text.slice(2));
  }

  return path.resolve(text);
}

function configuredPath(key, fallbackPath) {
  return expandPath(extensionConfig().get(key, "")) || fallbackPath;
}

function serverConfigSignature(runtime) {
  return JSON.stringify({
    port: configuredPort(),
    host: configuredHost(),
    clientHost: configuredClientHost(),
    nodePath: configuredNodePath(),
    dataDir: runtime.dataDir,
    memoryDir: runtime.memoryDir,
    root: runtime.root,
    fingerprint: runtime.fingerprint
  });
}

function hasAppFiles(rootPath) {
  return fs.existsSync(path.join(rootPath, "src", "server.js")) && fs.existsSync(path.join(rootPath, "public", "app.js"));
}

function listFilesRecursive(rootPath) {
  const files = [];
  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function computeAppFingerprint(rootPath) {
  try {
    const hash = crypto.createHash("sha256");
    for (const entryName of ["src", "public"]) {
      const entryRoot = path.join(rootPath, entryName);
      for (const filePath of listFilesRecursive(entryRoot)) {
        const relativePath = path.relative(rootPath, filePath).replaceAll(path.sep, "/");
        hash.update(relativePath);
        hash.update("\0");
        hash.update(fs.readFileSync(filePath));
        hash.update("\0");
      }
    }
    return hash.digest("hex");
  } catch {
    return "";
  }
}

function readBundleFingerprint(rootPath) {
  try {
    const metadataPath = path.join(rootPath, ".threadvault-bundle.json");
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
    return typeof metadata.fingerprint === "string" ? metadata.fingerprint : "";
  } catch {
    return "";
  }
}

function developmentAppRoot(context) {
  return path.resolve(context.extensionPath, "..");
}

function bundledAppRoot(context) {
  return path.join(context.extensionPath, "app");
}

function runtimeStorageRoot(context) {
  return context.globalStorageUri.fsPath;
}

function runtimeAppRoot(context) {
  return path.join(runtimeStorageRoot(context), RUNTIME_APP_DIRNAME);
}

function ensureRuntimeApp(context) {
  const defaultDevDataDir = path.join(developmentAppRoot(context), "data");
  const devRoot = developmentAppRoot(context);
  if (hasAppFiles(devRoot)) {
    const dataDir = configuredPath("dataDirectory", defaultDevDataDir);
    return {
      mode: "development",
      root: devRoot,
      fingerprint: computeAppFingerprint(devRoot),
      dataDir,
      memoryDir: configuredPath("memoryDirectory", path.join(dataDir, "memory"))
    };
  }

  const bundledRoot = bundledAppRoot(context);
  if (!hasAppFiles(bundledRoot)) {
    throw new Error("ThreadVault app bundle is missing. Run `npm run prepare:extension` from the project root before packaging.");
  }

  const storageRoot = runtimeStorageRoot(context);
  const targetRoot = runtimeAppRoot(context);
  const versionFile = path.join(targetRoot, ".threadvault-version");
  const bundledVersion = extensionPackage.version;
  const currentVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, "utf8").trim() : "";
  const bundledFingerprint = readBundleFingerprint(bundledRoot);
  const currentFingerprint = readBundleFingerprint(targetRoot);

  fs.mkdirSync(storageRoot, { recursive: true });

  if (!hasAppFiles(targetRoot) || currentVersion !== bundledVersion || currentFingerprint !== bundledFingerprint) {
    fs.rmSync(targetRoot, { recursive: true, force: true });
    fs.mkdirSync(targetRoot, { recursive: true });
    fs.cpSync(bundledRoot, targetRoot, { recursive: true });
    fs.writeFileSync(versionFile, bundledVersion, "utf8");
    logLine(`Prepared bundled app runtime in ${targetRoot}`);
  }

  const dataDir = configuredPath("dataDirectory", path.join(storageRoot, "data"));
  return {
    mode: "bundled",
    root: targetRoot,
    fingerprint: readBundleFingerprint(targetRoot) || bundledFingerprint,
    dataDir,
    memoryDir: configuredPath("memoryDirectory", path.join(dataDir, "memory"))
  };
}

function serverEntry(appRoot) {
  return path.join(appRoot, "src", "server.js");
}

function checkNodeRuntime() {
  const nodePath = configuredNodePath();
  const result = childProcess.spawnSync(nodePath, ["-p", "process.versions.node"], {
    encoding: "utf8",
    windowsHide: true
  });

  if (result.error) {
    return {
      ok: false,
      nodePath,
      message: `Unable to run Node.js at "${nodePath}". Set threadvault.nodePath to a Node.js ${MIN_NODE_MAJOR}+ executable.`
    };
  }

  if (result.status !== 0) {
    return {
      ok: false,
      nodePath,
      message: `Node.js check failed for "${nodePath}": ${(result.stderr || result.stdout || "").trim()}`
    };
  }

  const version = String(result.stdout || "").trim();
  const major = Number(version.split(".")[0]);
  if (!Number.isInteger(major) || major < MIN_NODE_MAJOR) {
    return {
      ok: false,
      nodePath,
      version,
      message: `ThreadVault requires Node.js ${MIN_NODE_MAJOR}+ because it uses node:sqlite. Found ${version || "unknown"} at "${nodePath}".`
    };
  }

  return {
    ok: true,
    nodePath,
    version
  };
}

function request(method, route, options = {}) {
  const port = configuredPort();
  const host = configuredClientHost();
  const timeoutMs = options.timeoutMs || 2500;
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback, value) => {
      if (settled) {
        return;
      }
      settled = true;
      callback(value);
    };

    const req = http.request(
      {
        hostname: host,
        port,
        path: route,
        method
      },
      (res) => {
        let body = "";
        let receivedBytes = 0;
        res.setTimeout(timeoutMs, () => {
          req.destroy(new Error(`ThreadVault response timed out after ${timeoutMs}ms.`));
        });
        res.on("data", (chunk) => {
          receivedBytes += chunk.length;
          if (receivedBytes > MAX_RESPONSE_BYTES) {
            req.destroy(new Error("ThreadVault response body is too large."));
            return;
          }

          body += chunk.toString();
        });
        res.on("error", (error) => settle(reject, error));
        res.on("end", () => {
          let payload = {};
          try {
            payload = JSON.parse(body || "{}");
          } catch (error) {
            settle(reject, new Error(`ThreadVault returned invalid JSON (${res.statusCode || 0}): ${body || error.message}`));
            return;
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            settle(reject, new Error(payload.error || `ThreadVault request failed with status ${res.statusCode}.`));
            return;
          }

          settle(resolve, payload);
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`ThreadVault request timed out after ${timeoutMs}ms.`));
    });
    req.on("error", (error) => settle(reject, error));
    req.end();
  });
}

function stopServerProcess(reason = "Stopping local server.") {
  const processToStop = serverProcess;
  if (!processToStop || processToStop.killed) {
    serverProcess = null;
    serverConfigKey = "";
    return Promise.resolve();
  }

  logLine(reason);
  return new Promise((resolve) => {
    intentionalServerStops.add(processToStop);
    const timeout = setTimeout(() => {
      logLine("Timed out waiting for the local server to stop.");
      resolve();
    }, 3000);

    processToStop.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    processToStop.kill();
    serverProcess = null;
    serverConfigKey = "";
  });
}

function healthMatches(payload, expectedFingerprint = "") {
  return Boolean(
    payload &&
    payload.ok &&
    payload.app === HEALTH_APP_NAME &&
    Number(payload.port) === configuredPort() &&
    (!expectedFingerprint || payload.runtimeFingerprint === expectedFingerprint)
  );
}

async function readServerHealth() {
  try {
    return await request("GET", "/api/health");
  } catch {
    return null;
  }
}

async function isServerReady(expectedFingerprint = "") {
  const payload = await readServerHealth();
  const ready = healthMatches(payload, expectedFingerprint);
  if (!ready && payload?.ok) {
    logLine(`Ignoring unexpected health response on ${dashboardBaseUrl()}: ${JSON.stringify(payload)}`);
  }
  return ready;
}

async function ensureServer(context) {
  const runtime = ensureRuntimeApp(context);
  const nextConfigKey = serverConfigSignature(runtime);
  let restartedForRuntime = false;
  if (serverProcess && !serverProcess.killed && serverConfigKey && serverConfigKey !== nextConfigKey) {
    await stopServerProcess("ThreadVault settings or runtime changed. Restarting the local server.");
    lastServerError = "";
    restartedForRuntime = true;
  }

  const health = await readServerHealth();
  if (!restartedForRuntime && healthMatches(health, runtime.fingerprint)) {
    return true;
  }

  if (!serverProcess || serverProcess.killed) {
    if (health?.ok && health.app === HEALTH_APP_NAME && Number(health.port) === configuredPort() && runtime.fingerprint && health.runtimeFingerprint !== runtime.fingerprint) {
      setServerError(`A different ThreadVault runtime is already running on ${dashboardBaseUrl()}. Stop it or change threadvault.port.`);
      return false;
    }

    const nodeRuntime = checkNodeRuntime();
    if (!nodeRuntime.ok) {
      setServerError(nodeRuntime.message);
      return false;
    }

    lastServerError = "";
    fs.mkdirSync(runtime.dataDir, { recursive: true });
    fs.mkdirSync(runtime.memoryDir, { recursive: true });
    logLine(`Starting server from ${runtime.root} (${runtime.mode})`);
    logLine(`Using runtime fingerprint ${runtime.fingerprint || "unknown"}`);
    logLine(`Using Node.js ${nodeRuntime.version} at ${nodeRuntime.nodePath}`);
    logLine(`Using data directory ${runtime.dataDir}`);
    logLine(`Using memory directory ${runtime.memoryDir}`);

    const launchedProcess = childProcess.spawn(nodeRuntime.nodePath, [serverEntry(runtime.root)], {
      cwd: runtime.root,
      env: {
        ...process.env,
        THREADVAULT_PORT: String(configuredPort()),
        THREADVAULT_HOST: configuredHost(),
        THREADVAULT_RUNTIME_FINGERPRINT: runtime.fingerprint || "",
        THREADVAULT_APP_ROOT: runtime.root,
        THREADVAULT_DATA_DIR: runtime.dataDir,
        THREADVAULT_MEMORY_DIR: runtime.memoryDir
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    serverProcess = launchedProcess;
    serverConfigKey = nextConfigKey;

    launchedProcess.stdout?.on("data", (chunk) => {
      const text = chunk.toString().trim();
      if (text) {
        logLine(text);
      }
    });

    launchedProcess.stderr?.on("data", (chunk) => {
      const text = chunk.toString().trim();
      rememberServerStderr(text);
    });

    launchedProcess.on("exit", (code, signal) => {
      if (intentionalServerStops.has(launchedProcess)) {
        logLine(`Server stopped with code=${code ?? "null"} signal=${signal ?? "null"}`);
        intentionalServerStops.delete(launchedProcess);
      } else {
        setServerError(`Server exited with code=${code ?? "null"} signal=${signal ?? "null"}`);
      }

      if (serverProcess === launchedProcess) {
        serverProcess = null;
        serverConfigKey = "";
      }
    });

    launchedProcess.on("error", (error) => {
      if (serverProcess === launchedProcess) {
        setServerError(`Server failed to start: ${error.message}`);
      }
    });
  }

  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await isServerReady(runtime.fingerprint)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return false;
}

function buildPanelHtml(hostToken) {
  const url = dashboardBaseUrl();
  const urlOrigin = new URL(url).origin;
  const cacheBust = Date.now();
  const embedUrl = `${url}/?embed=1&host=vscode&hostToken=${hostToken}&v=${cacheBust}`;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${urlOrigin}; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <style>
      html, body, iframe {
        margin: 0;
        width: 100%;
        height: 100%;
        border: 0;
        background: #f5f1e9;
      }
    </style>
  </head>
  <body>
    <iframe id="threadvault-frame" src="${embedUrl}" title="ThreadVault"></iframe>
    <script>
      const vscode = acquireVsCodeApi();
      const frame = document.getElementById("threadvault-frame");
      const allowedOrigin = ${JSON.stringify(urlOrigin)};
      const hostToken = ${JSON.stringify(hostToken)};
      const postHostReady = () => {
        frame.contentWindow?.postMessage({
          source: "threadvault-host",
          type: "threadvault-host-ready",
          hostToken
        }, allowedOrigin);
      };

      frame.addEventListener("load", postHostReady);

      window.addEventListener("message", (event) => {
        if (
          event.source === frame.contentWindow &&
          event.origin === allowedOrigin &&
          event.data?.source === "threadvault-app" &&
          event.data?.hostToken === hostToken
        ) {
          if (event.data?.type === "threadvault-app-ready") {
            postHostReady();
            return;
          }

          vscode.postMessage(event.data);
          return;
        }

        if (
          event.source !== frame.contentWindow &&
          event.data?.source === "threadvault-host" &&
          event.data?.hostToken === hostToken
        ) {
          frame.contentWindow?.postMessage(event.data, allowedOrigin);
        }
      });
    </script>
  </body>
</html>`;
}

function browserDashboardUrl(candidateUrl) {
  const baseUrl = new URL(dashboardBaseUrl());
  if (!candidateUrl) {
    return baseUrl.toString();
  }

  try {
    const parsedUrl = new URL(String(candidateUrl), baseUrl);
    const allowedPath = parsedUrl.pathname === "/" || parsedUrl.pathname === "/index.html";
    if (parsedUrl.origin !== baseUrl.origin || !allowedPath) {
      return baseUrl.toString();
    }

    const sessionId = parsedUrl.searchParams.get("session") || "";
    if (sessionId) {
      baseUrl.searchParams.set("session", sessionId);
    }
    return baseUrl.toString();
  } catch {
    return baseUrl.toString();
  }
}

function postPanelMessage(panel, hostToken, payload) {
  logLine(`Sending host response: ${payload.requestId || "no-request-id"}`);
  panel.webview.postMessage({
    ...payload,
    source: "threadvault-host",
    hostToken
  });
}

function openTargetLabel(target) {
  return target === "workspace" ? "workspace" : "source file";
}

function openTargetMissingMessage(target, targetPath) {
  const label = openTargetLabel(target);
  if (!targetPath) {
    return `This session does not include a saved ${label} path.`;
  }

  return `The saved ${label} path no longer exists: ${targetPath}`;
}

function isWorkspaceFile(targetPath) {
  return targetPath.toLowerCase().endsWith(".code-workspace");
}

async function openPathInVsCode(targetPath, target) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    const error = openTargetMissingMessage(target, targetPath);
    logLine(`Open failed: ${error}`);
    return {
      ok: false,
      error,
      target,
      path: targetPath || ""
    };
  }

  const stat = fs.statSync(targetPath);
  const targetUri = vscode.Uri.file(targetPath);

  if (target === "workspace") {
    if (!stat.isDirectory() && !isWorkspaceFile(targetPath)) {
      const error = `The saved workspace path is not a folder or .code-workspace file: ${targetPath}`;
      logLine(`Open failed: ${error}`);
      return {
        ok: false,
        error,
        target,
        path: targetPath
      };
    }

    logLine(`Opening workspace path in VS Code: ${targetPath}`);
    await vscode.commands.executeCommand("vscode.openFolder", targetUri, {
      forceReuseWindow: false
    });

    return {
      ok: true,
      message: "Workspace opened in VS Code."
    };
  }

  if (stat.isDirectory()) {
    const error = `The saved source path is a folder, not a transcript file: ${targetPath}`;
    logLine(`Open failed: ${error}`);
    return {
      ok: false,
      error,
      target,
      path: targetPath
    };
  }

  logLine(`Opening source file in VS Code: ${targetPath}`);
  await vscode.window.showTextDocument(targetUri, {
    preview: false
  });

  return {
    ok: true,
    message: "Source file opened in VS Code."
  };
}

function activate(context) {
  outputChannel = vscode.window.createOutputChannel("ThreadVault");
  context.subscriptions.push(outputChannel);

  const actionsProvider = new ThreadVaultActionsProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("threadvault.actions", actionsProvider)
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (!event.affectsConfiguration("threadvault")) {
        return;
      }

      lastServerError = "";
      await stopServerProcess("ThreadVault settings changed. Restarting the local server on next use.");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("threadvault.startServer", runCommandSafely("Start local server", async () => {
      const ok = await ensureServer(context);
      if (ok) {
        outputChannel.show(true);
        vscode.window.showInformationMessage("ThreadVault local server is ready.");
      } else {
        outputChannel.show(true);
        vscode.window.showErrorMessage(lastServerError || "ThreadVault server did not start in time.");
      }
    }))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("threadvault.openDashboard", runCommandSafely("Open dashboard in browser", async () => {
      const ok = await ensureServer(context);
      if (!ok) {
        outputChannel.show(true);
        vscode.window.showErrorMessage(lastServerError || "ThreadVault server is not available.");
        return;
      }
      await vscode.env.openExternal(vscode.Uri.parse(dashboardBaseUrl()));
    }))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("threadvault.openPanel", runCommandSafely("Open embedded panel", async () => {
      const ok = await ensureServer(context);
      if (!ok) {
        outputChannel.show(true);
        vscode.window.showErrorMessage(lastServerError || "ThreadVault server is not available.");
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        "threadvaultPanel",
        "ThreadVault",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: []
        }
      );
      const hostToken = crypto.randomBytes(16).toString("hex");
      panel.webview.html = buildPanelHtml(hostToken);
      panel.webview.onDidReceiveMessage(async (message) => {
        if (!message || message.source !== "threadvault-app" || message.hostToken !== hostToken) {
          return;
        }

        logLine(`Received webview action: ${message.type || "unknown"}`);

        if (message.type === "threadvault-open-browser") {
          try {
            await vscode.env.openExternal(vscode.Uri.parse(browserDashboardUrl(message.payload?.url)));
            postPanelMessage(panel, hostToken, {
              requestId: message.requestId,
              ok: true,
              message: "Opened ThreadVault in your browser."
            });
          } catch (error) {
            postPanelMessage(panel, hostToken, {
              requestId: message.requestId,
              ok: false,
              error: error.message || String(error)
            });
          }
          return;
        }

        if (message.type !== "threadvault-open-path") {
          return;
        }

        try {
          const result = await openPathInVsCode(message.payload?.path, message.payload?.target);
          postPanelMessage(panel, hostToken, {
            requestId: message.requestId,
            ...result
          });
        } catch (error) {
          postPanelMessage(panel, hostToken, {
            requestId: message.requestId,
            ok: false,
            error: error.message || String(error)
          });
        }
      });
    }))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("threadvault.openLogs", runCommandSafely("Open logs", async () => {
      outputChannel.show(true);
      logLine("Opened ThreadVault log channel.");
    }))
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("threadvault.rescan", runCommandSafely("Rescan local history", async () => {
      const ok = await ensureServer(context);
      if (!ok) {
        outputChannel.show(true);
        vscode.window.showErrorMessage(lastServerError || "ThreadVault server is not available.");
        return;
      }

      const result = await request("POST", "/api/scan", { timeoutMs: 120000 });
      const message = `ThreadVault rescan completed. Imported ${result.importedSessions || 0}, updated ${result.updatedSessions || 0}, skipped ${result.skippedSessions || 0}, failed ${result.failedSessions || 0}, source errors ${result.failedSources || 0}.`;
      if (result.failedSessions || result.failedSources) {
        vscode.window.showWarningMessage(message);
      } else {
        vscode.window.showInformationMessage(message);
      }
    }))
  );
}

function deactivate() {
  return stopServerProcess("Stopping ThreadVault local server.");
}

module.exports = {
  activate,
  deactivate
};
