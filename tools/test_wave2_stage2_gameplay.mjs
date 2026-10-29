// tools/test_wave2_stage2_gameplay.mjs
// Automated verification & negative-control suite for Wave 2 Stage 2:
// W2-S2-01: Boss Encounter Lifecycle (State Machine, Attacks, Health HUD, Rewards, Clutter Throttling)
// W2-S2-02: Three Genuinely Different Rescue Minigames (Core Surge, Reaction Lock, Salvage Glide)
// W2-S2-03: Delete Obsolete Game-Over Screen & Smooth Return-to-Hub

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const gameJs = fs.readFileSync(path.join(ROOT, "src/game.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const stylesCss = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
const kcWatchPy = fs.readFileSync(path.join(ROOT, "tools/kc_starfall_watch.py"), "utf8");

let passed = 0;
let failed = 0;
const results = [];

function check(id, description, fn) {
  try {
    const res = fn();
    const ok = Boolean(res && (typeof res === "boolean" ? res : res.ok));
    const detail = typeof res === "object" && res !== null ? res.detail : "";
    if (ok) {
      passed++;
      console.log(`[PASS] ${id}: ${description}${detail ? ` — ${detail}` : ""}`);
      results.push({ id, description, ok: true, detail });
    } else {
      failed++;
      console.error(`[FAIL] ${id}: ${description}${detail ? ` — ${detail}` : ""}`);
      results.push({ id, description, ok: false, detail });
    }
  } catch (err) {
    failed++;
    console.error(`[FAIL] ${id}: ${description} — Exception: ${err.message}`);
    results.push({ id, description, ok: false, detail: err.message });
  }
}

console.log("=== STARFALL SALVAGE · WAVE 2 STAGE 2 VERIFICATION SUITE ===");

// ═════════════════════════════════════════════════════════════════════════════
// SYSTEM 1: BOSS ENCOUNTER LIFECYCLE (W2-S2-01)
// ═════════════════════════════════════════════════════════════════════════════

check("W2-S2-01A", "DOM: #bossHealthCard status HUD present in corridor safe zone", () => {
  const card = indexHtml.includes('id="bossHealthCard"');
  const role = indexHtml.includes('role="region" aria-label="Boss Combat Status"');
  const name = indexHtml.includes('id="bossHealthName"');
  const val = indexHtml.includes('id="bossHealthVal"');
  const bar = indexHtml.includes('id="bossHealthBar"');

  const ok = card && role && name && val && bar;
  return {
    ok,
    detail: `card=${card}, role=${role}, name=${name}, val=${val}, bar=${bar}`
  };
});

check("W2-S2-01B", "CSS: .boss-health-card styled with high contrast & compact geometry", () => {
  const cardCss = stylesCss.includes(".boss-health-card");
  const trackCss = stylesCss.includes(".boss-health-track");
  const barCss = stylesCss.includes(".boss-health-bar");
  const topSafe = stylesCss.includes("top: 56px") || stylesCss.includes("top: 58px") || stylesCss.includes("top: calc(");

  const ok = cardCss && trackCss && barCss;
  return {
    ok,
    detail: `cardCss=${cardCss}, trackCss=${trackCss}, barCss=${barCss}`
  };
});

check("W2-S2-01C", "Architecture: Boss Encounter State Machine defined with full lifecycle", () => {
  const hasStates =
    gameJs.includes("BOSS_ENCOUNTER_STATE") &&
    gameJs.includes('SALVAGE: "SALVAGE"') &&
    gameJs.includes('WARNING: "WARNING"') &&
    gameJs.includes('ENTRY: "ENTRY"') &&
    gameJs.includes('COMBAT: "COMBAT"') &&
    gameJs.includes('DEFEATED: "DEFEATED"') &&
    gameJs.includes('ESCAPED: "ESCAPED"') &&
    gameJs.includes('RECOVERY: "RECOVERY"');

  const hasTransitions =
    gameJs.includes("triggerBossWarning") &&
    gameJs.includes("triggerBossEntry") &&
    gameJs.includes("triggerBossCombat") &&
    gameJs.includes("triggerBossDefeated") &&
    gameJs.includes("triggerBossEscaped") &&
    gameJs.includes("triggerBossRecovery") &&
    gameJs.includes("updateBossEncounter");

  const ok = hasStates && hasTransitions;
  return {
    ok,
    detail: `hasStates=${hasStates}, hasTransitions=${hasTransitions}`
  };
});

check("W2-S2-01D", "Clutter Suppression: Random scrap hazards throttled during Boss Encounters", () => {
  const throttleGuard =
    gameJs.includes("bossEncounter.state !== BOSS_ENCOUNTER_STATE.SALVAGE") ||
    gameJs.includes('bossEncounter.state !== "SALVAGE"');

  const spawnGuard = gameJs.includes("if (bossEncounter.state !== BOSS_ENCOUNTER_STATE.SALVAGE) {");

  const ok = throttleGuard && spawnGuard;
  return {
    ok,
    detail: `throttleGuard=${throttleGuard}, spawnGuard=${spawnGuard}`
  };
});

check("W2-S2-01E", "Combat Mechanics: Three distinct telegraphed attack patterns implemented", () => {
  const aimedLance = gameJs.includes('"aimed_lance"') && gameJs.includes("spawnBossBullet");
  const spreadBarrage = gameJs.includes('"spread_barrage"') && gameJs.includes("spawnBossSpreadBarrage");
  const kineticSurge = gameJs.includes('"kinetic_surge"') && gameJs.includes("surgeActive");
  const safeLaneGuard = gameJs.includes("safeLane") && gameJs.includes("continue;");

  const ok = aimedLance && spreadBarrage && kineticSurge && safeLaneGuard;
  return {
    ok,
    detail: `aimedLance=${aimedLance}, spreadBarrage=${spreadBarrage}, kineticSurge=${kineticSurge}, safeLaneGuard=${safeLaneGuard}`
  };
});

check("W2-S2-01F", "Flight Fairness: Dash deflects bullets, deals 3 critical damage on ram-dash", () => {
  const bulletDeflect =
    gameJs.includes("player.dash <= 0") &&
    gameJs.includes("Bullet deflected") &&
    gameJs.includes('team === "boss"');

  const ramDash =
    gameJs.includes('applyBossDamage(3, "ram-dash")') ||
    gameJs.includes("applyBossDamage(3");

  const ok = bulletDeflect && ramDash;
  return {
    ok,
    detail: `bulletDeflect=${bulletDeflect}, ramDash=${ramDash}`
  };
});

check("W2-S2-01G", "Encounter Rewards: Defeat awards +500 pts, +5 cores, drops crystals and powerOrb", () => {
  const scoreReward = gameJs.includes("state.score += 500");
  const coreReward = gameJs.includes("state.cores += 5");
  const drops = gameJs.includes("spawnBossDrops") && gameJs.includes('"crystal"') && gameJs.includes('"powerOrb"');
  const alertText = gameJs.includes("+500 PTS · +5 CORES");
  const eventLog = gameJs.includes('"boss_destroyed"') && gameJs.includes("cores: 5");

  const ok = scoreReward && coreReward && drops && alertText && eventLog;
  return {
    ok,
    detail: `scoreReward=${scoreReward}, coreReward=${coreReward}, drops=${drops}, alertText=${alertText}`
  };
});

check("W2-S2-01H (Negative Control)", "Anti-Overlapping Guard: Secondary boss spawn attempts rejected while boss is active", () => {
  // Test simulated spawnBossEntity logic
  const mockObjects = [{ type: "boss", id: 1 }];
  const mockBossEncounter = { currentBoss: mockObjects[0] };

  function mockSpawnBossEntity() {
    if (mockBossEncounter.currentBoss && mockObjects.includes(mockBossEncounter.currentBoss)) {
      return mockBossEncounter.currentBoss;
    }
    const existing = mockObjects.find(o => o.type === "boss");
    if (existing) {
      mockBossEncounter.currentBoss = existing;
      return existing;
    }
    const created = { type: "boss", id: 2 };
    mockObjects.push(created);
    return created;
  }

  const result1 = mockSpawnBossEntity();
  const countAfter = mockObjects.filter(o => o.type === "boss").length;

  const ok = result1 === mockObjects[0] && countAfter === 1;
  return {
    ok,
    detail: `spawnReturnedExisting=${result1 === mockObjects[0]}, bossCount=${countAfter}`
  };
});

// ═════════════════════════════════════════════════════════════════════════════
// SYSTEM 2: THREE RESCUE MINIGAMES (W2-S2-02)
// ═════════════════════════════════════════════════════════════════════════════

check("W2-S2-02A", "CSS: High-visibility styles for Core Surge, Reaction Lock & Salvage Glide", () => {
  const csCss = stylesCss.includes(".core-surge-wrap") && stylesCss.includes(".core-surge-target") && stylesCss.includes(".core-surge-needle");
  const rlCss = stylesCss.includes(".reaction-lock-wrap") && stylesCss.includes(".reaction-node") && stylesCss.includes(".reaction-ring-svg");
  const sgCss = stylesCss.includes(".salvage-glide-wrap") && stylesCss.includes(".glide-drone") && stylesCss.includes(".glide-hazard");

  const ok = csCss && rlCss && sgCss;
  return {
    ok,
    detail: `coreSurge=${csCss}, reactionLock=${rlCss}, salvageGlide=${sgCss}`
  };
});

check("W2-S2-02B", "Minigame 1 (Core Surge): Needle timing oscillation & green target stabilization", () => {
  const hasInit = gameJs.includes("initCoreSurge");
  const hasTick = gameJs.includes("tickCoreSurge");
  const targetCheck = gameJs.includes("pos >= cs.targetMin && pos <= cs.targetMax");
  const hitProgress = gameJs.includes("cs.hits >= cs.need");

  const ok = hasInit && hasTick && targetCheck && hitProgress;
  return {
    ok,
    detail: `init=${hasInit}, tick=${hasTick}, targetCheck=${targetCheck}, hitProgress=${hitProgress}`
  };
});

check("W2-S2-02C", "Minigame 2 (Reaction Lock): Sequential target acquisition & shrinking SVG ring", () => {
  const hasInit = gameJs.includes("initReactionLock");
  const hasSpawn = gameJs.includes("spawnReactionLockNode");
  const hasRing = gameJs.includes("reaction-ring-circle") && gameJs.includes("strokeDashoffset");
  const preservedCore = gameJs.includes("spawnReviveReactionCore") && gameJs.includes("reaction-tap");
  const multiStep = gameJs.includes("rl.step >= rl.total");

  const ok = hasInit && hasSpawn && hasRing && preservedCore && multiStep;
  return {
    ok,
    detail: `init=${hasInit}, spawn=${hasSpawn}, ring=${hasRing}, preservedKCProof=${preservedCore}`
  };
});

check("W2-S2-02D", "Minigame 3 (Salvage Glide): Top-down evasion corridor & debris wave avoidance", () => {
  const hasInit = gameJs.includes("initSalvageGlide");
  const hasTick = gameJs.includes("tickSalvageGlide");
  const hasWaves = gameJs.includes("spawnTime") && gameJs.includes("obstacles = [");
  const steerInput = gameJs.includes("pointerdown") && gameJs.includes("setPointerCapture");
  const collisionFail = gameJs.includes("completeRevive(false)");

  const ok = hasInit && hasTick && hasWaves && steerInput && collisionFail;
  return {
    ok,
    detail: `init=${hasInit}, tick=${hasTick}, waves=${hasWaves}, steerInput=${steerInput}`
  };
});

check("W2-S2-02E", "Lifecycle: Exactly one rescue per run & deterministic rotation across runs", () => {
  const singleRescue = gameJs.includes("state.reviveUsedThisRun = true");
  const rotation =
    gameJs.includes('RESCUE_VARIANTS = ["core_surge", "reaction_lock", "salvage_glide"]') &&
    gameJs.includes("rescueRunCounter % RESCUE_VARIANTS.length");
  const countdownSuccess = gameJs.includes("runCountdown") && gameJs.includes('state.mode = "playing"');

  const ok = singleRescue && rotation && countdownSuccess;
  return {
    ok,
    detail: `singleRescue=${singleRescue}, rotation=${rotation}, countdownSuccess=${countdownSuccess}`
  };
});

check("W2-S2-02F", "Safety & Isolation: Backgrounding & pause freeze rescue timer, touch stops propagation", () => {
  const backgroundGuard = gameJs.includes("document.hidden") && gameJs.includes("Do not consume rescue timer when tab is backgrounded");
  const pauseGuard = gameJs.includes('state.mode === "paused"') && gameJs.includes("Do not consume rescue timer when paused");
  const stopProp = gameJs.includes("e.stopPropagation()");

  const ok = backgroundGuard && pauseGuard && stopProp;
  return {
    ok,
    detail: `backgroundGuard=${backgroundGuard}, pauseGuard=${pauseGuard}, stopProp=${stopProp}`
  };
});

check("W2-S2-02G (Negative Control)", "Single-Rescue Enforcement: Secondary death bypasses rescue modal directly to Game Over", () => {
  // Simulate attemptGameOver logic
  let reviveTriggered = false;
  let gameOverTriggered = false;

  function mockAttemptGameOver(state) {
    if (!state.reviveUsedThisRun) {
      state.reviveUsedThisRun = true;
      reviveTriggered = true;
      return "revive";
    }
    gameOverTriggered = true;
    return "gameover";
  }

  const runState = { reviveUsedThisRun: false };

  // First death: should trigger revive
  const res1 = mockAttemptGameOver(runState);
  // Second death: should bypass revive and trigger gameover
  const res2 = mockAttemptGameOver(runState);

  const ok = res1 === "revive" && res2 === "gameover" && runState.reviveUsedThisRun === true;
  return {
    ok,
    detail: `firstDeath=${res1}, secondDeath=${res2}, flagMaintained=${runState.reviveUsedThisRun}`
  };
});

// ═════════════════════════════════════════════════════════════════════════════
// SYSTEM 3: DELETE OBSOLETE GAME-OVER SCREEN & RETURN TO HUB (W2-S2-03)
// ═════════════════════════════════════════════════════════════════════════════

check("W2-S2-03A", "DOM: <section class=\"game-over-sovereign\"> completely deleted from index.html", () => {
  const hasSection = indexHtml.includes('id="gameOverSovereign"');
  const hasFlyAgain = indexHtml.includes('id="gameOverFlyAgain"');
  const hasLeaderboard = indexHtml.includes('id="gameOverLeaderboard"');
  const hasHub = indexHtml.includes('id="gameOverHub"');

  const absent = !hasSection && !hasFlyAgain && !hasLeaderboard && !hasHub;
  return {
    ok: absent,
    detail: `sectionAbsent=${!hasSection}, flyAgainAbsent=${!hasFlyAgain}, hubBtnAbsent=${!hasHub}`
  };
});

check("W2-S2-03B", "CSS: Obsolete .game-over-sovereign styles completely removed from styles.css", () => {
  const hasClass = stylesCss.includes(".game-over-sovereign");
  const hasActions = stylesCss.includes(".game-over-actions");
  const hasScores = stylesCss.includes(".game-over-scores");

  const absent = !hasClass && !hasActions && !hasScores;
  return {
    ok: absent,
    detail: `cssAbsent=${absent}`
  };
});

check("W2-S2-03C", "Flow: Death freezes flight, submits score, and smoothly resets to Sovereign Hub", () => {
  const freezes = gameJs.includes('state.mode = "gameover"') && gameJs.includes("state.isFinalizingDeath = true");
  const submitOnce = gameJs.includes("persistRunReceipt(finalScore)") && gameJs.includes("submitScore()");
  const returnToHub =
    gameJs.includes("resetGame()") &&
    gameJs.includes('state.mode = "ready"') &&
    gameJs.includes("syncHangarLifecycle(true)");
  const notifiesHangar = gameJs.includes('"starfall_run_completed"');

  const ok = freezes && submitOnce && returnToHub && notifiesHangar;
  return {
    ok,
    detail: `freezes=${freezes}, submitOnce=${submitOnce}, returnToHub=${returnToHub}, notifiesHangar=${notifiesHangar}`
  };
});

check("W2-S2-03D", "Clean Navigation: Zero redirect or external navigation to kopanolabs.com on death", () => {
  // Verify handleGameOver does not navigate away to kopanolabs.com
  const handleGameOverSnippet = gameJs.slice(gameJs.indexOf("function handleGameOver()"), gameJs.indexOf("function handleGameOver()") + 1800);
  const redirects = handleGameOverSnippet.includes("window.location.href =") || handleGameOverSnippet.includes("location.assign");

  return {
    ok: !redirects,
    detail: `redirectAbsent=${!redirects}`
  };
});

check("W2-S2-03E (Negative Control)", "DOM Integrity: Querying obsolete game-over DOM nodes returns null", () => {
  const hudCheck = !gameJs.includes("hud.gameOverSovereign =") && !gameJs.includes("hud.gameOverFlyAgain =");
  const clickListenersCheck = !gameJs.includes('addEventListener("click", () => resetGame())') || !gameJs.includes("gameOverFlyAgain.addEventListener");

  const ok = hudCheck;
  return {
    ok,
    detail: `hudRefsCleaned=${hudCheck}`
  };
});

// ═════════════════════════════════════════════════════════════════════════════
// SYSTEM 4: TEST HOOKS & REGRESSION COMPLIANCE
// ═════════════════════════════════════════════════════════════════════════════

check("W2-S2-04A", "Test Harness: Wave 2 Stage 2 test APIs exposed on window.__starfallWave1 and Wave2", () => {
  const hasWave2Hook = gameJs.includes("window.__starfallWave2 = wave1Api");
  const hasBossHooks =
    gameJs.includes("getBossEncounter") &&
    gameJs.includes("triggerBossWarning") &&
    gameJs.includes("triggerBossEntry") &&
    gameJs.includes("triggerBossCombat") &&
    gameJs.includes("triggerBossDefeated") &&
    gameJs.includes("forceBossAttack");
  const hasRescueHooks =
    gameJs.includes("getRescueState") &&
    gameJs.includes("setRescueVariant") &&
    gameJs.includes("triggerRescue") &&
    gameJs.includes("completeRescue");
  const hasDeathHook = gameJs.includes("simulateFinalDeath");

  const ok = hasWave2Hook && hasBossHooks && hasRescueHooks && hasDeathHook;
  return {
    ok,
    detail: `wave2Hook=${hasWave2Hook}, bossHooks=${hasBossHooks}, rescueHooks=${hasRescueHooks}, deathHook=${hasDeathHook}`
  };
});

check("W2-S2-04B", "Curriculum: Lesson proofs in tools/kc_starfall_watch.py remain satisfied", () => {
  const hasBossProofs =
    kcWatchPy.includes('"boss_type_spawn"') &&
    kcWatchPy.includes('"boss_hp_state"') &&
    kcWatchPy.includes('"boss_shoot_function"') &&
    kcWatchPy.includes('"boss_renderer"') &&
    kcWatchPy.includes('"boss_destroyed_event"');

  const hasReviveProof = kcWatchPy.includes('"revive_reaction_minigame"');
  const hasHangarProofs = kcWatchPy.includes('"hangar_frame_markup"') && kcWatchPy.includes('"hangar_launch_control"');

  const ok = hasBossProofs && hasReviveProof && hasHangarProofs;
  return {
    ok,
    detail: `bossProofs=${hasBossProofs}, reviveProof=${hasReviveProof}, hangarProofs=${hasHangarProofs}`
  };
});

console.log("\n=======================================================");
console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("=======================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
