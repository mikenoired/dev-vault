import { execSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const isWindows = process.platform === "win32";

const rustcInfo = execSync("rustc -vV", { encoding: "utf8" });
const hostLine = rustcInfo.split("\n").find((line) => line.startsWith("host:"));
if (!hostLine) {
  throw new Error("Failed to detect Rust host target");
}
const target = hostLine.replace("host:", "").trim();

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const srcTa = join(projectRoot, "src-tauri");
const binName = "dev-vault-mcp";
const destName = isWindows ? `${binName}-${target}.exe` : `${binName}-${target}`;
const destPath = join(srcTa, "bin", destName);

mkdirSync(dirname(destPath), { recursive: true });

if (!existsSync(destPath)) {
  const fd = openSync(destPath, "w");
  closeSync(fd);
  console.log(`Created placeholder MCP binary at ${destPath}`);
}
