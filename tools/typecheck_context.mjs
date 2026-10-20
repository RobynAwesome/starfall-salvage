// tools/typecheck_context.mjs
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const bunPath = path.join(os.homedir(), ".bun", "bin", os.platform() === "win32" ? "bun.exe" : "bun");
let cmd;
if (fs.existsSync(bunPath)) {
  cmd = `"${bunPath}" x tsc --noEmit -p packages/kopano-context/tsconfig.json`;
} else {
  cmd = `npx tsc --noEmit -p packages/kopano-context/tsconfig.json`;
}

try {
  execSync(cmd, { stdio: "inherit" });
  process.exit(0);
} catch (err) {
  process.exit(err.status || 1);
}
