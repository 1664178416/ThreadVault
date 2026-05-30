const vscode = require("vscode");
const path = require("node:path");
const fs = require("node:fs");
const childProcess = require("node:child_process");
const http = require("node:http");
const extensionPackage = require("./package.json");

const PORT = Number(process.env.THREADVAULT_PORT || 3187);
const RUNTIME_APP_DIRNAME = "runtime-app";

let serverProcess = null;
let outputChannel = null;

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
        "Rescan Copilot History",
        {
          command: "threadvault.rescan",
          title: "Rescan Copilot History"
        },
        "Refresh the local archive from VS Code storage"
      )
    ];
  }
}

function logLine(message) {
  outputChannel?.appendLine(`[ThreadVault] ${message}`);
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
  const devRoot = developmentAppRoot(context);
  if (hasAppFiles(devRoot)) {
    return {
      mode: "development",
      root: devRoot,
      dataDir: path.join(devRoot, "data")
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

  return {
    mode: "bundled",
    root: targetRoot,
    dataDir: path.join(storageRoot, "data")
  };
}

function serverEntry(appRoot) {
  return path.join(appRoot, "src", "server.js");
}

function request(method, route) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
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

async function isServerReady() {
  try {
    const payload = await request("GET", "/api/health");
    return Boolean(payload.ok);
  } catch {
    return false;
  }
}

async function ensureServer(context) {
  if (await isServerReady()) {
    return true;
  }

  if (!serverProcess || serverProcess.killed) {
    const runtime = ensureRuntimeApp(context);
    fs.mkdirSync(runtime.dataDir, { recursive: true });
    logLine(`Starting server from ${runtime.root} (${runtime.mode})`);

    serverProcess = childProcess.spawn("node", [serverEntry(runtime.root)], {
      cwd: runtime.root,
      env: {
        ...process.env,
        THREADVAULT_PORT: String(PORT),
        THREADVAULT_APP_ROOT: runtime.root,
        THREADVAULT_DATA_DIR: runtime.dataDir
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });

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
      logLine(`Server exited with code=${code ?? "null"} signal=${signal ?? "null"}`);
      serverProcess = null;
    });

    serverProcess.on("error", (error) => {
      logLine(`Server failed to start: ${error.message}`);
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

function buildPanelHtml() {
  const url = `http://127.0.0.1:${PORT}`;
  const embedUrl = `${url}/?embed=1`;
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${url}; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <style>
      html, body, iframe {
        margin: 0;
        width: 100%;
        height: 100%;
        border: 0;
        background: #f5f1e9;
      }
      .fallback {
        position: absolute;
        top: 16px;
        right: 16px;
        z-index: 1;
        background: white;
        color: #182127;
        border-radius: 999px;
        padding: 10px 14px;
        font-family: sans-serif;
        border: 1px solid rgba(0,0,0,0.08);
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <a class="fallback" href="${url}">Open in browser</a>
    <iframe src="${embedUrl}" title="ThreadVault"></iframe>
  </body>
</html>`;
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
        vscode.window.showErrorMessage("ThreadVault server did not start in time.");
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("threadvault.openDashboard", async () => {
      const ok = await ensureServer(context);
      if (!ok) {
        outputChannel.show(true);
        vscode.window.showErrorMessage("ThreadVault server is not available.");
        return;
      }
      await vscode.env.openExternal(vscode.Uri.parse(`http://127.0.0.1:${PORT}`));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("threadvault.openPanel", async () => {
      const ok = await ensureServer(context);
      if (!ok) {
        outputChannel.show(true);
        vscode.window.showErrorMessage("ThreadVault server is not available.");
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        "threadvaultPanel",
        "ThreadVault",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true
        }
      );
      panel.webview.html = buildPanelHtml();
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
        vscode.window.showErrorMessage("ThreadVault server is not available.");
        return;
      }

      const result = await request("POST", "/api/scan");
      vscode.window.showInformationMessage(`ThreadVault rescan completed. Imported ${result.importedSessions || 0} sessions.`);
    })
  );
}

function deactivate() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
}

module.exports = {
  activate,
  deactivate
};
