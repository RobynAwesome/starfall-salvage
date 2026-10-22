// tools/test_hangar_findings_regression.mjs
// Automated regression test suite for the 5 Chief Architect findings:
// 1. P0: Duplicate launch messages
// 2. P0: Hangar lifecycle & 0% CPU claim removal
// 3. P0: Service-worker route-aware navigation
// 4. P1: Messaging trust & origin/source validation
// 5. P1: Build identity reconciliation

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const gameJsPath = path.join(ROOT, "src/game.js");
const pwaBootPath = path.join(ROOT, "src/pwa-boot.js");
const swPath = path.join(ROOT, "service-worker.js");
const indexHtmlPath = path.join(ROOT, "index.html");
const hangarHtmlPath = path.join(ROOT, "hangar/index.html");
const hangarMainPath = path.join(ROOT, "hangar/src/main.js");
const prHandoffPath = path.join(ROOT, "Structure/PR Handoff - Sovereign Hangar Evolution.md");
const kcWatchPath = path.join(ROOT, "tools/kc_starfall_watch.py");

console.log("=== REGRESSION TEST: Sovereign Hangar 5 Architect Findings ===");

let passed = true;
const checks = [];

function check(desc, fn) {
  try {
    const result = fn();
    if (result) {
      checks.push({ desc, ok: true });
      console.log(`[PASS] ${desc}`);
    } else {
      checks.push({ desc, ok: false, error: "Condition returned false" });
      console.error(`[FAIL] ${desc}`);
      passed = false;
    }
  } catch (err) {
    checks.push({ desc, ok: false, error: err.message });
    console.error(`[FAIL] ${desc} (Error: ${err.message})`);
    passed = false;
  }
}

const gameJs = fs.readFileSync(gameJsPath, "utf-8");
const pwaBoot = fs.readFileSync(pwaBootPath, "utf-8");
const sw = fs.readFileSync(swPath, "utf-8");
const indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
const hangarHtml = fs.readFileSync(hangarHtmlPath, "utf-8");
const hangarMain = fs.readFileSync(hangarMainPath, "utf-8");
const prHandoff = fs.readFileSync(prHandoffPath, "utf-8");
const kcWatch = fs.readFileSync(kcWatchPath, "utf-8");

// ============================================================================
// FINDING 1: Duplicate launch messages
// ============================================================================
console.log("\n--- Checking Finding 1: Duplicate launch messages ---");

check("hangar/index.html does not register duplicate launch listeners on btn-launch", () => {
  return !/document\.getElementById\(['"]btn-launch['"]\)\.addEventListener/.test(hangarHtml);
});

check("hangar/index.html does not register duplicate listeners on btn-swap", () => {
  return !/document\.getElementById\(['"]btn-swap['"]\)\.addEventListener/.test(hangarHtml);
});

check("hangar/index.html fallback launch is guarded against double-registration when bundle runs", () => {
  return hangarHtml.includes("if (!window.__hangar)");
});

check("hangar/src/main.js defines canonical launchFlightWithShip with source and timestamp", () => {
  return hangarMain.includes('source: "sovereign_hangar"') &&
         hangarMain.includes("timestamp: Date.now()");
});

check("hangar/src/main.js and game.js agree on canonical launch message type: starfall_launch_flight", () => {
  return hangarMain.includes('"starfall_launch_flight"') &&
         gameJs.includes('"starfall_launch_flight"');
});

// ============================================================================
// FINDING 2: Hangar lifecycle & unproven 0% CPU claim removal
// ============================================================================
console.log("\n--- Checking Finding 2: Hangar lifecycle ---");

check("hangar/src/main.js cancels animation frame in stopLoop", () => {
  return hangarMain.includes("cancelAnimationFrame(rafId)") &&
         hangarMain.includes("isLoopRunning = false");
});

check("hangar/src/main.js prevents duplicate loop chains in startLoop", () => {
  return hangarMain.includes("if (isLoopRunning) return;") &&
         hangarMain.includes("loopChainCount++");
});

check("hangar/src/main.js exposes window.__hangar.lifecycle instrumentation", () => {
  return hangarMain.includes("lifecycle: {") &&
         hangarMain.includes("get loopChainCount()") &&
         hangarMain.includes("get activeRafId()") &&
         hangarMain.includes("get isRunning()");
});

check("PR Handoff document has removed unproven '0% during flight' CPU/GPU claim", () => {
  return !prHandoff.includes("0% during flight") &&
         !prHandoff.includes("0% CPU");
});

// ============================================================================
// FINDING 3: Service-worker route-aware navigation
// ============================================================================
console.log("\n--- Checking Finding 3: Service-worker navigation ---");

check("service-worker.js implements route-aware navigate handling distinguishing /hangar/ from /", () => {
  return sw.includes('url.pathname.endsWith("/hangar/")') ||
         sw.includes('url.pathname.includes("/hangar")');
});

check("service-worker.js caches /hangar/ navigation to ./hangar/index.html instead of clobbering ./", () => {
  return sw.includes('cache.put("./hangar/index.html"') &&
         sw.includes('fallbackRoute = isHangar ? "./hangar/index.html" : "./index.html"');
});

check("service-worker.js uses ignoreSearch: true to ensure query-string assets match offline precache", () => {
  return sw.includes("ignoreSearch: true");
});

check("service-worker.js purges stale caches on activate", () => {
  return sw.includes("keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))");
});

// ============================================================================
// FINDING 4: Messaging trust
// ============================================================================
console.log("\n--- Checking Finding 4: Messaging trust ---");

check("src/game.js syncHangarLifecycle uses non-wildcard target origin", () => {
  return /postMessage\(\s*\{[^}]*\}\s*,\s*targetOrigin\s*\)/.test(gameJs) &&
         !/postMessage\(\s*\{[^}]*\}\s*,\s*"\*"\s*\)/.test(gameJs.slice(gameJs.indexOf("function syncHangarLifecycle")));
});

check("hangar/src/main.js uses exact getTargetOrigin instead of wildcard", () => {
  return hangarMain.includes("function getTargetOrigin()") &&
         hangarMain.includes("getTargetOrigin()");
});

check("src/game.js message listener validates event.origin", () => {
  return gameJs.includes("if (window.location.origin !== \"null\" && event.origin !== window.location.origin) return;");
});

check("src/game.js message listener validates event.source is hangarFrame contentWindow", () => {
  return gameJs.includes("if (hf && hf.contentWindow && event.source !== hf.contentWindow) return;");
});

check("src/game.js message listener validates ship against ALLOWED_SHIPS", () => {
  return gameJs.includes("const ALLOWED_SHIPS = new Set(") &&
         gameJs.includes("ALLOWED_SHIPS.has(ship)");
});

check("hangar preserves standalone fallback navigation behavior when window.parent === window", () => {
  return hangarMain.includes("window.location.href = `../?launch=1&ship=") &&
         hangarHtml.includes("window.location.href = '../?launch=1&ship=original'");
});

// ============================================================================
// FINDING 5: Build identity reconciliation
// ============================================================================
console.log("\n--- Checking Finding 5: Build identity reconciliation ---");

const EXPECTED_BUILD = "20261022-sovereign-hangar-mki-rc2";

check(`src/game.js GAME_BUILD is exactly ${EXPECTED_BUILD}`, () => {
  return gameJs.includes(`const GAME_BUILD = "${EXPECTED_BUILD}";`);
});

check(`src/pwa-boot.js BUILD is exactly ${EXPECTED_BUILD}`, () => {
  return pwaBoot.includes(`const BUILD = "${EXPECTED_BUILD}";`);
});

check(`service-worker.js CACHE_NAME matches ${EXPECTED_BUILD}`, () => {
  return sw.includes(`const CACHE_NAME = "starfall-salvage-v${EXPECTED_BUILD}";`);
});

check(`index.html references assets with ?v=${EXPECTED_BUILD}`, () => {
  return indexHtml.includes(`styles.css?v=${EXPECTED_BUILD}`) &&
         indexHtml.includes(`src/pwa-boot.js?v=${EXPECTED_BUILD}`) &&
         indexHtml.includes(`src/game.js?v=${EXPECTED_BUILD}`);
});

check(`index.html mobile-lockdown-meta contains Build: ${EXPECTED_BUILD}`, () => {
  return indexHtml.includes(`Build: ${EXPECTED_BUILD}`);
});

check(`hangar/index.html references assets with ?v=${EXPECTED_BUILD}`, () => {
  return hangarHtml.includes(`styles.css?v=${EXPECTED_BUILD}`) &&
         hangarHtml.includes(`app.bundle.js?v=${EXPECTED_BUILD}`);
});

check(`tools/kc_starfall_watch.py current_build is ${EXPECTED_BUILD}`, () => {
  return kcWatch.includes(`current_build = "${EXPECTED_BUILD}"`);
});

check("tools/kc_starfall_watch.py includes all 10 Lesson 020 proofs", () => {
  const keys = [
    "hangar_frame_markup",
    "sovereign_scrim_frame_css",
    "hangar_launch_control",
    "hangar_lifecycle_bridge",
    "ship_mk1_mesh_definition",
    "ship_mk1_selection_sync",
    "responsive_frame_profile",
    "survey_hit_test_regression_guard",
    "survey_regression_test_script",
    "hangar_portable_build_script"
  ];
  return keys.every(k => kcWatch.includes(`"${k}":`));
});

console.log("\n--- Final Regression Summary ---");
const passCount = checks.filter(c => c.ok).length;
console.log(`Checks passed: ${passCount} / ${checks.length}`);

if (passed) {
  console.log("Verdict: PASS - All 5 Chief Architect findings verified.");
  process.exit(0);
} else {
  console.error("Verdict: FAIL - One or more regression checks failed.");
  process.exit(1);
}
