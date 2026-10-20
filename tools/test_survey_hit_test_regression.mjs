// tools/test_survey_hit_test_regression.mjs
// Regression test for defect F-1: Dismissed discovery survey intercepts launch clicks.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const cssPath = path.join(ROOT, "styles.css");
const jsPath = path.join(ROOT, "src/game.js");
const htmlPath = path.join(ROOT, "index.html");

console.log("=== REGRESSION TEST: Discovery Survey Hit-Testing & Dismissal Defect (F-1) ===");

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

// 1. Verify CSS styles for .survey-modal.is-hidden
const cssContent = fs.readFileSync(cssPath, "utf-8");

check("styles.css defines .survey-modal.is-hidden with display: none", () => {
  return /\.survey-modal\.is-hidden\s*\{[^}]*display:\s*none/s.test(cssContent);
});

check("styles.css defines .survey-modal.is-hidden with pointer-events: none", () => {
  return /\.survey-modal\.is-hidden\s*\{[^}]*pointer-events:\s*none/s.test(cssContent);
});

check("styles.css defines .survey-modal.is-hidden with visibility: hidden", () => {
  return /\.survey-modal\.is-hidden\s*\{[^}]*visibility:\s*hidden/s.test(cssContent);
});

check("styles.css enforces pointer-events: none on all children of hidden survey", () => {
  return /\.survey-modal\.is-hidden\s+\*\s*\{[^}]*pointer-events:\s*none/s.test(cssContent);
});

// 2. Verify src/game.js hideSurvey sets aria-hidden
const jsContent = fs.readFileSync(jsPath, "utf-8");

check("src/game.js sets aria-hidden attribute when hiding survey", () => {
  return /hud\.surveyModal\.setAttribute\(\s*["']aria-hidden["']\s*,\s*["']true["']\s*\)/.test(jsContent);
});

check("src/game.js removes aria-hidden attribute when showing survey", () => {
  return /hud\.surveyModal\.removeAttribute\(\s*["']aria-hidden["']\s*\)/.test(jsContent);
});

// 3. Verify markup in index.html starts with surveyModal having .is-hidden
const htmlContent = fs.readFileSync(htmlPath, "utf-8");

check("index.html initializes surveyModal with is-hidden class", () => {
  return /<section[^>]*class=["'][^"']*survey-modal\s+is-hidden[^"']*["'][^>]*id=["']surveyModal["']|<section[^>]*id=["']surveyModal["'][^>]*class=["'][^"']*is-hidden[^"']*["']/.test(htmlContent);
});

console.log("\n--- Summary ---");
console.log(`Checks passed: ${checks.filter(c => c.ok).length} / ${checks.length}`);
if (passed) {
  console.log("Verdict: PASS - Survey dismissal cannot intercept clicks or hit-testing.");
  process.exit(0);
} else {
  console.error("Verdict: FAIL - Hit-testing regression detected.");
  process.exit(1);
}
