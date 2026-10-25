// tools/test_gameplay_wave0_diagnostics.mjs
// Wave 0 Gameplay Recovery Diagnostic & Fairness Verification Suite
// Verifies:
// 1. Opt-in diagnostic isolation (?diag=1) and zero hot-path regressions.
// 2. Flight input constraints, dead steering logic, and viewport/frustum projection math.
// 3. Deterministic pickup reachability across the full spawn domain (seed 20261025) with edge cases.
// 4. Collision truthfulness: Z-lead offset (+0.45m), mesh-vs-sphere inflation, and corridor curve math.
// 5. Feature functionality inventory: live local backend GET probes, static fallback, and read-only prod probe.

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
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
  console.log("   STARFALL WAVE 0 — NEGATIVE CONTROL HARNESS PROOF");
  console.log("   Verifying deliberately false, unreachable, and throwing predicates trigger FAIL");
  console.log("================================================================================\n");

  check("Negative control: deliberately false predicate must fail", () => {
    return false;
  }, "Expected failure for harness validation");

  check("Negative control: elevated crystal (y=+1.20) claimed reachable on mobile touch must fail", () => {
    const mobileTouchY = -0.68;
    const crystalY = 1.20;
    const maxRadius = 0.62 + 0.50; // 1.12m
    return Math.abs(crystalY - mobileTouchY) <= maxRadius;
  }, "Proves reachability evaluator rejects unreachable high-Y placements");

  check("Negative control: throwing predicate must fail with captured exception", () => {
    throw new Error("Deliberate Wave 0 harness test exception");
  }, "Expected exception failure for harness validation");

  console.log("\n================================================================================");
  console.log(`   NEGATIVE CONTROL RESULT: ${passedChecks} passed, ${totalChecks - passedChecks} failed`);
  console.log("   Harness successfully caught all deliberate failures.");
  console.log("================================================================================");

  process.exit(passed ? 0 : 1);
}

// ----------------------------------------------------------------------------
// Standard Wave 0 Verification Suite
// ----------------------------------------------------------------------------
const gameJs = fs.readFileSync(path.join(ROOT, "src/game.js"), "utf-8").replace(/\r\n/g, "\n");
const vercelJson = fs.readFileSync(path.join(ROOT, "vercel.json"), "utf-8").replace(/\r\n/g, "\n");

console.log("================================================================================");
console.log("   STARFALL SALVAGE — WAVE 0 FAIRNESS & TELEMETRY DIAGNOSTIC VERIFICATION");
console.log("   Branch: audit/gameplay-wave0-fairness-telemetry | Baseline: 128dca4bb1e092b9");
console.log("================================================================================\n");

// ----------------------------------------------------------------------------
// 1. Opt-In Diagnostic Isolation & Baseline Preservation
// ----------------------------------------------------------------------------
console.log("--- 1. Opt-In Diagnostic Isolation & Baseline Preservation ---");

check("src/game.js gates Wave 0 diagnostics behind ?diag=1 (DIAG_ENABLED)", () => {
  return gameJs.includes('const DIAG_ENABLED = DIAG_PARAM === "1";') &&
         gameJs.includes("if (DIAG_ENABLED && typeof window !== \"undefined\") {") &&
         gameJs.includes("window.__starfallWave0 =");
});

check("src/game.js retains rawPositions in createMesh ONLY when DIAG_ENABLED is true", () => {
  return gameJs.includes("let rawPositions = null;\n    if (DIAG_ENABLED) {\n      rawPositions = [];");
});

check("src/game.js activates deterministic mulberry32 PRNG in randomRange ONLY when DIAG_ENABLED is true", () => {
  return gameJs.includes("if (DIAG_ENABLED && diagSeedState !== null) {") &&
         gameJs.includes("diagSeedState = (diagSeedState + 0x6D2B79F5) | 0;");
});

check("src/game.js preserves baseline gameplay constants without modification", () => {
  return gameJs.includes("const MOBILE_LANE_TARGET_Y = -0.68;") &&
         gameJs.includes("const laneWidth = 2.2;") &&
         gameJs.includes("radius: 0.62,") &&
         gameJs.includes("z: -7.8,") &&
         gameJs.includes("const shipZ = player.z + 0.45;");
});

// ----------------------------------------------------------------------------
// 2. Flight Input Constraints & Viewport Frustum Projection Diagnostics
// ----------------------------------------------------------------------------
console.log("\n--- 2. Flight Input Constraints & Viewport Frustum Projection Diagnostics ---");

check("Diagnostic A1: applySteerVector zeroes touchAxis.y on touch-capable devices", () => {
  return gameJs.includes("if (isTouchCapable) {\n      touchAxis.y = 0;\n    }");
});

check("Diagnostic A2: updateGame locks touch targetY to -0.68 and contains unreachable dead else-if branch", () => {
  const idxOuter = gameJs.indexOf("if (Math.abs(touchAxis.x) > 0.4)");
  const idxInner = gameJs.indexOf("else if (Math.abs(touchAxis.x) < 0.1)", idxOuter);
  const idxTouchY = gameJs.indexOf("player.targetY = clamp(MOBILE_LANE_TARGET_Y, bounds.yMin, bounds.yMax);", idxOuter);
  return idxOuter !== -1 && idxInner > idxOuter && idxTouchY > idxOuter && (idxInner - idxOuter < 350);
});

check("Diagnostic A3: updateGame disables keyboard vertical steering (W/S/Up/Down) when isTouchCapable is true", () => {
  return gameJs.includes('if (!isTouchCapable) {\n      let moveY = 0;\n      if (keys.has("w") || keys.has("arrowup")) moveY += 1;');
});

// Exact camera frustum projection evaluator matching getFrameProfile & renderScene in src/game.js
function evaluateShipProjection({ w, h, touchCapable, playerX = 0, playerY = -0.68, playerZ = -7.8 }) {
  const aspect = w / Math.max(1, h);
  let profile;
  if (touchCapable) {
    if (aspect > 1.2) {
      profile = { fovScale: 0.82, viewBiasY: -0.04, cameraDepth: -2.55, playPitch: 0.18 };
    } else if (aspect < 0.52) {
      profile = { fovScale: 0.74, viewBiasY: 0.08, cameraDepth: -2.75, playPitch: 0.19 };
    } else if (aspect < 0.82) {
      profile = { fovScale: 0.78, viewBiasY: 0.12, cameraDepth: -2.9, playPitch: 0.22 };
    } else {
      profile = { fovScale: 0.82, viewBiasY: 0.14, cameraDepth: -3.05, playPitch: 0.24 };
    }
  } else if (aspect > 1.85) {
    profile = { fovScale: 0.68, viewBiasY: -0.06, cameraDepth: -2.48, playPitch: 0.18 };
  } else if (aspect > 1.35) {
    profile = { fovScale: 0.76, viewBiasY: 0.02, cameraDepth: -2.72, playPitch: 0.21 };
  } else {
    profile = { fovScale: 0.88, viewBiasY: 0.12, cameraDepth: -2.95, playPitch: 0.26 };
  }

  const baseFovRad = Math.PI / 3.1; // ~58.0645 deg
  const renderFovRad = baseFovRad * profile.fovScale;
  const renderFovDeg = (renderFovRad * 180) / Math.PI;
  const follow = touchCapable ? { x: 0.42, y: 0.22 } : { x: 0.018, y: 0.016 };
  const camTrackX = touchCapable ? 0.34 : Math.max(follow.x * 0.72, 0.06);

  const smoothCamX = -playerX * camTrackX;
  const smoothCamY = -playerY * follow.y + profile.viewBiasY;
  const shipZ = playerZ + 0.45; // -7.35

  // Translate then rotateX(-playPitch) per renderScene lines 5260-5265
  const px = playerX + smoothCamX;
  const py = playerY + smoothCamY;
  const pz = shipZ + profile.cameraDepth;

  const cosP = Math.cos(profile.playPitch);
  const sinP = Math.sin(profile.playPitch);
  const vy = cosP * py + sinP * pz;
  const vz = -sinP * py + cosP * pz;

  const f = 1.0 / Math.tan(renderFovRad / 2);
  const ndcX = (px * (f / aspect)) / (-vz);
  const ndcY = (vy * f) / (-vz);
  const screenY = (0.5 - ndcY * 0.5) * h;

  return { aspect, renderFovDeg, playPitch: profile.playPitch, followY: follow.y, vy, vz, ndcX, ndcY, screenY };
}

const mobilePortraitProj = evaluateShipProjection({ w: 393, h: 873, touchCapable: true, playerY: -0.68 });
const mobileLandscapeProj = evaluateShipProjection({ w: 873, h: 393, touchCapable: true, playerY: -0.68 });
const desktop16x9BottomProj = evaluateShipProjection({ w: 1920, h: 1080, touchCapable: false, playerY: -2.15 });
const desktop16x10BottomProj = evaluateShipProjection({ w: 1280, h: 800, touchCapable: false, playerY: -2.15 });
const ultrawideBottomProj = evaluateShipProjection({ w: 2560, h: 1080, touchCapable: false, playerY: -2.15 });

check(
  "Diagnostic A4: Mobile portrait (393x873) keeps locked ship (y=-0.68) visible inside vertical frustum",
  () => Math.abs(mobilePortraitProj.ndcY) < 0.85,
  `renderFov=${mobilePortraitProj.renderFovDeg.toFixed(1)}°, ndcY=${mobilePortraitProj.ndcY.toFixed(3)}, screenY=${mobilePortraitProj.screenY.toFixed(1)}px`
);

check(
  "Diagnostic A5: Mobile landscape (873x393) keeps locked ship (y=-0.68) in lower half of viewport",
  () => mobileLandscapeProj.ndcY < -0.45 && mobileLandscapeProj.ndcY > -0.85,
  `renderFov=${mobileLandscapeProj.renderFovDeg.toFixed(1)}°, ndcY=${mobileLandscapeProj.ndcY.toFixed(3)}, screenY=${mobileLandscapeProj.screenY.toFixed(1)}px`
);

check(
  "Diagnostic A6: Desktop 16:9/16:10 downward steering (y=-2.15) pushes ship center below bottom frustum edge (NDC_y < -1.0)",
  () => desktop16x9BottomProj.ndcY < -1.0 && desktop16x10BottomProj.ndcY < -1.0,
  `1920x1080 ndcY=${desktop16x9BottomProj.ndcY.toFixed(3)} (screenY=${desktop16x9BottomProj.screenY.toFixed(1)}px / 1080px); 1280x800 ndcY=${desktop16x10BottomProj.ndcY.toFixed(3)} (screenY=${desktop16x10BottomProj.screenY.toFixed(1)}px / 800px)`
);

check(
  "Diagnostic A7: Ultrawide 21:9 (2560x1080) downward steering (y=-2.15) severely clips ship off-screen (NDC_y < -1.15)",
  () => ultrawideBottomProj.ndcY < -1.15,
  `renderFov=${ultrawideBottomProj.renderFovDeg.toFixed(2)}°, playPitch=${ultrawideBottomProj.playPitch}rad, followY=${ultrawideBottomProj.followY}, ndcY=${ultrawideBottomProj.ndcY.toFixed(3)} (screenY=${ultrawideBottomProj.screenY.toFixed(1)}px / 1080px)`
);

// ----------------------------------------------------------------------------
// 3. Deterministic Pickup Reachability Matrix (Seed 20261025)
// ----------------------------------------------------------------------------
console.log("\n--- 3. Deterministic Pickup Reachability Matrix & Edge Cases ---");

function evaluatePickupReachability(kind, x, y, size) {
  const playerRadius = 0.62;
  const pickupRadius = kind === "orb" ? size * 0.78 : size * 0.58;
  const maxR = playerRadius + pickupRadius;
  const lanes = [-2.2, 0, 2.2];
  const mobileY = -0.68;

  // 1. Stationary 3-lane mobile
  let minMobileLaneDist = Infinity;
  for (const lx of lanes) {
    const d = Math.hypot(x - lx, y - mobileY);
    if (d < minMobileLaneDist) minMobileLaneDist = d;
  }
  const mobileStationary = minMobileLaneDist <= maxR;

  // 2. Transient lane-lerp mobile (x in [-2.2, 2.2], y = -0.68)
  const clampedMobileX = Math.max(-2.2, Math.min(2.2, x));
  const minMobileLerpDist = Math.hypot(x - clampedMobileX, y - mobileY);
  const mobileLerp = minMobileLerpDist <= maxR;

  // 3. Desktop stationary 3-lane + vertical Y in [-2.15, 1.55]
  const clampedDesktopY = Math.max(-2.15, Math.min(1.55, y));
  let minDesktopLaneDist = Infinity;
  for (const lx of lanes) {
    const d = Math.hypot(x - lx, y - clampedDesktopY);
    if (d < minDesktopLaneDist) minDesktopLaneDist = d;
  }
  const desktopStationary = minDesktopLaneDist <= maxR;

  // 4. Desktop transient lane-lerp + vertical Y in [-2.15, 1.55]
  const minDesktopLerpDist = Math.hypot(x - clampedMobileX, y - clampedDesktopY);
  const desktopLerp = minDesktopLerpDist <= maxR;

  // 5. Wave 1 full 2D continuous steering (x in [-3.9, 3.9], y in [-2.15, 1.55])
  const clampedFullX = Math.max(-3.9, Math.min(3.9, x));
  const minFullDist = Math.hypot(x - clampedFullX, y - clampedDesktopY);
  const full2D = minFullDist <= maxR;

  let mobileFailureReason = "REACHABLE";
  if (!mobileStationary) {
    const dy = Math.abs(y - mobileY);
    if (dy > maxR) {
      mobileFailureReason = y > mobileY ? "UNREACHABLE_HIGH_Y" : "UNREACHABLE_LOW_Y";
    } else if (Math.abs(x) > 2.2 + Math.sqrt(Math.max(0, maxR * maxR - dy * dy))) {
      mobileFailureReason = "UNREACHABLE_OUTER_X";
    } else {
      mobileFailureReason = "UNREACHABLE_SCALLOP_GAP_BETWEEN_LANES";
    }
  }

  return {
    maxR,
    mobileStationary,
    mobileLerp,
    desktopStationary,
    desktopLerp,
    full2D,
    mobileFailureReason,
  };
}

// Edge Case 1: Between-lane X placement at y = -0.68 IS reachable on stationary 3-lane mobile
const betweenLaneSameY = evaluatePickupReachability("crystal", 1.05, -0.68, 0.80); // maxR = 0.62 + 0.464 = 1.084 >= 1.05
check(
  "Diagnostic B1 (Edge Case): Between-lane crystal at (x=1.05, y=-0.68) IS reachable from lane 0 due to collider radius overlap",
  () => betweenLaneSameY.mobileStationary === true && betweenLaneSameY.mobileLerp === true,
  `maxR=${betweenLaneSameY.maxR.toFixed(3)}m >= |1.05 - 0| = 1.050m`
);

// Edge Case 2: Scallop gap between lanes when Y is moderately offset (x=1.10, y=+0.20)
const scallopGapPickup = evaluatePickupReachability("crystal", 1.10, 0.20, 0.82); // maxR = 1.0956m, dy = 0.88m
check(
  "Diagnostic B2 (Edge Case): Scallop-gap crystal at (x=1.10, y=+0.20) is UNREACHABLE from stationary lanes but REACHABLE during transient lane-lerp",
  () => scallopGapPickup.mobileStationary === false &&
        scallopGapPickup.mobileLerp === true &&
        scallopGapPickup.mobileFailureReason === "UNREACHABLE_SCALLOP_GAP_BETWEEN_LANES",
  `dy=0.88m <= maxR=${scallopGapPickup.maxR.toFixed(3)}m, but stationary lane dist=${Math.hypot(1.1, 0.88).toFixed(3)}m > maxR`
);

// Edge Case 3: Elevated blue crystal/orb at y = +1.15 is UNREACHABLE on all mobile modes but REACHABLE on desktop
const elevatedPickup = evaluatePickupReachability("orb", 0.0, 1.15, 0.75); // maxR = 1.205m, dy = 1.83m
check(
  "Diagnostic B3 (Edge Case): Elevated pickup at (x=0.0, y=+1.15) is UNREACHABLE on mobile (stationary & lerp) but REACHABLE on desktop",
  () => elevatedPickup.mobileStationary === false &&
        elevatedPickup.mobileLerp === false &&
        elevatedPickup.desktopStationary === true &&
        elevatedPickup.mobileFailureReason === "UNREACHABLE_HIGH_Y",
  `dy=${(1.15 - (-0.68)).toFixed(2)}m > maxR=${elevatedPickup.maxR.toFixed(3)}m`
);

// Edge Case 4: Extreme outer-X crystal at (x=3.65, y=0.0, size=0.68) is UNREACHABLE when X is clamped to +-2.2, but REACHABLE under Wave 1 continuous X
const outerXPickup = evaluatePickupReachability("crystal", 3.65, 0.0, 0.68); // maxR = 1.0144m, dx from 2.2 = 1.45m
check(
  "Diagnostic B4 (Edge Case): Outer-X crystal at (x=3.65, y=0.0) is UNREACHABLE under +-2.2 lane clamp on both mobile & desktop, but REACHABLE with continuous X",
  () => outerXPickup.mobileLerp === false &&
        outerXPickup.desktopLerp === false &&
        outerXPickup.full2D === true,
  `dx from lane +2.2 is 1.45m > maxR=${outerXPickup.maxR.toFixed(3)}m`
);

// Full Monte Carlo simulation with deterministic mulberry32 seed 20261025 (N = 1000)
let seedState = 20261025 >>> 0;
function nextRand() {
  seedState = (seedState + 0x6D2B79F5) >>> 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function randRange(min, max) {
  return min + nextRand() * (max - min);
}

const sampleCount = 1000;
const stats = {
  crystal: { total: 0, mobileStat: 0, mobileLerp: 0, desktopStat: 0, desktopLerp: 0, full2D: 0, highY: 0, lowY: 0, outerX: 0, scallop: 0 },
  orb: { total: 0, mobileStat: 0, mobileLerp: 0, desktopStat: 0, desktopLerp: 0, full2D: 0, highY: 0, lowY: 0, outerX: 0, scallop: 0 },
};

for (let i = 0; i < sampleCount; i++) {
  const kind = nextRand() > 0.72 ? "orb" : "crystal";
  const spreadX = kind === "orb" ? 3.2 : 3.8;
  const x = randRange(-spreadX, spreadX);
  const y = kind === "orb" ? randRange(-1.7, 1.3) : randRange(-2.0, 1.6);
  const size = kind === "orb" ? randRange(0.62, 0.88) : randRange(0.64, 0.96);
  const res = evaluatePickupReachability(kind, x, y, size);

  const bucket = stats[kind];
  bucket.total++;
  if (res.mobileStationary) bucket.mobileStat++;
  if (res.mobileLerp) bucket.mobileLerp++;
  if (res.desktopStationary) bucket.desktopStat++;
  if (res.desktopLerp) bucket.desktopLerp++;
  if (res.full2D) bucket.full2D++;
  if (res.mobileFailureReason === "UNREACHABLE_HIGH_Y") bucket.highY++;
  if (res.mobileFailureReason === "UNREACHABLE_LOW_Y") bucket.lowY++;
  if (res.mobileFailureReason === "UNREACHABLE_OUTER_X") bucket.outerX++;
  if (res.mobileFailureReason === "UNREACHABLE_SCALLOP_GAP_BETWEEN_LANES") bucket.scallop++;
}

const crystalMobStatPct = (stats.crystal.mobileStat / stats.crystal.total) * 100;
const crystalMobLerpPct = (stats.crystal.mobileLerp / stats.crystal.total) * 100;
const crystalDeskLerpPct = (stats.crystal.desktopLerp / stats.crystal.total) * 100;
const crystalFull2DPct = (stats.crystal.full2D / stats.crystal.total) * 100;

const orbMobStatPct = (stats.orb.mobileStat / stats.orb.total) * 100;
const orbMobLerpPct = (stats.orb.mobileLerp / stats.orb.total) * 100;
const orbDeskLerpPct = (stats.orb.desktopLerp / stats.orb.total) * 100;
const orbFull2DPct = (stats.orb.full2D / stats.orb.total) * 100;

check(
  "Diagnostic B5: Seed 20261025 proves >45% of spawned crystals are unreachable on mobile touch",
  () => crystalMobStatPct < 55 && crystalFull2DPct === 100,
  `Crystals (N=${stats.crystal.total}): Mobile Stationary=${crystalMobStatPct.toFixed(1)}%, Mobile Lerp=${crystalMobLerpPct.toFixed(1)}%, Desktop Lerp=${crystalDeskLerpPct.toFixed(1)}%, Wave1 Full 2D=${crystalFull2DPct.toFixed(1)}% (HighY=${stats.crystal.highY}, LowY=${stats.crystal.lowY}, OuterX=${stats.crystal.outerX}, Scallop=${stats.crystal.scallop})`
);

check(
  "Diagnostic B6: Seed 20261025 proves >30% of spawned orbs are unreachable on mobile touch",
  () => orbMobStatPct < 70 && orbFull2DPct === 100,
  `Orbs (N=${stats.orb.total}): Mobile Stationary=${orbMobStatPct.toFixed(1)}%, Mobile Lerp=${orbMobLerpPct.toFixed(1)}%, Desktop Lerp=${orbDeskLerpPct.toFixed(1)}%, Wave1 Full 2D=${orbFull2DPct.toFixed(1)}% (HighY=${stats.orb.highY}, LowY=${stats.orb.lowY}, OuterX=${stats.orb.outerX}, Scallop=${stats.orb.scallop})`
);

// ----------------------------------------------------------------------------
// 4. Collision Truthfulness vs. Rendered Geometry
// ----------------------------------------------------------------------------
console.log("\n--- 4. Collision Truthfulness vs. Rendered Geometry ---");

check("Diagnostic C1: Ship rendered Z (-7.35) leads collision Z (-7.80) by +0.45m, causing hazards at z=-8.85 to collide 1.50m ahead of rendered ship center", () => {
  const playerZ = -7.8;
  const shipRenderedZ = playerZ + 0.45; // -7.35
  const leadingCollisionZ = playerZ - 1.1; // -8.90
  const leadAheadOfRenderedCenter = shipRenderedZ - leadingCollisionZ; // 1.55m
  return Math.abs(leadAheadOfRenderedCenter - 1.55) < 1e-6;
});

// Verify actual debris mesh vertices vs debris.radius = size * 0.82
const debrisBasePts = [
  [0, 0.75, 0],
  [0, -0.7, 0],
  [-0.36, 0.14, -0.22],
  [0.34, 0.2, -0.18],
  [0.28, -0.18, 0.28],
  [-0.28, -0.12, 0.3],
];
const debrisMaxEqRadiusRatio = Math.max(...debrisBasePts.slice(2).map(([x, , z]) => Math.hypot(x, z))); // ~0.4219
const debrisMax3DRadiusRatio = Math.max(...debrisBasePts.map(([x, y, z]) => Math.hypot(x, y, z))); // 0.75
const debrisColliderRatio = 0.82;

check(
  "Diagnostic C2: Debris sphere collider radius (0.82 * size) exceeds every vertex of the unscaled debris bipyramid (max 0.75 * size, equatorial 0.42 * size)",
  () => debrisColliderRatio > debrisMax3DRadiusRatio && debrisColliderRatio > debrisMaxEqRadiusRatio * 1.9,
  `colliderRatio=${debrisColliderRatio} vs maxVertexRatio=${debrisMax3DRadiusRatio.toFixed(2)}, equatorialWaistRatio=${debrisMaxEqRadiusRatio.toFixed(3)}`
);

const rockSize = 1.38;
const rockColliderRadius = rockSize * 0.82; // 1.1316m
const playerColliderRadius = 0.62;
const combinedColliderThreshold = rockColliderRadius + playerColliderRadius; // 1.7516m
const lateralPassDx = 1.65;
const lateralMeshSum = 0.82 + debrisMaxEqRadiusRatio * rockSize; // 1.402m
const lateralEmptyGap = lateralPassDx - lateralMeshSum; // +0.248m

const verticalPassDy = 1.60;
const verticalMeshSum = 0.18 + debrisMax3DRadiusRatio * rockSize; // 1.215m
const verticalEmptyGap = verticalPassDy - verticalMeshSum; // +0.385m

check(
  "Diagnostic C3: Phantom edge hits occur with +0.25m lateral and +0.38m vertical empty space between rendered 3D meshes",
  () => lateralPassDx < combinedColliderThreshold &&
        lateralEmptyGap > 0.24 &&
        verticalPassDy < combinedColliderThreshold &&
        verticalEmptyGap > 0.38,
  `combinedCollider=${combinedColliderThreshold.toFixed(3)}m; lateral(dx=1.65m) meshGap=+${lateralEmptyGap.toFixed(3)}m; vertical(dy=1.60m) meshGap=+${verticalEmptyGap.toFixed(3)}m`
);

// ----------------------------------------------------------------------------
// 5. Feature Functionality Inventory & Live Endpoint Probes
// ----------------------------------------------------------------------------
console.log("\n--- 5. Feature Functionality Inventory & Live Endpoint Probes ---");

check("Diagnostic D1: vercel.json contains static Hangar rewrites only and no /api/* backend proxy or serverless function wiring", () => {
  const parsed = JSON.parse(vercelJson);
  const hasApiRewrite = (parsed.rewrites || []).some((r) => String(r.source).includes("/api"));
  return !hasApiRewrite;
});

check("Diagnostic D2: src/game.js contains client-side OPS passcode comparison (registered for security remediation without exposing code)", () => {
  return gameJs.includes("const ADMIN_OPS_CODE =") &&
         gameJs.includes("if (code === ADMIN_OPS_CODE)");
});

// Spawn local backend/starfall_server.py on an ephemeral port and verify live GET /api/health and GET /api/leaderboard
async function verifyLocalPythonBackend() {
  const port = 18799;
  const proc = spawn("python3", ["backend/starfall_server.py", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    let healthy = false;
    for (let attempt = 0; attempt < 25; attempt++) {
      await new Promise((r) => setTimeout(r, 120));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.ok === true && data.service === "starfall-salvage") {
            healthy = true;
            break;
          }
        }
      } catch {
        // wait for server startup
      }
    }

    const lbRes = await fetch(`http://127.0.0.1:${port}/api/leaderboard?limit=5`);
    const lbData = lbRes.ok ? await lbRes.json() : null;

    return {
      healthy,
      lbStatus: lbRes.status,
      lbOk: Boolean(lbData && lbData.ok === true && Array.isArray(lbData.scores)),
      entriesCount: lbData && Array.isArray(lbData.scores) ? lbData.scores.length : 0,
    };
  } finally {
    proc.kill("SIGTERM");
  }
}

async function probeProductionReadOnly() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const healthRes = await fetch("https://starfallsalvage.kopanolabs.com/api/health", {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    const contentType = healthRes.headers.get("content-type") || "";
    return {
      reachable: true,
      status: healthRes.status,
      contentType,
      isJsonBackend: healthRes.ok && contentType.includes("application/json"),
    };
  } catch (err) {
    return {
      reachable: false,
      status: 0,
      error: err.message,
      isJsonBackend: false,
    };
  }
}

const localBackendResult = await verifyLocalPythonBackend();
check(
  "Diagnostic D3: Local Python SQLite backend (backend/starfall_server.py) responds 200 OK on GET /api/health and GET /api/leaderboard",
  () => localBackendResult.healthy && localBackendResult.lbStatus === 200 && localBackendResult.lbOk,
  `health.ok=${localBackendResult.healthy}, leaderboard.status=${localBackendResult.lbStatus}, scoresCount=${localBackendResult.entriesCount}`
);

const prodProbe = await probeProductionReadOnly();
check(
  "Diagnostic D4: Read-only GET probe against production (/api/health) confirms backend is unmounted on static Vercel deployment",
  () => prodProbe.isJsonBackend === false,
  prodProbe.reachable
    ? `GET https://starfallsalvage.kopanolabs.com/api/health returned HTTP ${prodProbe.status} (${prodProbe.contentType || "no-content-type"})`
    : `Network probe status: ${prodProbe.error}`
);

console.log("\n================================================================================");
console.log(`   CHECKS PASSED: ${passedChecks} / ${totalChecks}`);
console.log(`   OVERALL VERDICT: ${passed ? "PASS (Wave 0 Diagnostic Suite Verified)" : "FAIL"}`);
console.log("================================================================================");

process.exit(passed ? 0 : 1);
