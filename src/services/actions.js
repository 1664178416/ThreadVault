import childProcess from "node:child_process";
import fs from "node:fs";

import { getSessionDetail } from "../db/repository.js";

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
        error: `Unable to launch VS Code with the code command: ${error.message || error}`
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
      error: "Target path does not exist."
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
