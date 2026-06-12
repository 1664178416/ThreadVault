import childProcess from "node:child_process";
import fs from "node:fs";

import { getSessionDetail } from "../db/repository.js";

const VALID_TARGETS = new Set(["source", "workspace"]);

function targetLabel(target) {
  return target === "workspace" ? "workspace" : "source file";
}

function targetMissingMessage(target, targetPath) {
  const label = targetLabel(target);
  if (!targetPath) {
    return `This session does not include a saved ${label} path.`;
  }

  return `The saved ${label} path no longer exists: ${targetPath}`;
}

function codeCommandError(error) {
  const details = error?.message || String(error || "Unknown error");
  if (error?.code === "ENOENT") {
    return "Unable to launch VS Code with the code command. Install the VS Code shell command or use the embedded VS Code panel open actions.";
  }

  return `Unable to launch VS Code with the code command: ${details}`;
}

function launchCode(args) {
  return new Promise((resolve) => {
    const child = childProcess.spawn("code", args, {
      detached: true,
      stdio: "ignore"
    });

    let settled = false;
    const settle = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    child.once("error", (error) => {
      settle({
        ok: false,
        error: codeCommandError(error)
      });
    });

    child.once("spawn", () => {
      child.unref();
      settle({ ok: true });
    });
  });
}

function pathForSessionTarget(session, target) {
  if (target === "source") {
    return session.sourcePath || "";
  }

  if (target === "workspace") {
    return session.workspacePath || "";
  }

  return "";
}

export async function openSessionTargetInVsCode(sessionId, target) {
  if (!VALID_TARGETS.has(target)) {
    return {
      ok: false,
      error: "Open target must be source or workspace."
    };
  }

  const session = getSessionDetail(sessionId);
  if (!session) {
    return {
      ok: false,
      error: "Session not found."
    };
  }

  const targetPath = pathForSessionTarget(session, target);
  if (!targetPath || !fs.existsSync(targetPath)) {
    return {
      ok: false,
      error: targetMissingMessage(target, targetPath),
      target,
      path: targetPath || ""
    };
  }

  const launchResult = await launchCode([targetPath]);
  if (!launchResult.ok) {
    return launchResult;
  }

  return {
    ok: true,
    message: target === "workspace" ? "Workspace open request sent." : "Source opened."
  };
}
