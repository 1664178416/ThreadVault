import childProcess from "node:child_process";
import fs from "node:fs";

function launchCode(args) {
  const child = childProcess.spawn("code", args, {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}

export function openInVsCode(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return {
      ok: false,
      error: "Target path does not exist."
    };
  }

  launchCode([targetPath]);
  return {
    ok: true
  };
}
