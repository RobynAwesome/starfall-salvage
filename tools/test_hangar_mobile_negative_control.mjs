// tools/test_hangar_mobile_negative_control.mjs
// Proves that tools/test_hangar_mobile_composition.mjs actually executes test predicates
// and reliably exits with non-zero code on failing predicates and thrown exceptions.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   SOVEREIGN HANGAR — TEST HARNESS NEGATIVE CONTROL VERIFICATION");
console.log("================================================================================\n");

const result = spawnSync("node", ["tools/test_hangar_mobile_composition.mjs", "--negative-control"], {
  cwd: ROOT,
  encoding: "utf-8"
});

const output = (result.stdout || "") + (result.stderr || "");
console.log("Harness Output under Negative Control:\n");
console.log(output);

let ok = true;

if (result.status !== 1) {
  console.error(`[FAIL] Harness exited with status ${result.status}, expected status 1`);
  ok = false;
} else {
  console.log(`[PASS] Harness exited with non-zero status code (${result.status}) on failing predicates`);
}

if (!output.includes("[FAIL] Negative control: deliberately false predicate must fail")) {
  console.error("[FAIL] Missing false-predicate failure message");
  ok = false;
} else {
  console.log("[PASS] Harness correctly evaluated and reported false-predicate failure");
}

if (!output.includes("[FAIL] Negative control: throwing predicate must fail with captured exception")) {
  console.error("[FAIL] Missing throwing-predicate failure message");
  ok = false;
} else {
  console.log("[PASS] Harness correctly captured and reported thrown exception failure");
}

console.log("\n================================================================================");
if (ok) {
  console.log("VERDICT: PASS — Test harness negative control successfully proven.");
} else {
  console.error("VERDICT: FAIL — Test harness negative control validation failed.");
}
console.log("================================================================================");

process.exit(ok ? 0 : 1);
