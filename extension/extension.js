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
const MIN_NODE_MAJOR = 24;
const RUNTIME_APP_DIRNAME = "runtime-app";

let serverProcess = null;
let outputChannel = null;
let serverConfigKey = "";
let lastServerError = "";

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
    root: runtime.root
  });
}

function hasAppFiles(rootPath) {
  return fs.existsSync(path.join(rootPath, "src", "server.js")) && fs.existsSync(path.join(rootPath, "public", "app.js"));
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

  fs.mkdirSync(storageRoot, { recursive: true });

  if (!hasAppFiles(targetRoot) || currentVersion !== bundledVersion) {
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

function request(method, route) {
  const port = configuredPort();
  const host = configuredClientHost();
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: host,
        port,
        path: route,
        method
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk.toString();
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body || "{}"));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    req.on("error", reject);
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

async function isServerReady() {
  try {
    const payload = await request("GET", "/api/health");
    return Boolean(payload.ok);
  } catch {
    return false;
  }
}

async function ensureServer(context) {
  const runtime = ensureRuntimeApp(context);
  const nextConfigKey = serverConfigSignature(runtime);
  let restartedForSettings = false;
  if (serverProcess && !serverProcess.killed && serverConfigKey && serverConfigKey !== nextConfigKey) {
    await stopServerProcess("ThreadVault settings changed. Restarting the local server.");
    lastServerError = "";
    restartedForSettings = true;
  }

  if (!restartedForSettings && await isServerReady()) {
    return true;
  }

  if (!serverProcess || serverProcess.killed) {
    const nodeRuntime = checkNodeRuntime();
    if (!nodeRuntime.ok) {
      setServerError(nodeRuntime.message);
      return false;
    }

    lastServerError = "";
    fs.mkdirSync(runtime.dataDir, { recursive: true });
    fs.mkdirSync(runtime.memoryDir, { recursive: true });
    logLine(`Starting server from ${runtime.root} (${runtime.mode})`);
    logLine(`Using Node.js ${nodeRuntime.version} at ${nodeRuntime.nodePath}`);
    logLine(`Using data directory ${runtime.dataDir}`);
    logLine(`Using memory directory ${runtime.memoryDir}`);

    serverProcess = childProcess.spawn(nodeRuntime.nodePath, [serverEntry(runtime.root)], {
      cwd: runtime.root,
      env: {
        ...process.env,
        THREADVAULT_PORT: String(configuredPort()),
        THREADVAULT_HOST: configuredHost(),
        THREADVAULT_APP_ROOT: runtime.root,
        THREADVAULT_DATA_DIR: runtime.dataDir,
        THREADVAULT_MEMORY_DIR: runtime.memoryDir
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    serverConfigKey = nextConfigKey;

    serverProcess.stdout?.on("data", (chunk) => {
      const text = chunk.toString().trim();
      if (text) {
        logLine(text);
      }
    });

    serverProcess.stderr?.on("data", (chunk) => {
      const text = chunk.toString().trim();
      if (text) {
        logLine(text);
      }
    });

    serverProcess.on("exit", (code, signal) => {
      setServerError(`Server exited with code=${code ?? "null"} signal=${signal ?? "null"}`);
      serverProcess = null;
      serverConfigKey = "";
    });

    serverProcess.on("error", (error) => {
      setServerError(`Server failed to start: ${error.message}`);
    });
  }

  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await isServerReady()) {
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

    parsedUrl.searchParams.delete("embed");
    parsedUrl.searchParams.delete("host");
    parsedUrl.searchParams.delete("hostToken");
    parsedUrl.searchParams.delete("v");
    return parsedUrl.toString();
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

async function openPathInVsCode(targetPath, target) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    logLine(`Open failed because path is missing: ${targetPath || "<empty>"}`);
    return {
      ok: false,
      error: "Target path does not exist."
    };
  }

  const stat = fs.statSync(targetPath);
  const targetUri = vscode.Uri.file(targetPath);

  if (target === "workspace" || stat.isDirectory()) {
    logLine(`Opening workspace path in VS Code: ${targetPath}`);
    await vscode.commands.executeCommand("vscode.openFolder", targetUri, {
      forceReuseWindow: false
    });

    return {
      ok: true,
      message: "Workspace opened in VS Code."
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
    vscode.commands.registerCommand("threadvault.startServer", async () => {
      const ok = await ensureServer(context);
      if (ok) {
        outputChannel.show(true);
        vscode.window.showInformationMessage("ThreadVault local server is ready.");
      } else {
        outputChannel.show(true);
        vscode.window.showErrorMessage(lastServerError || "ThreadVault server did not start in time.");
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("threadvault.openDashboard", async () => {
      const ok = await ensureServer(context);
      if (!ok) {
        outputChannel.show(true);
        vscode.window.showErrorMessage(lastServerError || "ThreadVault server is not available.");
        return;
      }
      await vscode.env.openExternal(vscode.Uri.parse(dashboardBaseUrl()));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("threadvault.openPanel", async () => {
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
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("threadvault.openLogs", async () => {
      outputChannel.show(true);
      logLine("Opened ThreadVault log channel.");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("threadvault.rescan", async () => {
      const ok = await ensureServer(context);
      if (!ok) {
        outputChannel.show(true);
        vscode.window.showErrorMessage(lastServerError || "ThreadVault server is not available.");
        return;
      }

      const result = await request("POST", "/api/scan");
      const message = `ThreadVault rescan completed. Imported ${result.importedSessions || 0}, updated ${result.updatedSessions || 0}, skipped ${result.skippedSessions || 0}, failed ${result.failedSessions || 0}, source errors ${result.failedSources || 0}.`;
      if (result.failedSessions || result.failedSources) {
        vscode.window.showWarningMessage(message);
      } else {
        vscode.window.showInformationMessage(message);
      }
    })
  );
}

function deactivate() {
  stopServerProcess("Stopping ThreadVault local server.");
}

module.exports = {
  activate,
  deactivate
};
