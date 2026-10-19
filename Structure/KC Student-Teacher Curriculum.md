---
root-node: "[[Schematics/18-PROTOCOLS/Kopano Context Master Protocol Ledger And Sovereign Architecture]]"
inherits-mandate: "CRUD-only; KC sits above all agentic frameworks; 80% Optimal Threshold for Owner-Proof Gate"
title: KC Student-Teacher Curriculum
type: curriculum
project: Starfall Salvage
sub-brain: C:\Users\rkhol\Starfall Salvage
main-brain-link: "[[Schematics/06-Reference/kopano-code-implementation/.kc/context_store.json]]"
activated: 2026-05-05
authority:
  - Lovable-Primary Build Doctrine
  - Refusal Authority Protocol
  - KC Memory-Renter Doctrine
tags:
  - kc
  - curriculum
  - student-teacher
  - starfall-salvage
  - kopano-labs
---

# KC Student-Teacher Curriculum

> Activated 2026-05-05 by Master Robyn during the Kopano Labs Upgrade handoff.
> Authority: [[Lovable-Primary Build Doctrine]] + [[Refusal Authority Protocol]] + [[KC Memory-Renter Doctrine]].

KC is the **strict dev QA student**. Claude (acting as Senior Engineer for this lane) is the **teacher**. This file is the syllabus. KC does not get to skip lessons. KC does not get to mark work complete on vibes. KC reads this file every pass and audits Starfall Salvage against every proof below.

---

## Protocol Overview

1. **Teacher ships features.** Claude or Master Robyn lands code on `main`.
2. **Student audits.** KC runs `tools/kc_starfall_watch.py --once --seed-kc`. The watcher invokes `check_kopano_upgrade_features()` which holds every binary proof from Lesson 001 through the latest lesson in this file.
3. **Student fails loud.** Any missing proof → KC refuses the pass, logs the failure to `Structure/KC Review Log.jsonl`, and seeds the failure to the Main Brain context store at `Schematics/06-Reference/kopano-code-implementation/.kc/context_store.json`.
4. **Teacher patches.** Claude or Codex re-patches the source. No hand-waving — the proof string must literally appear in the indicated file.
5. **Student retries.** Loop until KC reports `kopano_upgrade_audit: ok`.
6. **Student graduates.** Pass logged with `kc_context_id` referencing the Main Brain record.

KC is not allowed to grade itself "passed" by lowering the bar. KC raises the bar by adding new proofs whenever the teacher ships new features.

---

## Lesson 001: The Kopano Labs Upgrade (2026-05-05)

**Spec:** Add haptic feedback, WhatsApp viral share, in-game Kasi-Comm chat lobby, and the Sovereign Tech CONTRIBUTING.md. Patch existing files only. Pass `node --check` and `py_compile`.

**Files in scope:** `index.html`, `styles.css`, `src/game.js`, `backend/starfall_server.py`, `CONTRIBUTING.md`, `Structure/Project Status.md`.

### Required Proofs (KC must literally find each string in the listed file)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 1 | `haptic_vibrate_present` | `src/game.js` | `navigator.vibrate` |
| 2 | `haptic_damage_pattern` | `src/game.js` | `[200, 100, 200]` |
| 3 | `haptic_gameover_pattern` | `src/game.js` | `[400, 120, 400, 120, 600]` |
| 4 | `whatsapp_share_url` | `src/game.js` | `api.whatsapp.com/send` |
| 5 | `whatsapp_share_domain_correct` | `src/game.js` | `starfallsalvage.kopanolabs.com` AND no `starfallsavage` |
| 6 | `share_button_markup` | `index.html` | `id="shareWhatsappButton"` |
| 7 | `kasi_comm_markup` | `index.html` | `id="kasiComm"` |
| 8 | `kasi_comm_form_markup` | `index.html` | `id="kasiCommForm"` |
| 9 | `chat_table_schema` | `backend/starfall_server.py` | `chat_messages` |
| 10 | `chat_get_route` | `backend/starfall_server.py` | `/api/chat` AND `handle_chat` |
| 11 | `chat_rate_limit` | `backend/starfall_server.py` | `Slow down, pilot` |
| 12 | `chat_polling_interval` | `src/game.js` | `CHAT_POLL_INTERVAL_MS` |
| 13 | `open_graph_tags` | `index.html` | `property="og:title"` AND `property="og:image"` |
| 14 | `twitter_card_tags` | `index.html` | `name="twitter:card"` |
| 15 | `contributing_bounty_doctrine` | `CONTRIBUTING.md` | `Sovereign Tech` AND `bounty` |
| 16 | `contributing_local_rails` | `CONTRIBUTING.md` | `Yoco` AND `PayFast` AND `EFT` |

If any proof is `false`, the audit FAILS. KC writes the failed proof name to the JSONL log and the Main Brain context store, marks `status=reviewed` with the retry instruction, and waits for the teacher's next patch.

### Validation Gates (still must pass)

- `node --check src/game.js`
- `python -m py_compile backend/starfall_server.py`
- `GET http://127.0.0.1:8765/api/health` → `{"ok": true}`

### Acceptance Criteria

- All 16 proofs `true`.
- Both syntax gates green.
- Backend health responds within 2.5s.
- `Structure/Project Status.md` lists the upgrade in `## Completed`.
- A new `kc_context_id` is seeded to the Main Brain context store.

---

## Lesson 002: The Spelling Sovereignty Rule

**Why:** Master Robyn confirmed via IONOS evidence on 2026-05-05 that the production subdomain is `starfallsalvage.kopanolabs.com`. The earlier directive used `starfallsavage` — a typo. KC must enforce that the brand is **Starfall Salvage**, never **Starfall Savage**, in any user-facing string.

**Audit:** Grep the codebase for `starfallsavage` (no `l`) — must be **zero matches** outside of historical log files. Same rule for the brand name itself: `Starfall Savage` is forbidden in shipped UI copy.

KC adds this as a `spelling_sovereignty` proof in the next curriculum revision. For Lesson 001 it's covered by proof #5.

---

## Lesson 003: Refusal Authority

KC operates under the Refusal Authority Protocol. KC may refuse a pass for any of these:

- Proof missing.
- Spelling drift detected.
- External CDN asset detected (`<script src="https://`, `<link href="https://`).
- Three.js, Babylon, Phaser, or any external game engine import.
- Secret or credential committed (look for `.env`, `key=`, `token=` in dirty files).
- Backend serves files outside the project root.

When KC refuses, it cites the rule and the specific file/line, then logs to both `Structure/KC Review Log.jsonl` and the Main Brain context store.

---

## Lesson 004: How KC Talks Back to the Teacher

KC's `teacher_review` field in the Main Brain record is the channel for the student to push back. KC does not chat in the interface; the steward writes KC's opinion into each record as `Save` or `Watch`.

```
Save — bounded file evidence; no external claim beyond repo.
Watch — <proof_key>: <retry_instruction>. Actual: <observed_value>
```

Example failure message KC would write:
```
Watch — chat_rate_limit: patch backend handle_chat with the 1.5s window and the "Slow down, pilot" string. Actual: rate-limit branch missing.
```

The teacher reads this, fixes the source, and triggers the next pass. No back-and-forth in chat — the audit log IS the handshake.

---

## Lesson 005: Mobile Sovereignty (PWA Foundation)

**Why:** KasiLink and the Kopano Labs ecosystem target a mobile-first South African audience. A WebGL game that can't be added to an Android home screen is shipping half a product. This lesson is the floor — Lesson 006 will add touch controls.

**Spec:** Add a PWA web manifest so Starfall Salvage is installable from Chrome on Android. No service worker yet (offline play is a future lesson). No external CDN dependencies — manifest sits inside the project.

**Files in scope:** `manifest.webmanifest` (new), `index.html`.

### Required Proofs (Lesson 005)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 17 | `pwa_manifest_file_present` | `manifest.webmanifest` | `"name": "Starfall Salvage"` |
| 18 | `pwa_manifest_linked` | `index.html` | `rel="manifest"` |
| 19 | `pwa_apple_touch_icon` | `index.html` | `rel="apple-touch-icon"` |
| 20 | `pwa_manifest_theme_color` | `manifest.webmanifest` | `"theme_color": "#07080e"` |
| 21 | `pwa_manifest_display_standalone` | `manifest.webmanifest` | `"display": "standalone"` |
| 22 | `pwa_manifest_lang_za` | `manifest.webmanifest` | `"lang": "en-ZA"` |

### Acceptance Criteria

- All 6 new proofs `true`.
- Lighthouse PWA installability passes when audited (manual owner check, not part of `node --check`).
- Manifest validates as JSON.

---

## Lesson 006: Comms, Social, Data Capture, Bounty Incentive (2026-05-06)

**Why:** Production deploy is live but the chat backend is not — frontend must still capture user value. The Sovereign Tech doctrine says "we pay our engineers"; this lesson makes that visible inside the game and gives anonymous users a low-friction path to submit upgrade ideas with a real bounty incentive.

**Spec:** Add Submit Idea (mailto), multi-platform social share row, localStorage event capture with diagnostic export, and reframe Kasi-Comm offline state as a bounty CTA.

**Files in scope:** `index.html`, `styles.css`, `src/game.js`.

### Required Proofs (Lesson 006)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 23 | `idea_button_markup` | `index.html` | `id="submitIdeaButton"` |
| 24 | `diagnostics_button_markup` | `index.html` | `id="exportDiagnosticsButton"` |
| 25 | `social_share_row_markup` | `index.html` | `id="shareRow"` AND all 4 `data-share` channels (twitter, facebook, linkedin, copy) |
| 26 | `bounty_email_constant` | `src/game.js` | `rkholofelo@kopanolabs.com` |
| 27 | `event_log_storage` | `src/game.js` | `EVENTS_STORAGE_KEY` AND `logEvent` |
| 28 | `diagnostics_exporter` | `src/game.js` | `exportDiagnostics` |
| 29 | `kasi_comm_offline_bounty_cta` | `src/game.js` | `Sovereign Tech bounty` |
| 30 | `incentive_panel_markup` | `index.html` | `kasi-comm-incentive` |
| 31 | `bounty_email_in_html` | `index.html` | `rkholofelo@kopanolabs.com` |

### Acceptance Criteria

- All 9 new proofs `true` (total: 31 proofs across 3 lessons).
- `node --check src/game.js` and `python -m py_compile backend/starfall_server.py` both green.
- Vercel auto-deploys the new build; production URL serves `?v=20260506-comms` cache-bust.

---

## Lesson 007: Mobile Functionality (Touch Input + Tap Controls)

**Why:** Owner-proof negative — Master reported "the game is frozen on Mobile" on 2026-05-06 against the Lesson 006 build. Diagnosis: keyboard-only input pipeline (`window.keydown`) gives no movement vector on mobile, so the ship sat still while the lane scrolled it into debris. KasiLink users are mobile-first; this lesson is non-negotiable for production fitness.

**Spec:** Add native touch input on the WebGL canvas — virtual joystick from first-touch anchor with deadzone + normalized magnitude, tap-to-start when not playing, tap-to-dash mid-flight. Prevent browser scroll/zoom on canvas. No external libraries.

**Files in scope:** `src/game.js`, `styles.css`, `index.html`.

### Required Proofs (Lesson 007)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 32 | `touch_axis_state` | `src/game.js` | `touchAxis` AND `activeTouchId` |
| 33 | `touch_capable_detect` | `src/game.js` | `isTouchCapable` |
| 34 | `touch_start_handler` | `src/game.js` | `canvas.addEventListener("touchstart"` |
| 35 | `touch_move_handler` | `src/game.js` | `canvas.addEventListener("touchmove"` |
| 36 | `touch_end_handler` | `src/game.js` | `canvas.addEventListener("touchend"` |
| 37 | `tap_to_start_or_dash` | `src/game.js` | `wasTap` AND `dashRequested = true` |
| 38 | `touch_axis_in_movement` | `src/game.js` | `moveX += touchAxis.x` |
| 39 | `touch_action_none_css` | `styles.css` | `touch-action: none` |
| 40 | `mobile_control_hint_html` | `index.html` | `Mobile:` AND `tap to start` |

### Acceptance Criteria

- All 9 new proofs `true` (running total: 40 proofs across 4 lessons).
- `node --check src/game.js` passes.
- Live URL serves `?v=20260506-mobile` cache-bust.
- **Owner-proof gate:** Master physically loads the game on a mobile device, drags to fly, taps to dash, and confirms the ship responds. Until that happens, this lesson stays in `submitted` state in the KC store, not `reviewed`.

---

## Lesson 008: Onboarding Pop-up (2026-05-06)

**Why:** Players need instructions without getting trapped before flight. The briefing must explain controls, persist when accepted, and never block the Start/Fly path on mobile.

**Spec:** Center-screen modal lists desktop + mobile + scoring + danger-zone + shoot rules. Fly must remain reachable on a clean browser; if the briefing opens from Fly, Continue starts the run. Persisted to localStorage so returning visitors are not interrupted.

**Files in scope:** `index.html`, `styles.css`, `src/game.js`.

### Required Proofs (Lesson 008)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 41 | `onboarding_modal_markup` | `index.html` | `id="onboardingModal"` AND `id="onboardingAck"` AND `id="onboardingContinueButton"` |
| 42 | `onboarding_storage_key` | `src/game.js` | `ONBOARDING_STORAGE_KEY` |
| 43 | `onboarding_fly_gate_clearable` | `src/game.js` | `onboardingPendingStart` AND `onboardingSessionCleared` |
| 44 | `onboarding_css_modal` | `styles.css` | `.onboarding-modal` AND `.onboarding-card` |

---

## Lesson 009: Speed-Triggered Background Shift (2026-05-06)

**Why:** Visual signal that the run has escalated. Master tied this to the boss-spawn threshold.

**Spec:** When `speedMultiplier` crosses `2.0`, fire `danger_zone_entered` event and lerp WebGL clearColor from calm `(0.005, 0.007, 0.016)` to danger `(0.16, 0.02, 0.04)` proportional to multiplier in `[2.0, 3.0]`. Speed cap raised from 34 to 50 so 2.0x is reachable.

### Required Proofs (Lesson 009)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 45 | `danger_zone_threshold` | `src/game.js` | `speedMultiplier >= 2` |
| 46 | `danger_color_lerp` | `src/game.js` | `dangerLerp` |
| 47 | `danger_event_logged` | `src/game.js` | `"danger_zone_entered"` |

---

## Lesson 010: Player Shooting (2026-05-06)

**Why:** Master directive — give the pilot a way to destroy debris and bosses, not just dodge them.

**Spec:** F key (desktop) and `#mobileFireButton` (mobile) call `spawnPlayerBullet()`. Bullets are stored in the existing sparks array with `kind: "bullet"` and `team: "player"`, vz=-64, lifespan 1.6s. Cooldown `state.bulletCooldown = 0.18s`. Collision against `objects[]` destroys debris (+60 score) and damages bosses.

### Required Proofs (Lesson 010)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 48 | `player_bullet_spawn` | `src/game.js` | `spawnPlayerBullet` |
| 49 | `player_bullet_cooldown` | `src/game.js` | `state.bulletCooldown` |
| 50 | `f_key_fire` | `src/game.js` | `"f"` AND `spawnPlayerBullet()` |
| 51 | `bullet_collides_debris` | `src/game.js` | `"debris_destroyed"` |

---

## Lesson 011: Boss Spawn + Shoot-Back (2026-05-06)

**Why:** Master directive — color shift introduces bosses; bosses can shoot back; same trigger as color shift (2.0x).

**Spec:** `spawnObject()` checks `state.dangerZoneActive`; if true, ~7% of spawns become bosses (size 1.7-2.1, hp 4, slower z velocity, magenta color, pulsing). Boss AI runs a `bossShootTimer`; on fire, `spawnBossBullet()` aims at the player's current position with speed 26. Boss bullets collide with player (-1 hull unless dashing). Boss takes -1 hp per player bullet hit; on hp <= 0, boss is destroyed (+320 score).

### Required Proofs (Lesson 011)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 52 | `boss_type_spawn` | `src/game.js` | `type: "boss"` (in spawn) |
| 53 | `boss_hp_state` | `src/game.js` | `object.hp` AND `maxHp` |
| 54 | `boss_shoot_function` | `src/game.js` | `spawnBossBullet` |
| 55 | `boss_renderer` | `src/game.js` | `object.type === "boss"` |
| 56 | `boss_destroyed_event` | `src/game.js` | `"boss_destroyed"` |

---

## Lesson 012: Mobile FIRE Button (2026-05-06)

**Why:** Mobile pilots can't press F. Tap-to-dash already uses canvas tap, so a dedicated FIRE button is needed.

**Spec:** Circular `#mobileFireButton` bottom-right, 84x84px, red glow, hidden by default. Revealed when `isTouchCapable` is true. `touchstart` (passive: false) and `click` both call `spawnPlayerBullet()`. CSS `touch-action: manipulation` to suppress double-tap zoom delay.

### Required Proofs (Lesson 012)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 57 | `mobile_fire_button_markup` | `index.html` | `id="mobileFireButton"` |
| 58 | `mobile_fire_button_css` | `styles.css` | `.mobile-fire-button` |
| 59 | `mobile_fire_button_handler` | `src/game.js` | `mobileFireButton` AND `spawnPlayerBullet()` |

---

## Lesson 013: Protocol 13 Kinetics + KC Sightline Parallax (2026-05-16)

**Why:** Master directed Righteous Severance — runner must feel like a treadmill (world streams +Z), not a spreadsheet; DOM must stay off the canvas during play; danger must eat the horizon (fog + geometry), not just flat tint.

**Spec:** Document treadmill in sim tick; `uFogMix` scales with `dangerLerp`; pause uses `MODAL_TRAP.sovereignPause` for hardware Back; `#playingMinimalHud` stays the minimal score strip; touch glide uses `POSITION_LERP_TOUCH`; tunnel draws a **secondary rib layer** at a different Z scroll rate (`// Parallax ribs:`) so the center sightline breaks up without moving the ship off the treadmill contract.

### Required Proofs (Lesson 013)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 60 | `treadmill_architecture_note` | `src/game.js` | `Treadmill: ship Z stays fixed` |
| 61 | `danger_scaled_fog_uniform` | `src/game.js` | `uFogMix` |
| 62 | `sovereign_pause_history_trap` | `src/game.js` | `sovereignPause` |
| 63 | `minimal_playing_hud_dom` | `index.html` | `id="playingMinimalHud"` |
| 64 | `touch_lerp_constant` | `src/game.js` | `POSITION_LERP_TOUCH` |
| 65 | `tunnel_parallax_ribs` | `src/game.js` | `// Parallax ribs:` |

### Acceptance Criteria

- All 6 new proofs `true` (running total: 65 proofs across Lessons 001–013).
- `npm run gate` (or `node --check src/game.js` + KC audit) passes.
- Tunnel rib pass does not regress `node --check`.

---

## Lesson 014: Post-revive relaunch gate + onboarding persistence (2026-05-16)

**Why:** Pilots need a clear **3-second relaunch runway** after a successful revive mini-game, plus control over whether the pilot briefing appears again (without a separate instruction box).

**Spec:** After revive success, enter `relaunch` mode for `RELAUNCH_COUNTDOWN_SECONDS` (3) with `#relaunchHud` + `tickRelaunch`; then resume `playing`. Onboarding adds `#onboardingNeverAgain` (persist skip) and **Pilot Access** exposes `#reviewBriefingButton` to reopen the briefing.


### Required Proofs (Lesson 014)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 66 | `relaunch_countdown_constant` | `src/game.js` | `RELAUNCH_COUNTDOWN_SECONDS` |
| 67 | `relaunch_tick_handler` | `src/game.js` | `tickRelaunch` |
| 68 | `onboarding_never_again_markup` | `index.html` | `id="onboardingNeverAgain"` |
| 69 | `review_briefing_button` | `index.html` | `id="reviewBriefingButton"` |

### Acceptance Criteria

- All 4 new proofs `true` (running total: **69 proofs** across Lessons 001–014).
- `npm run gate` passes; KC `kopano_upgrade_audit` reports `ok`.

---

## Lesson 015: Multitasking Flight Menu + Weapon Mode Orchestration (2026-05-16)

**Why:** Pilots need drop-in / step-out multitasking and three weapon calibres without leaving the sovereign lane.

**Spec:** `#flightMenuToggle` + panel; pause keeps minimal HUD + sovereign scrim; `STARFLIGHT_WEAPON_STORAGE_KEY`; bolt / scatter / pierce in `spawnPlayerBullet`.

### Required Proofs (Lesson 015)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 70 | `flight_menu_pause_sync` | `src/game.js` | `mode === "paused" && !blockMenu` |
| 71 | `playing_hud_pause_visible` | `src/game.js` | `playHud.hidden = false` |
| 72 | `weapon_mode_bolt_scatter_pierce` | `src/game.js` | `STARFLIGHT_WEAPON_STORAGE_KEY` AND `setWeaponMode` |
| 73 | `touch_range_performance_opt` | `src/game.js` | `TOUCH_FULL_RANGE_PX` |
| 74 | `pause_minimal_toggle_hardened` | `src/game.js` | `state.mode === "playing" \|\| state.mode === "paused"` |
| 75 | `maintainer_map_present` | `docs/MAINTAINER-MAP.md` | `docs/MAO-Starfall-Lane.md` |
| 76 | `optional_playwright_script` | `package.json` | `mobile:stress:pw` |
| 77 | `keyboard_map_doc` | `docs/KEYBOARD-MAP.md` | `flightMenuToggle` |
| 78 | `hot_path_audit_script` | `tools/` | `hot_path_audit.py` exists |

### Acceptance Criteria

- All 9 new proofs `true` (running total: **78 proofs** across Lessons 001–015).
- `npm run gate` passes.

---

## Lesson 016: MAO Blackbox + Kopano Context Governance (2026-05-16)

**Why:** Breaking Point lane requires auditable BB-C5/C9/C12 rows, Identic Flow Bridge, ZAR ledger, and in-repo Kopano Context (`@kopano/context`) — not narrative-only “done.”

**Spec:** `docs/MAO-Starfall-Lane.md` holds Blackbox + SF-STRESS-01 + Identic + ZAR; `packages/kopano-context` ships Immutable Law + Ephemeral State Broker; `npm run gate` runs `context:typecheck`; `tools/kopano_context_smoke.mjs` proves broker path.

### Required Proofs (Lesson 016)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 79 | `mao_sf_stress_incident` | `docs/MAO-Starfall-Lane.md` | `SF-STRESS-01` |
| 80 | `mao_bb_rows` | `docs/MAO-Starfall-Lane.md` | `BB-C5` AND `BB-C9` AND `BB-C12` |
| 81 | `mao_identic_bridge` | `docs/MAO-Starfall-Lane.md` | `Identic Flow Bridge` |
| 82 | `mao_zar_ledger` | `docs/MAO-Starfall-Lane.md` | `ZAR ledger stub` |
| 83 | `kopano_context_commandments` | `packages/kopano-context/.../commandments_1_to_15.ts` | `validateExecution` |
| 84 | `kopano_state_broker` | `packages/kopano-context/.../ephemeral_state_broker.ts` | `class StateBroker` |
| 85 | `kopano_swarm_validator` | `packages/kopano-context/.../ephemeral_state_broker.ts` | `SwarmValidator` |
| 86 | `context_smoke_tool` | `tools/` | `kopano_context_smoke.mjs` exists |
| 87 | `gate_includes_context_typecheck` | `package.json` | `context:typecheck` in `gate` script |
| 88 | `m_ready_hides_play_hud` | `styles.css` | `.shell.is-ready .playing-minimal-hud` |

### Acceptance Criteria

- All 10 new proofs `true` (running total: **88 proofs** across Lessons 001–016).
- `npm run gate` and `npm run context:smoke` exit 0.
- SF-STRESS-01 intake table present; operator fills before BB-C9 can PASS.

---

## Lesson 017: Orbital Wreck Lane Visual Identity (2026-05-18)

**Why:** Owner reset confirmed the game was functional but not visually competitive. KC must stop accepting a flat tunnel as "done" when the directive is a space salvage runner through a township-built orbital wreck lane.

**Spec:** Keep one PC/mobile ruleset. Add visual evidence inside the WebGL world: parallax space, planet/nebula backdrop, salvage corridor identity, wreck silhouettes, glowing salvage cores, and camera banking/drift.

**Files in scope:** `src/game.js`, `index.html`, `src/pwa-boot.js`, `service-worker.js`, `Structure/2026-05-18 - Orbital Wreck Lane Visual Slice Case Study.md`.

### Required Proofs (Lesson 017)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 89 | `orbital_build_marker` | `Structure/2026-05-18 - Orbital Wreck Lane Visual Slice Case Study.md` | `20260515-orbital-wreck-lane` |
| 90 | `camera_bank_state` | `src/game.js` | `cameraRoll` AND `BANK_MAX` |
| 91 | `corridor_pose_transform` | `src/game.js` | `corridorPose` AND `corridorPoint` |
| 92 | `parallax_star_layers` | `src/game.js` | `starLayers` AND `createStarLayer` |
| 93 | `planet_nebula_backdrop` | `src/game.js` | `nebulaTexture` AND `planetTexture` |
| 94 | `salvage_dressing_world` | `src/game.js` | `salvageDressing` AND `renderSalvageDressing` |
| 95 | `cache_bust_aligned` | `index.html` | current build marker |
| 96 | `pwa_boot_aligned` | `src/pwa-boot.js` | current build marker |
| 97 | `pwa_cache_aligned` | `service-worker.js` | current build marker |
| 98 | `visual_slice_case_study` | `Structure/2026-05-18 - Orbital Wreck Lane Visual Slice Case Study.md` | `Save / Kill / Watch` |

### Acceptance Criteria

- `node --check .\src\game.js` passes.
- `npm run vault:check` passes.
- `git diff --check` passes.
- Browser proof report passes with failures `[]` for Redmi 393x873, narrow 360x800, and desktop 1280x720.
- Screenshot must show space, salvage, lane identity, danger, and readable mobile playfield. If it still looks like a flat tunnel, KC refuses the pass.

---

## Lesson 018: Movement Control Unstuck (2026-05-19)

**Why:** Field report said the game was static and players could not move. The UI promised drag-to-move, but pointer/mouse drag was not steering the ship and mobile touch was too dependent on starting exactly on the canvas.

**Spec:** Keep one PC/mobile ruleset. Add unified pointer steering on the flight deck, preserve keyboard and FIRE controls, prevent UI controls from losing focus to the canvas, and bump the cache/build marker so stale service-worker assets cannot keep serving the broken control path.

**Files in scope:** `src/game.js`, `index.html`, `src/pwa-boot.js`, `service-worker.js`, `tools/kc_starfall_watch.py`, `Structure/2026-05-19 - Movement Control Fix Case Study.md`.

### Required Proofs (Lesson 018)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 99 | `movement_build_marker` | `src/game.js` | `20260523-screen-fill-frame` |
| 100 | `pointer_steer_support` | `src/game.js` | `supportsPointerEvents` AND `hud.shell.addEventListener("pointerdown"` |
| 101 | `flight_deck_drag_copy` | `src/game.js`, `index.html` | `Drag anywhere on the flight deck` AND `Drag the flight deck` |
| 102 | `debug_movement_probe` | `src/game.js` | `__starfallDebug` |
| 103 | `pointer_focus_guard` | `src/game.js` | `window.addEventListener("pointerdown", (event)` AND `!isGameInputBlocked(event.target)` |
| 104 | `movement_case_study` | `Structure/2026-05-19 - Movement Control Fix Case Study.md` | `Save / Kill / Watch` |

### Acceptance Criteria

- `node --check .\src\game.js` passes.
- `npm run vault:check` passes.
- `git diff --check` passes.
- Browser movement proof passes keyboard, desktop mouse drag, Redmi 393 touch drag, and narrow 360 touch drag with failures `[]`.
- Proof must include numeric player movement, not only screenshots.

---

## Lesson 019: Mobile-Primary Realism Doctrine (2026-05-25)

**Why:** The product is distributed through WhatsApp and consumed predominantly on phones. KC and Cassy must stop accepting visual work that treats aesthetics as supreme while leaving mobile reality as a secondary concern.

**Spec:** Make the doctrine explicit in repo-local law: `mobile-primary, device-complete, realism-first`. Bind it to Cassy's apprenticeship lane, the MAO execution lane, and the operator map so future playfield changes are judged against reality rather than taste.

**Files in scope:** `docs/REALISM-RUBRIC.md`, `docs/MAO-Starfall-Lane.md`, `docs/MAINTAINER-MAP.md`, `Structure/05-Training/Cassy Apprenticeship Register.md`, `Structure/06-Reference/Starfall Agent Mesh.md`, `Structure/Starfall Salvage - Index.md`.

### Required Proofs (Lesson 019)

| # | Proof Key | File | Search String |
|---|-----------|------|---------------|
| 105 | `realism_rubric_present` | `docs/REALISM-RUBRIC.md` | `mobile-primary, device-complete, realism-first` |
| 106 | `realism_rubric_whatsapp_distribution` | `docs/REALISM-RUBRIC.md` | `WhatsApp -> mobile browser` |
| 107 | `mao_reality_gate` | `docs/MAO-Starfall-Lane.md` | `## Reality gate` |
| 108 | `cassy_realism_apprenticeship` | `Structure/05-Training/Cassy Apprenticeship Register.md` | `Cassy studies realism-first product judgment` |
| 109 | `agent_mesh_realism_lane` | `Structure/06-Reference/Starfall Agent Mesh.md` | `mobile-primary realism judgment` |
| 110 | `starfall_index_spacefield_truth` | `Structure/Starfall Salvage - Index.md` | `20260525-fullscreen-presence` |

### Acceptance Criteria

- All 6 new proofs `true` (running total: **116 proofs** across Lessons 001-019 in the KC watcher).
- `npm run kc:audit` passes.
- Cassy remains explicitly in student status while still carrying the realism doctrine as a live learning rule.

---

## Maintenance

- Every shipped feature spec adds a new lesson and at least one new proof key.
- Old lessons stay in this file as a regression curriculum — KC keeps auditing every proof from every lesson, forever.
- Master Robyn or the Senior Engineer updates this file before the feature merges. Editing this file *after* a merge is allowed only to add new lessons, never to soften existing proofs.

— Teacher: Claude (Senior Engineer, Starfall lane)
— Student: KC (Kopano Context strict dev QA)
— Authority: Master Robyn / Kopano Labs
