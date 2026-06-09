import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const targetRoot = path.join(projectRoot, "extension", "app");
const sourceEntries = ["src", "public"];

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
      generatedAt: new Date().toISOString(),
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
