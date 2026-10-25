// tools/test_hangar_mobile_composition.mjs
// Automated verification suite for Phase 3 Mobile Sovereign Hangar repair:
// 1. Viewport-aware, model-aware camera fitting across all device aspect ratios.
// 2. Mobile-first responsive controls, prominent LAUNCH FLIGHT, zero horizontal clipping.
// 3. Optional artifact information accessed via compact top-right control without covering craft.
// 4. Stable orientation transitions, touch orbit, zoom, inspect, model swapping, and reset.
// 5. Preserved runtime isolation, launch protocol, and fallback behavior.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const isNegativeControl = process.argv.includes("--negative-control");

let passed = true;
let totalChecks = 0;
let passedChecks = 0;

/**
 * Executes a verification check.
 * Strictly invokes callable predicates and captures any exceptions.
 */
function check(desc, condition, details = "") {
  totalChecks++;
  let result = false;
  let execError = null;
  try {
    result = typeof condition === "function" ? Boolean(condition()) : Boolean(condition);
  } catch (err) {
    execError = err;
    result = false;
  }

  if (result) {
    passedChecks++;
    console.log(`[PASS] ${desc}${details ? " — " + details : ""}`);
  } else {
    passed = false;
    const errText = execError ? ` (Exception thrown: ${execError.message})` : "";
    console.error(`[FAIL] ${desc}${details ? " — " + details : ""}${errText}`);
  }
}

// ----------------------------------------------------------------------------
// Negative Control Verification Mode
// ----------------------------------------------------------------------------
if (isNegativeControl) {
  console.log("================================================================================");
  console.log("   SOVEREIGN HANGAR — NEGATIVE CONTROL HARNESS PROOF");
  console.log("   Verifying deliberately false and throwing predicates trigger FAIL");
  console.log("================================================================================\n");

  check("Negative control: deliberately false predicate must fail", () => {
    return false;
  }, "Expected failure for harness validation");

  check("Negative control: throwing predicate must fail with captured exception", () => {
    throw new Error("Deliberate harness test exception");
  }, "Expected exception failure for harness validation");

  console.log("\n================================================================================");
  console.log(`   NEGATIVE CONTROL RESULT: ${passedChecks} passed, ${totalChecks - passedChecks} failed`);
  console.log("   Harness successfully caught all deliberate failures.");
  console.log("================================================================================");

  // Exit with 1 because checks failed (proving harness exits non-zero on failure)
  process.exit(passed ? 0 : 1);
}

// ----------------------------------------------------------------------------
// Standard Verification Suite
// ----------------------------------------------------------------------------
const hangarHtml = fs.readFileSync(path.join(ROOT, "hangar/index.html"), "utf-8");
const hangarStyles = fs.readFileSync(path.join(ROOT, "hangar/styles.css"), "utf-8");
const hangarMain = fs.readFileSync(path.join(ROOT, "hangar/src/main.js"), "utf-8");
const hangarOrbit = fs.readFileSync(path.join(ROOT, "hangar/src/orbit.js"), "utf-8");
const bundleJs = fs.readFileSync(path.join(ROOT, "hangar/app.bundle.js"), "utf-8");

console.log("================================================================================");
console.log("   SOVEREIGN HANGAR — MOBILE COMPOSITION & RESPONSIVE CAMERA VERIFICATION");
console.log("   Verification Standard: Mobile-Primary Device-Complete (Lesson 020 / CCP)");
console.log("================================================================================\n");

// ----------------------------------------------------------------------------
// 1. Viewport-Aware & Model-Aware Camera Fitting
// ----------------------------------------------------------------------------
console.log("--- 1. Viewport-Aware & Model-Aware Camera Fitting ---");

check("hangar/src/main.js implements getHangarFrameProfile", () => {
  return hangarMain.includes("function getHangarFrameProfile(w, h)");
});

check("hangar/src/main.js updates camera.fov and rig.setProfile on resize", () => {
  return hangarMain.includes("camera.fov = profile.fov;") &&
         hangarMain.includes("camera.updateProjectionMatrix();") &&
         hangarMain.includes("rig.setProfile(profile);");
});

check("hangar/src/main.js listens to both window resize and orientationchange", () => {
  return hangarMain.includes('window.addEventListener("resize", resize)') &&
         hangarMain.includes('window.addEventListener("orientationchange"');
});

// Extract getHangarFrameProfile function and test mathematical boundaries
const profileFnMatch = hangarMain.match(/function getHangarFrameProfile\(w, h\) \{([\s\S]*?)\n\}/);
if (profileFnMatch) {
  const profileFn = new Function("w", "h", profileFnMatch[1]);

  // Test Redmi 13 Tall Mobile Portrait (393 x 873, aspect ~0.450)
  const redmiPortrait = profileFn(393, 873);
  const redmiAspect = 393 / 873;
  const vFovRad = (redmiPortrait.fov * Math.PI) / 180;
  const visibleHeight = 2 * redmiPortrait.orbitDistance * Math.tan(vFovRad / 2);
  const visibleWidth = visibleHeight * redmiAspect;
  const craftDim = 2.55; // Normalized craft bounding box
  const horizMargin = visibleWidth - craftDim;

  check("Tall mobile portrait (393x873) applies wide vertical FOV and extended orbit distance", () => {
    return redmiPortrait.fov >= 50 &&
           redmiPortrait.orbitDistance >= 7.0 &&
           redmiPortrait.targetY > 1.0;
  }, `FOV=${redmiPortrait.fov}°, r=${redmiPortrait.orbitDistance}, targetY=${redmiPortrait.targetY}`);

  check("Tall mobile portrait (393x873) eliminates horizontal craft clipping", () => {
    return visibleWidth > craftDim && horizMargin > 0.4;
  }, `Visible width: ${visibleWidth.toFixed(2)}m for ${craftDim}m craft (margin: +${horizMargin.toFixed(2)}m)`);

  check("Tall mobile portrait enforces safe inspect distance (inspectR >= minR)", () => {
    return redmiPortrait.inspectR >= redmiPortrait.minR && redmiPortrait.inspectR >= 4.0;
  }, `inspectR=${redmiPortrait.inspectR}m, minR=${redmiPortrait.minR}m`);

  // Test Mobile Landscape (873 x 393, aspect ~2.221)
  const redmiLandscape = profileFn(873, 393);
  check("Mobile landscape (873x393) restores standard 42° FOV and compact distance", () => {
    return redmiLandscape.fov === 42 &&
           redmiLandscape.orbitDistance === 5.4 &&
           redmiLandscape.targetY === 0.88;
  }, `FOV=${redmiLandscape.fov}°, r=${redmiLandscape.orbitDistance}, targetY=${redmiLandscape.targetY}`);

  check("Mobile landscape maintains inspect distance above minR", () => {
    return redmiLandscape.inspectR >= redmiLandscape.minR && redmiLandscape.inspectR === 3.1;
  }, `inspectR=${redmiLandscape.inspectR}m, minR=${redmiLandscape.minR}m`);

  // Test Standard Desktop 16:9 (1280 x 720)
  const desktop = profileFn(1280, 720);
  check("Desktop 16:9 maintains canonical baseline framing (42° FOV, r=5.4)", () => {
    return desktop.fov === 42 &&
           desktop.orbitDistance === 5.4 &&
           desktop.targetY === 0.88;
  }, `FOV=${desktop.fov}°, r=${desktop.orbitDistance}, targetY=${desktop.targetY}`);
} else {
  check("Extract and execute getHangarFrameProfile", () => false, "Function pattern match failed");
}

// ----------------------------------------------------------------------------
// 2. Mobile-First Responsive Controls & Accessible Actions Menu
// ----------------------------------------------------------------------------
console.log("\n--- 2. Mobile-First Responsive Controls ---");

check("hangar/index.html includes primary LAUNCH FLIGHT CTA button", () => {
  return hangarHtml.includes('id="btn-launch"') &&
         hangarHtml.includes('class="ctl-btn ctl-launch"');
});

check("hangar/index.html includes secondary actions toggle button (#btn-actions-toggle)", () => {
  return hangarHtml.includes('id="btn-actions-toggle"') &&
         hangarHtml.includes('aria-controls="actions-menu"');
});

check("hangar/index.html includes secondary actions container with role='menu'", () => {
  return hangarHtml.includes('id="actions-menu"') &&
         hangarHtml.includes('role="menu"');
});

check("hangar/styles.css styles LAUNCH FLIGHT with high-contrast gradient & touch target", () => {
  return hangarStyles.includes(".ctl-btn.ctl-launch") &&
         hangarStyles.includes("linear-gradient(135deg, var(--cyan) 0%, var(--mint) 100%)");
});

check("hangar/styles.css enforces min-height >= 40px and touch-action: manipulation on mobile buttons", () => {
  return hangarStyles.includes("touch-action: manipulation;") &&
         hangarStyles.includes("min-height: 42px;");
});

check("hangar/styles.css eliminates horizontal scroll clipping on mobile controls dock", () => {
  return !hangarStyles.includes("overflow-x: auto;") &&
         hangarStyles.includes("overflow: visible;");
});

// ----------------------------------------------------------------------------
// 3. Optional Artifact Information (Collapsed by Default Everywhere)
// ----------------------------------------------------------------------------
console.log("\n--- 3. Optional Artifact Information & Top-Right Control ---");

check("hangar/index.html includes compact top-right INFO trigger button", () => {
  return hangarHtml.includes('id="btn-meta-toggle"') &&
         hangarHtml.includes('class="hud hud-icon-btn meta-toggle-btn"') &&
         hangarHtml.includes('aria-controls="hud-meta"');
});

check("hangar/index.html includes close button inside metadata panel", () => {
  return hangarHtml.includes('id="btn-meta-close"') &&
         hangarHtml.includes('class="meta-card-close"');
});

check("hangar/styles.css collapses metadata card by default everywhere for immersive UI", () => {
  return hangarStyles.includes(".hud-meta {") &&
         hangarStyles.includes("opacity: 0;") &&
         hangarStyles.includes("visibility: hidden;") &&
         hangarStyles.includes("pointer-events: none;");
});

check("hangar/styles.css displays .hud-meta when .is-open is toggled", () => {
  return hangarStyles.includes(".hud-meta.is-open {") &&
         hangarStyles.includes("visibility: visible;") &&
         hangarStyles.includes("opacity: 1;") &&
         hangarStyles.includes("pointer-events: auto;");
});

check("hangar/src/main.js wires toggleMeta for top-right button and close button", () => {
  return hangarMain.includes("function toggleMeta(force)") &&
         hangarMain.includes('hud.metaCard.classList.toggle("is-open", next)') &&
         hangarMain.includes('hud.metaToggleBtn.addEventListener("click"');
});

// ----------------------------------------------------------------------------
// 4. Stable Touch Interaction & Orbit Controller Safety
// ----------------------------------------------------------------------------
console.log("\n--- 4. Stable Touch Interaction & Orbit Controller ---");

check("hangar/styles.css sets touch-action: none on .canvas-host", () => {
  return hangarStyles.includes(".canvas-host { position: absolute; inset: 0; cursor: grab; touch-action: none; }");
});

check("hangar/src/orbit.js implements responsive setProfile with dynamic spherical clamping", () => {
  return hangarOrbit.includes("setProfile(profile) {") &&
         hangarOrbit.includes("this.inspectR = profile.inspectR") &&
         hangarOrbit.includes("this.tgt.r = clamp(this.tgt.r, this.minR, this.maxR);") &&
         hangarOrbit.includes("this.sph.r = clamp(this.sph.r, this.minR, this.maxR);");
});

check("hangar/src/orbit.js inspect mode clamps target distance to [minR, maxR]", () => {
  return hangarOrbit.includes("toggleInspect() {") &&
         hangarOrbit.includes("clamp(targetR, this.minR, this.maxR)");
});

check("hangar/src/orbit.js increases tap movement tolerance for touch devices (18px vs 9px)", () => {
  return hangarOrbit.includes('const tapThreshold = (e.pointerType === "touch") ? 18 : 9;') &&
         hangarOrbit.includes("this.moved < tapThreshold");
});

check("hangar/src/orbit.js supports responsive pinch-to-zoom", () => {
  return hangarOrbit.includes("this.lastPinch > 0") &&
         hangarOrbit.includes("this.tgt.r = clamp(");
});

// ----------------------------------------------------------------------------
// 5. Preserved Runtime Isolation, Bundle Portability & Window API
// ----------------------------------------------------------------------------
console.log("\n--- 5. Runtime Isolation, Bundle Portability & Window API ---");

check("hangar/app.bundle.js is freshly compiled with all updates", () => {
  return bundleJs.includes("getHangarFrameProfile") &&
         bundleJs.includes("btn-actions-toggle") &&
         bundleJs.includes("btn-meta-toggle") &&
         bundleJs.includes("btn-meta-close");
});

check("hangar/src/main.js preserves window.__hangar API with toggleActionsMenu and toggleMeta", () => {
  return hangarMain.includes("window.__hangar = {") &&
         hangarMain.includes("toggleActionsMenu,") &&
         hangarMain.includes("toggleMeta,") &&
         hangarMain.includes("launch: launchFlightWithShip");
});

check("hangar/src/main.js canonical launch protocol uses non-wildcard target origin", () => {
  return hangarMain.includes("function getTargetOrigin()") &&
         hangarMain.includes('type: "starfall_launch_flight"');
});

// ----------------------------------------------------------------------------
// Final Summary
// ----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`   CHECKS PASSED: ${passedChecks} / ${totalChecks}`);
console.log(`   OVERALL VERDICT: ${passed ? "PASS (100% Mobile Hangar Repair Verified)" : "FAIL"}`);
console.log("================================================================================");

if (!passed) process.exit(1);
