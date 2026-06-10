import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const targetRoot = path.join(projectRoot, "extension", "app");
const sourceEntries = ["src", "public"];

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

function bundleFingerprint() {
  const hash = crypto.createHash("sha256");
  for (const entryName of sourceEntries) {
    const sourcePath = path.join(projectRoot, entryName);
    for (const filePath of listFilesRecursive(sourcePath)) {
      const relativePath = path.relative(projectRoot, filePath).replaceAll(path.sep, "/");
      hash.update(relativePath);
      hash.update("\0");
      hash.update(fs.readFileSync(filePath));
      hash.update("\0");
    }
  }
  return hash.digest("hex");
}

function resetDirectory(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyEntry(entryName) {
  const sourcePath = path.join(projectRoot, entryName);
  const targetPath = path.join(targetRoot, entryName);
  fs.cpSync(sourcePath, targetPath, { recursive: true });
}

resetDirectory(targetRoot);

for (const entryName of sourceEntries) {
  copyEntry(entryName);
}

fs.writeFileSync(
  path.join(targetRoot, ".threadvault-bundle.json"),
  JSON.stringify(
    {
      fingerprint: bundleFingerprint(),
      sourceEntries
    },
    null,
    2
  ) + "\n",
  "utf8"
);

fs.writeFileSync(
  path.join(targetRoot, "package.json"),
  JSON.stringify(
    {
      private: true,
      type: "module"
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(`Prepared extension runtime app at ${targetRoot}`);
