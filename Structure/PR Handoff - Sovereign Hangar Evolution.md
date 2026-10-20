---
title: PR Handoff - Sovereign Hangar & Full-Viewport Gameplay Evolution
created: 2026-10-20
branch: feat/sovereign-hangar-evolution
tip: current-head
build: 20261020-sovereign-hangar-mki
status: ready-for-owner-review
---

# PR Handoff (Owner / Chief Architect)

**Branch:** `feat/sovereign-hangar-evolution`  
**Base:** `13a22d7` (derived from canonical `fc01b64`)  
**Build:** `20261020-sovereign-hangar-mki` (Sovereign Hangar at root + MK-I WebGL integration + full viewport framing + survey hit-testing fix)  
**KC audit:** `kc-86` PASS (7/7 checks, 116/116 proofs + Lesson 020 curriculum); see `Structure/KC Review Log.jsonl`  
**Open PR:** https://github.com/RobynAwesome/starfall-salvage/pull/new/feat/sovereign-hangar-evolution  

> **STRICT PROHIBITION:** Do not merge to `main` or deploy to production without explicit owner approval.

---

## Suggested PR Title

`feat(evolution): Sovereign Hangar root landing, MK-I playable ship, and responsive full-viewport framing`

---

## Suggested PR Body

### Summary

1. **Sovereign Hangar at Root URL (`/`)**:
   - Replaced the nearly blank "Tap to fly" ready screen with the full 3D interactive Sovereign Hangar exhibition on an edge-to-edge glowing pedestal.
   - Preserved the canonical launch pathway: **LAUNCH FLIGHT → Onboarding Briefing (`#onboardingModal`) → 3-2-1 Countdown (`#countdownOverlay`) → Flight Runner (`is-playing`)**.
   - Two-way communication bridge (`starfall_launch_flight`, `starfall_ship_selected`, `starfall_pause_hangar`, `starfall_resume_hangar`).
   - Isolated Three.js render loop: suspended immediately upon flight launch (`window.__hangarPaused = true`), dropping Three.js GPU/CPU overhead to 0% during gameplay.

2. **MK-I Spacecraft in Playable Raw WebGL**:
   - Ported 158-triangle faceted MK-I geometry into `src/game.js` (`createShipMk1Mesh`) matching fuselage rings, canopy armor, swept delta wings, twin ion nacelles, and ventral conduits.
   - Scaled with factor $S=0.44$ to exactly match original collision radius ($r=0.62$), preserving 100% of player movement, input, collision detection, and weapon mechanics.
   - Synchronized player craft selection between Hangar, URL parameter (`?ship=mk1`), and `localStorage`.

3. **Full-Viewport Camera & Responsive Mobile Rotation**:
   - Dynamic aspect-ratio camera profiles (`getFrameProfile`):
     - Tall mobile portrait (`aspect < 0.52`, e.g. Redmi 13 `393x873`): `fovScale: 0.74, viewBiasY: 0.08, cameraDepth: -2.75`.
     - Mobile landscape (`aspect > 1.2`, e.g. Redmi 13 `873x393`): `fovScale: 0.82, viewBiasY: -0.04, cameraDepth: -2.55`.
     - Ultrawide (`aspect > 1.85`) and desktop 16:9 (`aspect > 1.35`).
   - Seamless live orientation change handling mid-flight without reload, pause, or forced orientation lock.

4. **Defect F-1 Resolution & Automated Regression Gate**:
   - Fixed pre-existing issue where dismissed discovery survey remained in hit-testing tree: added `display: none !important;` and `pointer-events: none !important;` to `.survey-modal.is-hidden` and all children.
   - Added `tools/test_survey_hit_test_regression.mjs` verifying 7/7 structural checks, integrated into `npm run gate`.

5. **Tooling Portability & Checksum Integrity**:
   - Ported `hangar-build/build.mjs` to work dynamically on Windows/Linux across Node v24 and Bun 1.4.
   - Added `npm run hangar:build` reproducing `hangar/app.bundle.js` in <250ms.
   - Added `hangar/evidence/VERIFIED_ARTIFACT_CHECKSUMS.json` reconciling circular MANIFEST digests.

---

## Test Evidence & Verification Receipts

| Test Suite / Gate | Command | Result |
|---|---|---|
| JavaScript Syntax | `node --check src/game.js` | PASS (0 errors) |
| Backend Syntax | `python -m py_compile backend/starfall_server.py` | PASS (0 errors) |
| Hangar Bundle Syntax | `node --check hangar/app.bundle.js` | PASS (0 errors) |
| Portable Hangar Build | `npm run hangar:build` | PASS (1290284 bytes in 185ms) |
| Survey Hit-Test Regression | `npm run test:survey` | PASS (7/7 checks) |
| Hot Path Audit | `python tools/hot_path_audit.py` | PASS (`no_three_dependency: true`, score 100%) |
| KC Static Audit | `python tools/kc_starfall_watch.py --once --skip-backend` | PASS (7/7 checks, 116/116 proofs) |
| API Test Suite | `python -m unittest discover -s apps/api` | PASS (10/10 tests OK) |
| KC Watcher + Backend | `python tools/kc_starfall_watch.py --once --seed-kc` | PASS (`kc-86` recorded) |
| Live Edge Automation (CDP) | Microsoft Edge 156.0.0.0 | Verified desktop hangar, mobile portrait, and live rotation |

---

## Save / Kill / Watch

| Verdict | Item |
|---------|------|
| **SAVE** | Sovereign Hangar root landing, MK-I raw WebGL player mesh, full-viewport camera profiles, portable build tooling, survey hit-testing regression guard. |
| **KILL** | Blank "Tap to fly" ready screen; invisible survey hit interception; separate Next.js preview confusion; competing Three.js loop during flight. |
| **WATCH** | Physical Redmi 13 on-device telemetry post-deploy; owner review before merge. |
