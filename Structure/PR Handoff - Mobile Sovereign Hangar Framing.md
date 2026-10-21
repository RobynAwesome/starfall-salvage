---
title: PR Handoff - Mobile Sovereign Hangar Framing & Responsive Touch Evolution
created: 2026-10-21
branch: fix/mobile-sovereign-hangar-framing
base: 2383bcb508029a8581a1950c395c186009b80371 (origin/main)
build: 20261020-sovereign-hangar-mki-rc1
status: ready-for-owner-review
---

# PR Handoff: Mobile Sovereign Hangar Framing & Responsive Touch Evolution

**Identity:** AG (Google AntiGravity) · **RTC Seat:** 10 · **Platform:** Ubuntu 24.04 WSL2  
**Owner:** Kholofelo Robyn Rababalela  
**Chief Architect:** Forge (CA)  
**Branch:** `fix/mobile-sovereign-hangar-framing`  
**Base Commit:** `2383bcb508029a8581a1950c395c186009b80371`  
**Execution Constraint:** `I_AM_STATELESS_RENTER_NOT_LANDLORD`

---

## 1. Problem & Forensic Root Cause

Under the owner's physical mobile recording and viewport testing:
1. **Camera Framing Truncation:** The Sovereign Hangar Three.js camera used a static vertical FOV ($42^\circ$) and static distance ($r = 5.4$). On tall mobile viewports (e.g. Redmi 13 `393x873`, aspect $A \approx 0.45$), horizontal field of view contracted from $68.6^\circ$ down to $19.8^\circ$, reducing visible horizontal width to $1.86\text{m}$. Because the spacecraft bounding dimension is $2.55\text{m}$, the ship filled $137\%$ of the screen width and was severely cropped on both sides.
2. **Permanent HUD Occlusion:** `.hud-meta` was permanently docked, occupying $86\text{vw}$ width directly on top of the spacecraft fuselage and pedestal.
3. **Control Overflow:** The bottom control bar relied on `overflow-x: auto`, causing secondary actions to be hidden off-screen on mobile and requiring horizontal scrolling.
4. **Inspect Mode Boundary Violation:** `toggleInspect()` hardcoded camera distance to $r = 3.1\text{m}$, violating portrait mode's minimum safe clearance ($minR = 3.8\text{m}$) and causing inspect mode to clip the craft.
5. **Touch Ergonomics:** `OrbitRig` required desktop-mouse precision ($<9\text{px}$ movement for tap-to-swap), causing finger taps on mobile glass to be misclassified as drags. Additionally, `.canvas-host` lacked `touch-action: none`.

---

## 2. Remediations Implemented

1. **Aspect-Aware, Model-Aware Camera Fitting (`getHangarFrameProfile` in `hangar/src/main.js` & `hangar/src/orbit.js`):**
   - **Tall Mobile Portrait ($A \le 0.55$, e.g. Redmi 13 `393x873`):** Adjusts vertical FOV to $52^\circ$, orbit distance to $7.2\text{m}$, inspect distance to $4.4\text{m}$ ($> minR = 3.8\text{m}$), and elevates camera target to $y = 1.05$. Mathematical proof: visible horizontal width expands to $3.16\text{m} > 2.55\text{m}$ (providing $+0.61\text{m}$ safe horizontal margin), eliminating all horizontal clipping.
   - **Standard Mobile/Tablet Portrait ($0.55 < A \le 0.85$):** FOV $48^\circ$, distance $6.4\text{m}$, inspect distance $3.8\text{m}$ ($> minR = 3.2\text{m}$), target $y = 0.98$.
   - **Square/Compact ($0.85 < A \le 1.35$):** FOV $44^\circ$, distance $5.8\text{m}$, inspect distance $3.4\text{m}$ ($> minR = 2.8\text{m}$), target $y = 0.92$.
   - **Desktop 16:9 / Landscape ($A > 1.35$):** Retains exact canonical baseline: FOV $42^\circ$, distance $5.4\text{m}$, inspect distance $3.1\text{m}$, target $y = 0.88$.
   - Dynamic listening to both `resize` and `orientationchange` events for seamless live rotations without reloads.
   - Safe bounds clamping: `setProfile` strictly clamps both target and spherical coordinates (`tgt.r`, `sph.r`, `tgt.pol`, `sph.pol`) to the active profile's `[minR, maxR]` boundaries, preserving safe clearance during resize after manual orbit or zoom.

2. **Optional Artifact Information Everywhere (Desktop & Mobile):**
   - In alignment with the owner's immersive vision, `.hud-meta` is collapsed by default everywhere (`opacity: 0; visibility: hidden; pointer-events: none`).
   - Accessible via compact top-right control (`#btn-meta-toggle`, `INFO`), leaving the 3D spacecraft 100% unobstructed on initial load.
   - Tapping `INFO` smoothly slides the metadata panel into view with active button styling and a dedicated close control (`#btn-meta-close`, `✕`).
   - Entering `Inspect` mode (`#btn-inspect`) automatically reveals telemetry.

3. **No Hidden Mobile Actions (Prominent Launch + Accessible Actions Menu):**
   - Completely eliminated `overflow-x: auto` from the controls dock.
   - On desktop: Controls display side-by-side cleanly in `.hud-controls`.
   - On mobile ($\le 640\text{px}$ or $\le 520\text{px}$ height): `.hud-controls` provides a prominent `LAUNCH FLIGHT` primary CTA plus an accessible `ACTIONS ▾` menu button (`#btn-actions-toggle`).
   - Tapping `ACTIONS ▾` opens an action sheet popover (`#actions-menu`) containing `Inspect`, `Swap Craft`, `Load Model`, and `Reset View` with touch targets $\ge 42\text{px}$, fully visible with zero scrolling.

4. **Enhanced Touch Interaction & Orbit Controller Safety (`hangar/src/orbit.js`):**
   - Added `touch-action: none;` to `.canvas-host`.
   - Expanded mobile tap movement tolerance from $9\text{px}$ to $18\text{px}$ and time limit to $500\text{ms}$ for touch pointer types.
   - Smoothed multi-touch pinch-to-zoom calculation with bounded spherical radius clamps.

5. **Test Harness Repair & Negative Control Proof:**
   - Repaired `tools/test_hangar_mobile_composition.mjs` so that `check(desc, condition)` strictly invokes callable predicates and captures exceptions instead of testing function truthiness.
   - Added negative control suite (`tools/test_hangar_mobile_negative_control.mjs`) verifying that deliberately false predicates and thrown exceptions trigger `[FAIL]` and a non-zero exit code (1). Integrated into `npm run gate`.

---

## 3. Test Evidence & Verification Receipts

| Test Suite / Gate | Command | Result | Details |
|---|---|---|---|
| **Negative Control Verification** | `npm run test:mobile-hangar-negative` | **PASS** | Proved harness strictly fails (exit code 1) on false/throwing predicates |
| **Mobile Hangar Composition** | `npm run test:mobile-hangar` | **PASS** | **28 / 28** genuine callable checks green (FOV math, controls, inspect bounds) |
| **Hangar Findings Regression** | `npm run test:hangar` | **PASS** | **27 / 27** checks green (5 Chief Architect findings preserved) |
| **Survey Hit-Test Regression** | `npm run test:survey` | **PASS** | **7 / 7** checks green |
| **Syntax Verification** | `npm run verify:syntax` | **PASS** | 0 parser / syntax errors across JS and Python |
| **Hot Path Audit** | `python tools/hot_path_audit.py` | **PASS** | Score 100%, `no_three_dependency: true` in game loop |
| **Context Typecheck** | `npm run context:typecheck` | **PASS** | TypeScript compilation green |
| **KC Static Audit** | `python tools/kc_starfall_watch.py --once --skip-backend` | **PASS** | 7/7 static script checks, 0 failures, `mobile_stress_pct: 100` |
| **Full Repository Gate** | `npm run gate` | **PASS** | All sub-gates passed natively in Ubuntu WSL |

> [!NOTE]
> The KC audit result above reflects static script verification via `tools/kc_starfall_watch.py`. Formal council review remains governed by independent deliberation procedures and is distinct from automated local tool passes.

---

## 4. Visual Evidence Receipts (Rendered Microsoft Edge Browser Suite)

Headless Edge CLI (`msedge.exe --headless=new`) captured rendered PNGs across the integrated route (`/`) and standalone route (`/hangar/`):

### Standalone Hangar Route (`/hangar/`)
- **Desktop Baseline (1280x800):** `hangar/evidence/screenshots/desktop_1280x800.png` (284 KB) — Baseline 16:9 framing, MK-I craft, pedestal, and glass frame.
- **Mobile Portrait (393x873):** `hangar/evidence/screenshots/mobile_portrait_393x873.png` (114 KB) — 52° FOV, r=7.2m. Full craft visible with +0.61m clearance.
- **Mobile Landscape (873x393):** `hangar/evidence/screenshots/mobile_landscape_873x393.png` (137 KB) — 42° FOV, unobstructed landscape framing.

### Integrated Game Runner Route (`/`)
- **Desktop Initial (1280x800):** `hangar/evidence/screenshots/integrated_desktop_initial.png` (294,951 bytes) — Embedded Sovereign Hangar inside `#sovereignScrim`. Craft 100% visible, metadata collapsed.
- **Desktop INFO Open (1280x800):** `hangar/evidence/screenshots/integrated_desktop_info.png` (306,824 bytes) — Specifications telemetry card revealed via INFO trigger.
- **Desktop Inspect (1280x800):** `hangar/evidence/screenshots/integrated_desktop_inspect.png` (301,533 bytes) — Detailed inspection zoom at canonical desktop distance.
- **Mobile Portrait Initial (393x873):** `hangar/evidence/screenshots/integrated_mobile_portrait_initial.png` (116,627 bytes) — Full craft and pedestal visible, prominent `LAUNCH FLIGHT` + `ACTIONS ▾` menu. Zero horizontal clipping.
- **Mobile Portrait Actions Open (393x873):** `hangar/evidence/screenshots/integrated_mobile_portrait_actions.png` (116,853 bytes) — Accessible secondary actions popover sheet displayed with touch targets $\ge 42\text{px}$.
- **Mobile Portrait INFO Open (393x873):** `hangar/evidence/screenshots/integrated_mobile_portrait_info.png` (141,234 bytes) — Mobile metadata sheet smoothly overlaid.
- **Mobile Portrait Inspect (393x873):** `hangar/evidence/screenshots/integrated_mobile_portrait_inspect.png` (148,773 bytes) — Responsive inspect framing at $r = 4.4\text{m} \ge 3.8\text{m} (minR)$, safely preventing craft truncation.
- **Mobile Portrait Model Swap (393x873):** `hangar/evidence/screenshots/integrated_mobile_portrait_swap.png` (96,990 bytes) — Alternate craft model loaded and framed seamlessly.
- **Mobile Landscape Initial (873x393):** `hangar/evidence/screenshots/integrated_mobile_landscape_initial.png` (128,310 bytes) — Clean horizontal framing with collapsed metadata.
- **Flight Runner Launch (1280x800):** `hangar/evidence/screenshots/integrated_gameplay_launch.png` (122,206 bytes) — Hangar dismissed, WebGL flight canvas active following launch transition.

---

## 5. Architectural & Environmental Clarifications

1. **Camera Fitting Method:** Craft geometry is normalized to a fixed $2.55\text{m}$ bounding dimension via `normalizeModel()` in `showcase.js`. Camera fitting applies tiered aspect profiles ($A \le 0.55$, $0.55 < A \le 0.85$, $0.85 < A \le 1.35$, $A > 1.35$) tuned to guarantee safe boundary clearance ($+0.61\text{m}$ clearance on $393\times 873$), rather than dynamic mesh recalculation per frame.
2. **Routing Test Diagnosis (`tools/test_hangar_production_routing.mjs`):** The legacy test failed in WSL because it spawns Windows `msedge.exe` across the DrvFS boundary with `/tmp/` user data paths and expects port 9231 on WSL localhost (`127.0.0.1`), crossing WSL2/Windows host NAT boundaries. Visual and DOM verification is natively handled via `tools/test_hangar_mobile_composition.mjs` and the headless Edge screenshot suite.
3. **Flight Mechanics Isolation:** The `LAUNCH FLIGHT` button preserves strict postMessage decoupling (`starfall_launch_flight`) without modifying flight runner loop, physics, weapon systems, or gameplay rules.

---

## 6. PR Identification & Governance Directives

**PR Title:** `fix(hangar): repair test harness, responsive inspect framing, accessible mobile actions menu, and immersive optional metadata`  
**Branch:** `fix/mobile-sovereign-hangar-framing`  
**Base:** `origin/main` (`2383bcb508029a8581a1950c395c186009b80371`)  
**Deployment Gate:** **STRICT HOLD**. No production deployment or branch merge authorized until owner completes physical mobile device inspection.
