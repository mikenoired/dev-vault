import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
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
const binName = isWindows ? "dev-vault-mcp.exe" : "dev-vault-mcp";
const mode = process.argv.includes("--release") ? "release" : "debug";
const builtPath = join(srcTa, "target", mode, binName);

if (!existsSync(builtPath)) {
  throw new Error(`MCP binary not found at ${builtPath}`);
}

const destName = `${binName}-${target}`.replace(/\.exe-/, "-");
const destPath = join(srcTa, "bin", destName);

mkdirSync(dirname(destPath), { recursive: true });
copyFileSync(builtPath, destPath);

console.log(`Copied MCP binary (${mode}) to ${destPath}`);
