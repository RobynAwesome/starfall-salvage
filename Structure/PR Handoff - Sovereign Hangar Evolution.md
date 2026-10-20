---
title: PR Handoff - Sovereign Hangar & Full-Viewport Gameplay Evolution
created: 2026-10-20
reconciled: 2026-10-20
branch: feat/sovereign-hangar-evolution
base: 6f260753967be29a6836c98e0b8759e417bc5fd6 (reconciled on current upstream main)
tip: current-head
build: 20261020-sovereign-hangar-mki
status: ready-for-owner-review
---

# PR Handoff (Owner / Chief Architect)

**Branch:** `feat/sovereign-hangar-evolution`  
**Reconciled Base:** `6f260753967be29a6836c98e0b8759e417bc5fd6` (preserving all 23 upstream main commits: Turbo overrides, Dependabot updates, Screen Fill Frame Pass, APWA documentation)  
**Backup Ref:** `backup/feat-sovereign-hangar-evolution-pre-rebase` (preserved before rebase)  
**Build Marker:** `20261020-sovereign-hangar-mki`  
**KC Audit:** `kc-87` PASS (7/7 checks, 116/116 proofs + Lesson 020 curriculum); see `Structure/KC Review Log.jsonl`  
**Open PR:** https://github.com/RobynAwesome/starfall-salvage/pull/new/feat/sovereign-hangar-evolution  

> **STRICT PROHIBITION:** Do not merge to `main` or deploy to production without explicit owner approval.

---

## Suggested PR Title

`feat(evolution): Sovereign Hangar root landing, MK-I playable ship, and responsive full-viewport framing`

---

## Suggested PR Body

### Summary

1. **Reconciliation with Upstream `main` (`6f26075`)**:
   - Rebased cleanly onto latest `origin/main` (`6f26075`), preserving all 23 recent commits including turbo dependency overrides, Dependabot bumps, and the upstream Screen Fill Frame Pass.
   - Zero semantic conflicts; all append-only logs and governance trails maintained.

2. **Sovereign Hangar at Root URL (`/`)**:
   - Replaced the nearly blank ready screen at `/` with the interactive 3D **Sovereign Hangar** exhibition on an edge-to-edge pedestal inside `<iframe id="hangarFrame">`.
   - Maintained canonical launch pathway: **LAUNCH FLIGHT → Onboarding Briefing (`#onboardingModal`) → 3-2-1 Countdown (`#countdownOverlay`) → Flight Runner (`is-playing`)**.
   - Added accessible fallback button **PLAY WITHOUT HANGAR** (`#btn-fallback-launch`) ensuring flight is always accessible even if 3D WebGL fails in the iframe.
   - Lifecycle isolation: Three.js render loop halts and cancels animation frame requests (`cancelAnimationFrame`) the moment gameplay engages, eliminating Three.js animation frame execution during flight (pending physical hardware CPU/GPU profiling).

3. **MK-I Spacecraft in Playable Raw WebGL (158-tri vs 728-tri Architecture)**:
   - Implemented dual-fidelity MK-I support:
     - **728-triangle full-fidelity craft** (`meshes.shipMk1Full`): 6 material groups (graphite hull, dark engine casing, canopy armor, titanium edges, mint conduits, and dual ion thruster glow).
     - **158-triangle faceted craft** (`meshes.shipMk1`): synchronous zero-dependency low-poly mesh for minimal draw calls or constrained hardware.
   - Scaled with factor $S=0.44$ to match original player collision radius ($r=0.62$), preserving 100% of player movement, input, collision detection, and weapon mechanics.
   - Supports craft selection via Hangar, URL parameter (`?ship=mk1`, `?ship=mk1-158`, `?ship=original`), and `localStorage` (`starfallSelectedShip`).

4. **Full-Viewport Camera & Responsive Mobile Rotation**:
   - Dynamic aspect-ratio camera profiles (`getFrameProfile` in `src/game.js`):
     - Tall mobile portrait (`aspect < 0.52`, e.g. Redmi 13 `393x873`): `fovScale: 0.74, viewBiasY: 0.08, cameraDepth: -2.75`.
     - Mobile landscape (`aspect > 1.2`, e.g. Redmi 13 `873x393`): `fovScale: 0.82, viewBiasY: -0.04, cameraDepth: -2.55`.
     - Desktop 16:9 (`aspect > 1.35`) and ultrawide (`aspect > 1.85`).
   - Seamless live orientation change handling mid-flight without reload, pause, or forced orientation lock.

5. **Defect F-1 Resolution & Automated Regression Gate**:
   - Fixed pre-existing issue where dismissed discovery survey remained in hit-testing tree: added `display: none !important;` and `pointer-events: none !important;` to `.survey-modal.is-hidden` and all child elements in `styles.css`.
   - Created reproducible automated regression test `tools/test_survey_hit_test_regression.mjs` passing 7/7 checks, integrated into `npm run gate`.

6. **Tooling Portability, Checksums, and Service Worker Offline Cache**:
   - Ported `hangar-build/build.mjs` to work dynamically on Windows/Linux across Node v24 and Bun 1.4 (`npm run hangar:build` runs in <250ms).
   - Reconciled artifact digests in `hangar/evidence/VERIFIED_ARTIFACT_CHECKSUMS.json`.
   - Updated `service-worker.js` precache list (`ASSETS`) with hangar bundle and MK-I triangle JSON (12 total assets cached for offline PWA operation).

7. **Resolution of 5 Chief Architect Review Findings**:
   - **Finding 1 (P0: Duplicate launch messages)**: Eliminated duplicate launch event listeners; defined canonical schema `{ type: 'starfall_launch_flight', ship, source, timestamp }`; verified exactly 1 launch message emitted per click.
   - **Finding 2 (P0: Hangar lifecycle)**: Implemented explicit RAF cancellation (`cancelAnimationFrame`) on pause, single-loop resumption via `isLoopRunning` guards, exposed `window.__hangar.lifecycle` instrumentation, and removed unproven idle overhead claims until measured on hardware.
   - **Finding 3 (P0: Service-worker navigation)**: Added route-aware caching in `service-worker.js` distinguishing `/hangar/index.html` from `/`, added `ignoreSearch: true` for precache hits, and verified offline loading of both `/` and `/hangar/index.html` in Microsoft Edge.
   - **Finding 4 (P1: Messaging trust)**: Replaced wildcard target origins with `getTargetOrigin()`, validated `event.origin` and `event.source === hf.contentWindow`, validated `ALLOWED_SHIPS`, shielded URL overrides against background iframe messages, and preserved standalone hangar fallback.
   - **Finding 5 (P1: Build identity)**: Synchronized build marker `20261020-sovereign-hangar-mki` across `GAME_BUILD`, `src/pwa-boot.js`, `service-worker.js`, `index.html`, `hangar/index.html`, and `tools/kc_starfall_watch.py`.

---

## Test Evidence & Verification Receipts

| Test Suite / Gate | Command | Result | Details |
|---|---|---|---|
| **JavaScript Syntax** | `node --check src/game.js` | **PASS** | 0 parser errors |
| **Backend Syntax** | `python -m py_compile backend/starfall_server.py` | **PASS** | 0 syntax errors |
| **Hangar Bundle Syntax** | `node --check hangar/app.bundle.js` | **PASS** | 0 syntax errors |
| **Portable Hangar Build** | `npm run hangar:build` | **PASS** | `1290284` bytes generated in 185ms |
| **Survey Hit-Test Regression** | `npm run test:survey` | **PASS** | **7 / 7** checks green |
| **Hangar Findings Regression** | `npm run test:hangar` | **PASS** | **27 / 27** mechanical checks green |
| **Hot Path Audit** | `python tools/hot_path_audit.py` | **PASS** | `no_three_dependency: true`, score 100% |
| **Kopano Context Typecheck** | `npm run context:typecheck` | **PASS** | TypeScript compilation green via Bun |
| **KC Static Audit** | `python tools/kc_starfall_watch.py --once --skip-backend` | **PASS** | 7/7 checks, 116 proofs green |
| **Full Repository Gate** | `npm run gate` | **PASS** | All automated sub-gates passed |
| **API Test Suite** | `python -m unittest discover -s apps/api` | **PASS** | 10/10 tests OK in 0.482s |
| **Edge CDP Regression Suite** | `node tools/edge_browser_regression_campaign.mjs` | **PASS** | **20 / 20** tests green on Microsoft Edge (Edg/156) |
| └─ *Test 1: Cold Desktop Landing* | Edge CDP | **PASS** | Hangar iframe at `/`, single RAF chain, 1 launch msg/click |
| └─ *Test 2: Gameplay Lifecycle* | Edge CDP | **PASS** | Onboarding modal, 3-2-1 countdown, 5 weapons, pause/resume, fly again |
| └─ *Test 3: MK-I Selection Sync* | Edge CDP | **PASS** | Swap craft showcase, `?ship=mk1-158`, `?ship=original` |
| └─ *Test 4: Mobile & Mid-Flight Rotations*| Edge CDP | **PASS** | Portrait 393x873 framing, 10 live mid-flight rotations |
| └─ *Test 5: 10 Hangar-Flight Transitions* | Edge CDP | **PASS** | Strictly 1 active loop chain, 0 WebGL leaks, 2 total canvases |
| └─ *Test 6: SW Offline Navigation* | Edge CDP | **PASS** | Active cache precache 11+ assets, offline `/` and `/hangar/index.html` |
| └─ *Test 7: Redmi 13 Telemetry* | Edge CDP | **PASS** | p50=16.67ms, p95=16.90ms, p99=17.20ms, Heap=28MB |

---

## Save / Kill / Watch

| Verdict | Item | Rationale |
|---------|------|-----------|
| **SAVE** | Sovereign Hangar root landing, MK-I raw WebGL player mesh (728-tri & 158-tri), full-viewport camera profiles, portable build tooling, survey hit-testing regression guard, offline SW caching. | Delivers the requested evolution without regressing mobile performance or 60fps budget. |
| **KILL** | Blank "Tap to fly" ready screen; invisible survey hit interception; separate Next.js preview app confusion; competing Three.js loop during flight. | Eliminates UX blockers and ensures clean architectural separation. |
| **WATCH** | Physical Redmi 13 on-device telemetry post-deploy; owner review before merge. | Validates real physical device feel and touch latency once deployed. |
