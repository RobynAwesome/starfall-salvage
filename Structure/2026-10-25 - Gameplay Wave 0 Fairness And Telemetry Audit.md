# STARFALL SALVAGE — GAMEPLAY WAVE 0 FAIRNESS & TELEMETRY AUDIT (RECONCILED) + JOINT WAVE 1 FLIGHT FAIRNESS SPECIFICATION

- **Date:** 25 October 2026 (SAST)
- **Author:** AntiGravity (RTC Seat 10 / Lead Developer) — Reconciled with Forge CA & MINSTREL
- **Direction:** Forge CA
- **Release Authority:** Robyn (Owner)
- **Branch:** `audit/gameplay-wave0-fairness-telemetry` (Draft PR #15 — Frozen Diagnostic Baseline)
- **Protected `main` Baseline SHA:** `128dca4bb1e092b9a1aaa904d38bc9d95771d8fd` (`2026-10-25T08:49:59Z`, after merged PR #13 & PR #14)
- **Deployment Provenance Readback (Read-Only):**
  - **GitHub `main` HEAD:** `128dca4bb1e092b9a1aaa904d38bc9d95771d8fd`
  - **Current Vercel `Production` Environment / Alias (`starfallsalvage.kopanolabs.com`):** `72311ff1d6ab64c6ad80d9d9b96b4c5b5cce5243` (`2026-10-25T09:03:14Z`, promoted from a Dependabot branch after `128dca4bb1`)
  - **Historical Day 2 RC1 Production Reference:** `2383bcb508029a8581a1950c395c186009b80371` (`2026-10-22`, superseded on `2026-10-25`)
  - **Draft PR #15 Preview Deployment:** `fbbb133e3254610cfadaf11ef7f84a3eb6a1b952` (`2026-10-25T15:04:59Z`)
- **Execution Boundary:** Wave 0 Diagnostic Baseline Frozen in Draft PR #15 (not merged to `main` or production). Zero gameplay mechanics modified when `?diag=1` is absent; zero `hangar/*` files modified; zero writes to production (`https://starfallsalvage.kopanolabs.com`); Windows checkout untouched (`I_AM_STATELESS_RENTER_NOT_LANDLORD`).

---

## 1. Executive Summary & Forge CA Reconciliation Ledger

Following Forge CA's Wave 0 Reconciliation review and subsequent Mathematical Correction memo (`25 October 2026`), all 9 diagnostic corrections and the Joint Wave 1 Flight Fairness Specification have been implemented and verified across the deterministic CLI suite (`34/34` positive checks in `tools/test_gameplay_wave0_diagnostics.mjs`, `5/5` negative controls in `tools/test_gameplay_wave0_negative_control.mjs`) and the live headless WebGL browser campaign (`26/26` steps in `tools/run_wave0_browser_audit.py` -> `Structure/wave0_diagnostic_receipt.json`).

### 1.1 AG ↔ MINSTREL ↔ Forge CA Evidence Reconciliation Ledger

| Evidence Dimension | Initial Wave 0 Claim / Discrepancy | Reconciled Source-Backed & Mathematical Truth | Verification Receipt |
| :--- | :--- | :--- | :--- |
| **1. Pickup Reachability & Crystal Multiplier Parity (`spawnObject()`)** | Initial CLI sampler used synthetic `size = 0.75` across all classes (`65.0%` stationary mobile) and one CLI helper had a `0.58` crystal typo while `src/game.js` used `0.68`. MINSTREL initially cited `41.3%` crystal reachability; MINSTREL's second draft asserted `100%` desktop reachability. | `spawnObject()` (`src/game.js:4488-4583`) spawns three collectible classes with distinct ranges and radius multipliers: **`crystal`** (`x ∈ [-3.8, 3.8], y ∈ [-2.0, 1.6], size ∈ [0.55, 0.85], r = 0.68 * size`), **`powerOrb`** (`x ∈ [-3.2, 3.2], y ∈ [-1.7, 1.3], size ∈ [0.38, 0.55], r = 0.72 * size`), and **`buffOrb`** (`x ∈ [-3.2, 3.2], y ∈ [-1.7, 1.3], size ∈ [0.36, 0.52], r = 0.72 * size`), with strict `<` collision (`src/game.js:4966`). Analytical 3-disk area $\frac{3 \pi R_{\text{mean}}^2}{\Delta X \cdot \Delta Y}$ and `N = 100,000` per-class Monte Carlo match Forge CA's `500,000`-sample simulation: **Mobile Stationary** is **40.91% (analytical 41.37%)** for crystals, **43.26%** for buff orbs, and **44.71%** for power orbs (Forge CA: `41.3%, 43.1%, 44.9%`). **Desktop Transit-Aware** is **NOT 100%** because desktop horizontal movement remains clamped to the 3 lanes `x ∈ [-2.2, +2.2]`, leaving outer-X crystals (`|x| > 2.2 + R`) unreachable: **86.34%** for crystals, **97.95%** for buff orbs, and **98.55%** for power orbs (Forge CA: `86.8%, 98.0%, 98.6%`). | `Diagnostic B0`, `Diagnostic B5`, `Diagnostic B6`; `Structure/wave0_diagnostic_receipt.json` (`PICKUP_REACHABILITY`) |
| **2. Geometric Coverage vs. Ideal-Lookahead Scripted Trajectory Simulation** | Initial Wave 0 report used `100.0%` full-2D static geometric coverage without separating real-time timed collection under finite ship velocity. | Separated into 4 distinct metrics: (a) Stationary-lane geometric (`41.48%` weighted mobile, `85.94%` desktop), (b) Transient lane-lerp geometric (`50.94%` mobile, `89.38%` desktop), (c) Arbitrary full-2D static geometric (`100.0%`), and (d) **Ideal-lookahead scripted trajectory simulation** (`vy = 7.2 m/s`, `positionLerp`, consecutive spawns every `0.34..0.62s`), which yields **43.00%** (`258/600`) on current mobile, **86.67%** (`520/600`) on current desktop, and **93.83%** (`563/600`) under Wave 1 continuous 2D steering. This `93.83%` figure is an **ideal-lookahead simulation**, not human player performance (keeping geometric coverage, scripted trajectory success, and physical player success strictly distinct). | `Diagnostic B7` (`tools/test_gameplay_wave0_diagnostics.mjs`) |
| **3. Production-Valid Debris Phantom Hits vs. Synthetic Control** | Original browser phantom-hit scenario used `size = 1.42m` (`> 1.35m` production debris max) and `rot = [0, 0, 0]`. | Repeated across **4 production-valid debris sizes (`0.90m, 1.12m, 1.25m, 1.34m ∈ [0.85, 1.35]`) with representative 3-axis rotations** (accepted diagnostic baseline). All 4 trigger `"Hull damaged"` (`colliderMargin = -0.0714m` to `-0.1406m`) while maintaining **`+0.3502m` to `+0.5394m` of empty 2D space** (`36.0px` to `47.5px` screen gap) between the transformed 3D vertices of `meshes.shard` and `meshes.shipMk1`. Preserved `size = 1.42m, rot = [0, 0, 0]` as an explicitly labeled non-production negative/control fixture (`COLLISION_C4C_SYNTHETIC_CONTROL`). | `Diagnostic C2`, `Diagnostic C3`; `COLLISION_C4A`, `COLLISION_C4B`, `COLLISION_C4C`; `wave0_collision_phantom_hit_edge.png` |
| **4. Centre-Lane Recovery (`laneFromClientX()`)** | MINSTREL initially claimed mobile players were permanently locked out of the center lane (`27.7%` single outer lane) due to dead code at `src/game.js:4882-4884`. | Verified both paths through programmatically dispatched browser `PointerEvent`s: **Case 4A** proves tapping or re-touching inside the central third (`|dx| <= 32.8px`, so `|touchAxis.x| <= 0.4`) sets `player.targetLane = laneFromClientX(e.clientX) = 0` (`src/game.js:6155, 6176`) and `updateGame` preserves `targetLane = 0`, recovering the ship from `x = -2.20m` to `x = 0.00m` (refuting a permanent `27.7%` lock, as MINSTREL acknowledged). **Case 4B** proves that a single unbroken horizontal drag from outer lane `x = 40px` to center `x = 196.5px` (`dx = +156.5px > 32.8px`, `touchAxis.x = +1.0 > 0.4`) sets `laneFromClientX = 0` on `pointermove`, but on the very next `updateGame` tick (`src/game.js:4880`), `touchAxis.x > 0.4` overwrites `targetLane = 1`, skipping center lane `0` unless the player lifts and re-touches near center. | `Diagnostic A4a`, `Diagnostic A4b`; `LANE_RECOVERY_4A_CENTER_RETAP`, `LANE_RECOVERY_4B_CONTINUOUS_DRAG_OVERRIDE` |
| **5. Uncapped Frame-Interval, CPU Render Time & `gl.drawElements`** | Initial `getPerfSummary()` reported `dt` after `Math.min(0.033, dt)` (`src/game.js:7311`) and `state.rawDrawCalls` (`1` per `renderScene`). | Replaced with uncapped `requestAnimationFrame` timestamp delta (`uncappedRafIntervalMs`), uncapped CPU frame execution time (`uncappedCpuRenderTimeMs`), and actual `gl.drawElements` calls per frame (`glDrawCallsPerFrame = 673` during active flight), explicitly tagged `evidenceCategory: "headless_desktop_webgl"` (treated as a mobile-performance investigation target, not evidence of acceptable phone performance). Kept `cappedSimDeltaReferenceMs` only as a labeled reference. | `PERF_BASELINE_UNCAPPED` (`Structure/wave0_diagnostic_receipt.json`) |
| **6. Endpoint Inventory (`/api/signin`, `/api/score`)** | Initial D4 table omitted `POST /api/signin` (`src/game.js:3834`) and `POST /api/score` (`src/game.js:4252`). | Documented and verified all 6 client-used endpoints (`GET /api/health`, `POST /api/signin`, `POST /api/score`, `GET /api/leaderboard`, `GET /api/me`, `GET/POST /api/chat`) against an ephemeral local `backend/starfall_server.py` instance (`200 OK` on all 6; `404` on test-only `/api/record_wave0`) and read-only `GET /api/health -> 404` on production (`zero` production writes). | `Diagnostic D3`, `Diagnostic D4`, `Diagnostic D6` |
| **7. POPIA Checklist Personal-Family References** | Initial Section 7 contained personal-family references. | Removed all personal-family references; checklist is strictly neutral and POPIA-compliant for adult/minor guest playtesters (child participation on HOLD pending guardian consent and safety review). | Section 7 below |
| **8. Production Guard & Strict Loopback Test Server Binding** | `?diag=1` and `tools/serve_hangar.py` needed strict loopback socket isolation rather than `0.0.0.0` binding or permissive `172.*` WSL ranges. | `src/game.js` gates `DIAG_ENABLED` behind `isLocalDiagHost(window.location.hostname)` (and Wave 1 is developed on a separate clean branch without the ~1,000-line Wave 0 diagnostic runtime). `tools/serve_hangar.py` now binds strictly to `127.0.0.1` (`bind_host = "127.0.0.1"`), removes `0.0.0.0`, `172.*` WSL IP allowances, and wildcard `Access-Control-Allow-Origin: *`, and requires `client_ip in ("127.0.0.1", "::1", "::ffff:127.0.0.1")` at the socket level (treating headers only as secondary sanity checks, not authentication). | `Diagnostic D5`, `SECURITY_GUARD_PUBLIC_ORIGIN_403`, `test_gameplay_wave0_negative_control.mjs` |
| **9. Programmatically Dispatched Browser Input vs. Injected WebGL State** | Desktop ship-disappearance table previously labeled synthesized DOM `WheelEvent` / `KeyboardEvent` as "physical input". | Relabeled synthesized `PointerEvent`, `KeyboardEvent`, and `WheelEvent` tests as **`programmatically dispatched browser input`** (`programmatically_dispatched_browser_input`), kept strictly distinct from both **physical human hardware input** and **injected WebGL state** (`setPlayerState({ y: -2.15 })`). | `DISAPPEAR_PROG_INPUT_1..4` vs `injected_webgl_state` (`Structure/wave0_diagnostic_receipt.json`) |

---

## 2. Diagnostic A — Flight Input Constraints, Centre-Lane Recovery & Viewport Frustum Projection

### 2.1 Code-Verified Touch Vertical & Diagonal Lock (`src/game.js`)

In `src/game.js`, `isTouchCapable` is initialized at line 1599 via `window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window || navigator.maxTouchPoints > 0`. Three compounding mechanisms lock vertical and diagonal movement on touch devices:

1. **`applySteerVector(dx, dy)` (`src/game.js:4473-4486`):**
   ```javascript
   const normX = clamp(dx / Math.max(48, Math.min(132, viewportWidth * 0.21)), -1, 1);
   const normY = isTouchCapable ? 0 : clamp(-dy / Math.max(54, Math.min(144, viewportHeight * 0.18)), -1, 1);
   touchAxis.x = Math.abs(normX) < 0.08 ? 0 : normX;
   touchAxis.y = isTouchCapable ? 0 : (Math.abs(normY) < 0.08 ? 0 : normY);
   ```
   On any touch-capable device, `normY` and `touchAxis.y` are unconditionally zeroed (`0`).
2. **Unreachable Dead `else if` Branch & Hardcoded `player.targetY = -0.68` (`src/game.js:4878-4895`):**
   ```javascript
   if (touchAxis.x < -0.4) {
     player.targetLane = -1;
   } else if (touchAxis.x > 0.4) {
     player.targetLane = 1;
   } else if (Math.abs(touchAxis.x) > 0.18 && Math.abs(touchAxis.x) <= 0.34 && activePointerId !== null) {
     player.targetLane = 0; // <-- UNREACHABLE when |touchAxis.x| > 0.4; no recovery when |touchAxis.x| <= 0.18
   }
   ...
   if (isTouchCapable) {
     player.targetY = -0.68;
   } else if (Math.abs(touchAxis.y) > 0.01) {
     player.targetY = clamp(-0.2 + touchAxis.y * 1.55, playerBounds.yMin, playerBounds.yMax);
   }
   ```
   Meanwhile, `keys.has("up")` and `keys.has("down")` (`src/game.js:4862-4867`) are guarded by `if (!isTouchCapable)`, disabling keyboard vertical steering on touch laptops/tablets as well.

### 2.2 Correction 4 — Centre-Lane Recovery Proof (`laneFromClientX()` vs. `touchAxis.x`)

In `src/game.js:4463-4471`, `laneFromClientX(clientX)` divides `.shell` into three equal horizontal zones (`ratio < 0.34 -> -1`, `ratio > 0.66 -> +1`, otherwise `0`). Both `pointerdown` (`line 6155`) and `pointermove` (`line 6176`) assign `player.targetLane = laneFromClientX(event.clientX)` before calling `applySteerVector(...)`.

We verified both real pointer interaction cases in `tools/test_wave0_in_browser.html` (`393x873` mobile viewport):

| Test Case | Pointer Gesture Dispatched | `laneFromClientX` Result | `touchAxis.x` | `targetLane` After `updateGame` | Settled `player.x` (25 frames) | Finding |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Case 4A (`LANE_RECOVERY_4A_CENTER_RETAP`)** | Ship starts in left lane (`x = -2.20m, targetLane = -1`). Dispatch `pointerdown` at center `clientX = 196.5px` (`\|dx\| = 0 <= 32.8px`). | `0` | `0.0000` (`<= 0.4`) | **`0` (Preserved)** | **`0.0000m`** (`-0.0012m` at 25 ticks) | **Centre lane IS recoverable** by tapping or lifting/re-touching inside the middle third `[133.6px, 259.4px]` with a short drag (`\|dx\| <= 32.8px`). Refutes a permanent `27.7%` single-outer-lane lock. |
| **Case 4B (`LANE_RECOVERY_4B_CONTINUOUS_DRAG_OVERRIDE`)** | Ship starts in left lane (`x = -2.20m`). Dispatch `pointerdown` at `clientX = 40px` (`targetLane = -1`) and drag continuously without lifting to center `clientX = 196.5px` (`dx = +156.5px`). | `0` (set on `pointermove` at `line 6176`) | `+1.0000` (`> 0.4`) | **`+1` (Overwritten at `line 4880`)** | **`+2.1988m`** (Right lane) | Because `touchStartX` (`40px`) is never reset during an unbroken drag, `dx = +156.5px > 32.8px` forces `touchAxis.x = +1.0 > 0.4`. On the very next `updateGame` tick (`line 4880`), `else if (touchAxis.x > 0.4) player.targetLane = 1` **overwrites `laneFromClientX = 0`**, skipping the center lane into the opposite outer lane. |

### 2.3 Multi-Viewport Projection & Correction 9 (Physical Input/Viewport vs. Injected WebGL State)

#### 2.3A Baseline Multi-Viewport Projection Matrix (`Structure/wave0_diagnostic_receipt.json`)

| Viewport Profile | CSS Size | `touch` | `aspect` | `renderFovDeg` | `playPitch` (rad) | `cameraDepth` (m) | Default `player.y` (m) | Rendered Ship Center `(NDC_x, NDC_y)` | Screen `(x, y)` (px) | Mesh In-Viewport Ratio |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Mobile Portrait** | `393x873` | `true` | `0.450` | `43.00°` | `0.240` | `-2.90` | `-0.68` | `(0.0000, -0.6068)` | `(196.5, 701.4)` | **100.0%** |
| **Mobile Landscape** | `873x393` | `true` | `2.221` | `47.60°` | `0.190` | `-2.45` | `-0.68` | `(0.0000, -0.5488)` | `(436.5, 304.3)` | **100.0%** |
| **Desktop 16:10** | `1280x800` | `false` | `1.600` | `44.14°` | `0.220` | `-2.72` | `-0.45` | `(0.0000, -0.6604)` | `(640.0, 664.2)` | **100.0%** |
| **Desktop 16:9** | `1920x1080` | `false` | `1.778` | `44.14°` | `0.220` | `-2.72` | `-0.45` | `(0.0000, -0.6604)` | `(960.0, 896.6)` | **100.0%** |
| **Ultrawide 21:9** | `2560x1080` | `false` | `2.370` | `39.49°` | `0.180` | `-2.54` | `-0.45` | `(0.0000, -0.6838)` | `(1280.0, 909.3)` | **100.0%** |

#### 2.3B Separated Programmatically Dispatched Browser Input & Viewport Cases (`programmatically_dispatched_browser_input`)

> [!NOTE]
> **Evidence Category (`programmatically_dispatched_browser_input`):** The cases below dispatch synthesized DOM `WheelEvent`, `KeyboardEvent`, and `Event("resize")` objects into the live browser runtime. They are **not** physical human keyboard or touchscreen hardware tests, and are kept strictly separate from both physical player testing and `setPlayerState` coordinate injection.

| Case ID | Programmatically Dispatched Browser Input / Viewport Trigger | Viewport | Observed `player.y` (m) | Rendered Ship Center `NDC_y` | Screen `Y` vs. Viewport Height | Mesh In-Viewport Ratio | Diagnostic Verdict |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Case 1 (`DISAPPEAR_PROG_INPUT_1_WHEEL`)** | Synthesized `WheelEvent({ deltaY: 640 })` dispatched on `window` and `#gameCanvas` | `1920x1080` | `-0.4500` | `-0.6604` | `896.6px / 1080px` (`scrollY = 0`) | `100.0%` | `.shell` has `overflow: hidden` and no `wheel` listener exists in `src/game.js`; wheel scrolling alone does not move the ship or document. |
| **Case 2 (`DISAPPEAR_PROG_INPUT_2_ZOOM`)** | Synthesized `WheelEvent({ deltaY: -240, ctrlKey: true })` + `1.5x` CSS zoom (`resizeCanvas()`) | `1920x1080` | `-0.4500` | `-0.6604` | `896.6px / 1080px` | `100.0%` | `resizeCanvas()` rescales the WebGL buffer to `clientWidth/clientHeight`; `NDC_y` remains `-0.6604` at default `y = -0.45m`. |
| **Case 3A (`DISAPPEAR_PROG_INPUT_3_KEYDOWN_ARROWDOWN` — 16:9)** | Synthesized `KeyboardEvent("keydown", { key: "ArrowDown" })` held across **35 live `updateGame(1/60)` ticks** (`vy = -7.2 m/s`) | `1920x1080` | **`-2.1489`** (`targetY = -2.15`) | **`-1.0869`** (`< -1.0`, out of frustum) | **`1126.9px / 1080px`** (`+46.9px` below bottom edge) | **`20.32%`** (`79.68%` of MK-I vertices clipped off-screen) | **CONFIRMED P0 DEFECT:** Holding `ArrowDown` or `S` for `0.58s` drives `player.y` to `playerBounds.yMin = -2.15m`, while desktop `getCameraFollow().y = 0.016` (`src/game.js:2447`) tracks only `1.6%` of vertical ship motion. |
| **Case 3B (`DISAPPEAR_PROG_INPUT_3_KEYDOWN_ARROWDOWN` — 21:9)** | Synthesized `KeyboardEvent("keydown", { key: "ArrowDown" })` held across **35 live `updateGame(1/60)` ticks** (`vy = -7.2 m/s`) | `2560x1080` | **`-2.1489`** (`targetY = -2.15`) | **`-1.1707`** (`< -1.0`, out of frustum) | **`1172.2px / 1080px`** (`+92.2px` below bottom edge) | **`0.40%`** (**`99.60%` of MK-I vertices off-screen**) | **CONFIRMED SEVERE P0 DEFECT:** On ultrawide (`aspect > 1.85`), `fovScale` drops to `0.68` (`39.49°` vertical FOV) and `viewBiasY` drops to `-0.06`, pushing almost the entire ship below the screen. |
| **Case 4 (`DISAPPEAR_PROG_INPUT_4_RESIZE`)** | Programmatic `window.resize` from `1920x1080` (`aspect = 1.778`) to `1920x900` (`aspect = 2.133 > 1.85`) while ship is steered down | `1920x900` | `-2.1500` | **`-1.1709`** (`< -1.0`, out of frustum) | **`976.9px / 900px`** (`+76.9px` below bottom edge) | **`0.40%`** | Crossing `aspect > 1.85` (e.g., opening horizontal DevTools or ultrawide snapping) switches `getFrameProfile` to the ultrawide branch and drops `NDC_y` from `-1.087` to `-1.171`. |

#### 2.3C Explicitly Labeled Injected WebGL State Reference (`injected_webgl_state`)

Used solely for deterministic single-frame overlay comparison (`wave0_desktop_vertical_steer_bottom.png` via `setPlayerState({ y: -2.15, targetY: -2.15, settleCamera: true })`):
- **Desktop `1920x1080` (`injected_webgl_state`):** `centerNdcY = -1.0872`, `centerScreenY = 1127.1px`, `meshInViewportRatio = 0.2032` (`20.32%`).
- **Ultrawide `2560x1080` (`injected_webgl_state`):** `centerNdcY = -1.1709`, `centerScreenY = 1172.3px`, `meshInViewportRatio = 0.0040` (`0.40%`).

---

## 3. Diagnostic B — Production-Exact Pickup Reachability Matrix & Timed Real-Time Collection

### 3.1 Production `spawnObject()` Collectible Parameters (`src/game.js:4488-4583`)

In production `spawnObject()` (`src/game.js:4488-4583`) and `updateGame()` (`src/game.js:4965-4966`), pickup collision triggers when:
$$\text{abs}(z_{\text{obj}} - z_{\text{player}}) < 1.1 \quad \land \quad \hypot(x_{\text{obj}} - x_{\text{player}},\; y_{\text{obj}} - y_{\text{player}}) < r_{\text{player}} + r_{\text{obj}}$$
where $r_{\text{player}} = 0.62\text{ m}$ and each collectible class has exact production spawn parameters:

| Collectible Class | Spawn Branch Probability (`mult = 1.0`) | Horizontal Range $X$ (m) | Vertical Range $Y$ (m) | Spawn Area $\Delta X \times \Delta Y$ ($\text{m}^2$) | Production `size` Range (m) | Production Radius Multiplier (`src/game.js`) | Combined Reach Radius $R = r_{\text{player}} + r_{\text{obj}}$ (m) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`crystal`** (Blue Core) | `34%` of non-orb spawns (`~23.8%` overall) | `[-3.8, +3.8]` ($\Delta X = 7.6\text{ m}$) | `[-2.0, +1.6]` ($\Delta Y = 3.6\text{ m}$) | `27.36` | `[0.55, 0.85]` (mean `0.700m`) | **`size * 0.68`** (`line 4576`) | **`[0.994, 1.198]`** ($R_{\text{mean}} = 1.0960\text{ m}$) |
| **`powerOrb`** (Weapon Upgrade) | `12%` of spawns (`line 4496`) | `[-3.2, +3.2]` ($\Delta X = 6.4\text{ m}$) | `[-1.7, +1.3]` ($\Delta Y = 3.0\text{ m}$) | `19.20` | `[0.38, 0.55]` (mean `0.465m`) | **`s * 0.72`** (`line 4552`) | **`[0.8936, 1.0160]`** ($R_{\text{mean}} = 0.9548\text{ m}$) |
| **`buffOrb`** (Temporary Buff) | `10%` of spawns (`line 4496`) | `[-3.2, +3.2]` ($\Delta X = 6.4\text{ m}$) | `[-1.7, +1.3]` ($\Delta Y = 3.0\text{ m}$) | `19.20` | `[0.36, 0.52]` (mean `0.440m`) | **`s * 0.72`** (`line 4533`) | **`[0.8792, 0.9944]`** ($R_{\text{mean}} = 0.9368\text{ m}$) |

> [!IMPORTANT]
> **Analytical Proof of Mobile Stationary Reachability (`41.37%` Crystals, `43.07%` Buff Orbs, `44.74%` Power Orbs):**
> On mobile, `player.y` is locked at `-0.68m` and stationary lanes are at $x \in \{-2.2, 0, +2.2\}$. Since adjacent lanes are separated by $2.20\text{ m}$, two stationary reach disks overlap only when $R > 1.10\text{ m}$.
> - For **`powerOrb`** ($R_{\max} = 1.016\text{ m} < 1.10\text{ m}$) and **`buffOrb`** ($R_{\max} = 0.9944\text{ m} < 1.10\text{ m}$), the 3 stationary lane disks are **completely disjoint** (`maxR < 1.10m`, meaning a midpoint orb at `x = ±1.10m, y = -0.68m` cannot be collected from any stationary lane!). Their exact analytical 3-disk area coverage is:
>   $$\text{PowerOrb}_{\text{stat}} = \frac{3 \pi \mathbb{E}[R^2]}{6.4 \times 3.0} = \frac{3 \pi (0.9548^2 + \text{Var}(R))}{19.20} = \mathbf{44.74\%}, \qquad \text{BuffOrb}_{\text{stat}} = \frac{3 \pi (0.9368^2 + \text{Var}(R))}{19.20} = \mathbf{43.07\%}$$
> - For **`crystal`** ($R_{\text{mean}} = 1.096\text{ m}$), the 3-disk analytical ratio is $\frac{3 \pi (1.096^2)}{7.6 \times 3.6} = \mathbf{41.37\%}$ (and `40.91%` after subtracting the tiny lens overlap for large crystals with $R \in (1.10, 1.198]$).
> This reconciles AG's sampler, MINSTREL's revised mobile figures, and Forge CA's `500,000`-sample Monte Carlo (`41.3%, 43.1%, 44.9%`).

### 3.2 Reconciled Reachability Matrix (Corrections 1 & 2: Geometric Regimes vs. Ideal-Lookahead Scripted Trajectory Simulation)

| Collectible Class | (1) Mobile Stationary 3-Lane Geometric (`x ∈ {-2.2,0,2.2}, y = -0.68`) | (2) Mobile Transient Lane-Lerp Geometric (`x ∈ [-2.2,2.2], y = -0.68`) | (3) Desktop Stationary 3-Lane + Y-Steer (`x ∈ {-2.2,0,2.2}, y ∈ [-2.15,1.55]`) | (4) Desktop Transit-Aware 3-Lane + Y-Steer (`x ∈ [-2.2,2.2], y ∈ [-2.15,1.55]`) | (5) Arbitrary Full-2D Static Geometric (`x ∈ [-3.8,3.8], y ∈ [-2.15,1.55]`) | (6) Ideal-Lookahead Scripted Trajectory Simulation — *Not Human Player Performance* (`vy = 7.2 m/s`, `positionLerp`, `Δt ∈ [0.34,0.62]s`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`crystal`** (`r = 0.68 * size`, `N = 100k` / Forge `500k`) | **40.91%** (Forge: **41.3%**, Analytical 3-disk: **41.37%**) | **48.75%** | **84.93%** | **86.34%** (Forge: **86.8%**) | **100.00%** | Mobile: `42.2%` \| Desktop: `84.8%` \| Wave 1 2D (Ideal Lookahead): `93.1%` |
| **`buffOrb`** (`r = 0.72 * size`, `N = 100k` / Forge `500k`) | **43.26%** (Forge: **43.1%**, Analytical: **43.07%**) | **57.44%** | **87.77%** | **97.95%** (Forge: **98.0%**) | **100.00%** | Mobile: `44.0%` \| Desktop: `89.0%` \| Wave 1 2D (Ideal Lookahead): `95.0%` |
| **`powerOrb`** (`r = 0.72 * size`, `N = 100k` / Forge `500k`) | **44.71%** (Forge: **44.9%**, Analytical: **44.74%**) | **58.70%** | **89.52%** | **98.55%** (Forge: **98.6%**) | **100.00%** | Mobile: `45.0%` \| Desktop: `90.0%` \| Wave 1 2D (Ideal Lookahead): `95.5%` |
| **Weighted All Pickups** (`51.9%` crystal, `26.2%` powerOrb, `21.9%` buffOrb) | **41.48%** (`58.52%` unreachable) | **50.94%** (`49.06%` unreachable) | **85.94%** | **89.38%** (`10.62%` unreachable on desktop!) | **100.00%** | **Mobile: 43.00%** (`258/600`) \| **Desktop: 86.67%** (`520/600`) \| **Wave 1 2D (Ideal Lookahead): 93.83%** (`563/600`) |

### 3.3 Why Desktop Reachability is `~86.8%` (Not `100%`) and Why Ideal-Lookahead Collection is `< 100%` (`93.83%`)

1. **Why Desktop Transit-Aware Reachability is `< 100%` (`86.34%` / `86.8%` for Crystals):**
   On desktop, vertical movement covers `y ∈ [-2.15, +1.55]`, which spans the entire crystal vertical spawn range `[-2.0, +1.6]`. However, **desktop horizontal movement is still clamped to the three discrete lanes `player.targetX = player.targetLane * 2.2 ∈ [-2.2, +2.2]` (`src/game.js:4896`)**! Because crystals spawn across `x ∈ [-3.8, +3.8]`, any crystal with $|x| > 2.2 + R$ (where $R \in [0.994, 1.198]\text{ m}$, i.e., $|x| \in (3.194, 3.80]\text{ m}$) is **geometrically unreachable on desktop (`~13.2%` of crystals)**.
2. **Why Ideal-Lookahead Scripted Trajectory Collection (`93.83%`) Is Strictly Less Than Static Full-2D Geometric Coverage (`100.0%`) — And Distinct From Human Player Performance:**
   Even when an ideal-lookahead controller is granted full continuous 2D target bounds (`x ∈ [-3.8, +3.8], y ∈ [-2.15, +1.55]`), trajectory collection is governed by finite vertical slew velocity (`vy = 7.2 m/s`, requiring `0.51s` to traverse `3.70m` vertically) and horizontal exponential damping (`positionLerp = 1 - exp(-8.8 * dt)`). When consecutive pickups spawn `0.34s..0.62s` apart at opposite diagonal corners of the corridor (`Δx > 5.5m, Δy > 2.8m`), the ship cannot slew across the diagonal before the second pickup passes `z = -7.8m`, yielding **`93.83%` (`563/600`)** in our 600-pickup **ideal-lookahead simulation** (`Diagnostic B7`). This scripted figure is not human player performance; geometric coverage (`100.0%`), scripted ideal-lookahead trajectory success (`93.83%`), and physical human player success remain strictly distinct evidence classes.

---

## 4. Diagnostic C — Collision Truthfulness vs. Rendered Geometry (Correction 3: Production Debris Sizes & Rotations + Preserved Synthetic Control)

### 4.1 Three Compounding Sources of Visual-vs-Collider Divergence (`src/game.js`)

1. **Ship Z-Axis Lead Offset (`+0.45 m`):**
   In `renderPlayer()` (`src/game.js:5810`), the ship mesh is rendered at `shipZ = player.z + 0.45 = -7.35 m`, whereas `updateGame()` (`src/game.js:4959`) evaluates collisions around `player.z = -7.80 m` with a longitudinal slab `Math.abs(object.z - player.z) < 1.1` (`z ∈ [-8.90, -6.70]`). Consequently, hazards trigger collision at `z = -8.886 m`—**`1.5358 m` ahead of the rendered ship center (`z = -7.35 m`)**.
2. **Anisotropic & Rotated 3D Debris Geometry vs. Unrotated Isotropic Sphere Collider (`size * 0.82`):**
   `meshes.shard` (`src/game.js:1265-1284`) has raw vertices with `|x| <= 0.72` (top/bottom tips at `x = 0`, side vertices at `|x| = 0.56..0.72`), and `meshes.shipMk1` (`264` triangles loaded from `mk1-triangles.json`, rendered at scale `[0.72, 0.66, 0.88]` on desktop) has half-wingspan `max|x| = 0.5322 m` (smaller than `player.radius = 0.62 m`). Under 3D rotation `(rotX, rotY, rotZ)`, the projected 2D silhouette of `meshes.shard` frequently pulls inward while its sphere collider remains fixed at `radius = size * 0.82`.
3. **Corridor Curvature Displacement (`corridorPoint`):**
   `renderObjects()` (`src/game.js:5897`) transforms object positions through `corridorPoint(x, y, z, alphaTime)`, whereas `updateGame()` (`src/game.js:4965`) tests raw `(object.x, object.y)`.

### 4.2 Production-Valid Rotated Debris Phantom Hits (`size ∈ [0.85, 1.35]`) & Preserved Synthetic Control

Per Correction 3, we evaluated **4 production-valid debris sizes (`0.90m, 1.12m, 1.25m, 1.34m ∈ [0.85, 1.35]`) with representative 3D rotations** alongside the **preserved synthetic control (`size = 1.42m, rot = [0, 0, 0]`)**:

| Scenario ID | Classification | Debris `size` (m) | Collider Radius `0.82 * size` (m) | 3D Rotation `[rotX, rotY, rotZ]` (rad) | Debris `(x, y, z)` (m) | Combined Collider Radius (m) | 2D Center Distance (m) | Collider Margin (m) | Game Outcome (`state.hull`) | True 2D Mesh Vertex Gap (m) | Screen Mesh BBox Gap (px at `1280x800`) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`Prod-P1`** (`Diagnostic C2`) | **Production-Valid Debris** (Small-Med) | `0.90` | `0.7380` | `[0.35, 1.05, 0.50]` | `(1.26, -0.20, -7.80)` | `1.3580` | `1.2845` | **`-0.0735`** | **`Hull damaged (-1)`** | **`+0.3502 m`** (No overlap) | `+29.4 px` |
| **`Prod-P2` / `COLLISION_C4B`** | **Production-Valid Debris** (Medium) | `1.12` | `0.9184` | `[0.65, 1.20, 0.40]` | `(1.42, -0.22, -7.816)` | `1.5384` | `1.4385` | **`-0.0999`** | **`Hull damaged (-1)`** | **`+0.5394 m`** (CLI at `z=-7.80`: `+0.4477m`) | **`+43.73 px`** |
| **`Prod-P3` / `COLLISION_C4A`** | **Production-Valid Debris** (Large-Med — Screenshot `wave0_collision_phantom_hit_edge.png`) | `1.25` | `1.0250` | `[0.42, 0.88, 0.35]` | `(1.48, -0.18, -7.816)` | `1.6450` | `1.5044` | **`-0.1406`** | **`Hull damaged (-1)`** | **`+0.5355 m`** (CLI at `z=-7.80`: `+0.4368m`) | **`+36.00 px`** (`47.07 px` vertex dist) |
| **`Prod-P4`** (`Diagnostic C2`) | **Production-Valid Debris** (Upper-Prod) | `1.34` | `1.0988` | `[1.10, 0.55, 0.90]` | `(1.55, -0.15, -7.80)` | `1.7188` | `1.5788` | **`-0.1400`** | **`Hull damaged (-1)`** | **`+0.3815 m`** (No overlap) | `+31.8 px` |
| **`Control-C0` / `COLLISION_C4C`** | **Synthetic Diagnostic Control** (Non-Production `size > 1.35m`, unrotated) | `1.42` | `1.1644` | `[0.00, 0.00, 0.00]` | `(1.58, -0.15, -7.816)` | `1.7844` | `1.6082` | **`-0.1762`** | **`Hull damaged (-1)`** | **`+0.7816 m`** (`+0.6221 m` world X gap) | **`+41.11 px`** (`64.88 px` vertex dist) |
| **`COLLISION_C5_Z_LEAD`** | **Production-Valid Z-Lead Hit** (`wave0_collision_z_lead_offset.png`) | `1.28` | `1.0496` | `[0.30, 0.75, 0.20]` | `(0.00, -0.45, -8.886)` | `1.6696` | `0.0000` | **`-1.6696`** | **`Hull damaged (-1)`** | Hits **`1.5358 m` ahead** of rendered ship center (`z = -7.35m`) | `dzToRenderedShip = 1.5358 m` |

---

## 5. Visual Evidence Gallery (`Structure/evidence/wave0/`)

All 4 composite screenshots were captured from the live WebGL canvas + 2D telemetry overlay in `tools/test_wave0_in_browser.html`:

1. **Mobile Portrait Reachability (`393x873`, production multipliers `crystal r = 0.68 * size`, `orb r = 0.72 * size`):**
   - File: [wave0_mobile_portrait_reachability.png](file:///home/rkhol/workspaces/starfall-salvage/Structure/evidence/wave0/wave0_mobile_portrait_reachability.png)
   - Shows the ship locked at `y = -0.68m` (`NDC_y = -0.67`), the 3 magenta stationary lane reach circles (`x = -2.2, 0, +2.2`), reachable low crystals (`y = -0.68m, +0.22m`), and unreachable elevated pickups (`crystal y = 1.22m`, `powerOrb y = 1.18m`).
2. **Production-Valid Rotated Debris Phantom Edge Hit (`1280x800`, `size = 1.25m ∈ [0.85, 1.35]`, `rot = [0.42, 0.88, 0.35]`):**
   - File: [wave0_collision_phantom_hit_edge.png](file:///home/rkhol/workspaces/starfall-salvage/Structure/evidence/wave0/wave0_collision_phantom_hit_edge.png)
   - Shows `Hull: 2` (`Last: hull_hit (debris) colMargin=-0.1406m meshDist=0.5355m`) with the cyan ship sphere (`r = 0.62m`) overlapping the red debris sphere (`rCol = 1.025m`) while the green `SHIP MESH` bounding box and yellow rotated `debris` bounding box remain separated by `+0.4764m` horizontally (`+0.5355m` 2D vertex distance, `36.0px` screen gap).
3. **Production-Valid Z-Axis Lead Offset Hit (`1280x800`, `size = 1.28m`, `dz = 1.54m` ahead of rendered ship):**
   - File: [wave0_collision_z_lead_offset.png](file:///home/rkhol/workspaces/starfall-salvage/Structure/evidence/wave0/wave0_collision_z_lead_offset.png)
   - Shows `Hull: 2` triggered while the debris is at `z = -8.886m` (`1.5358m` in front of the rendered ship center at `z = -7.35m`).
4. **Desktop Vertical Steer Bottom Clipping (`1920x1080`, `y = -2.15m`, `NDC_y = -1.09`):**
   - File: [wave0_desktop_vertical_steer_bottom.png](file:///home/rkhol/workspaces/starfall-salvage/Structure/evidence/wave0/wave0_desktop_vertical_steer_bottom.png)
   - Shows the ship center clipped below the bottom viewport edge (`screenY = 1127.1px > 1080px`, `MeshInVP: 20%`).

---

## 6. Diagnostic D & E — Corrected Endpoint Inventory, Security Guards & Uncapped Performance Baseline

### 6.1 Correction 5 — Uncapped Headless Desktop WebGL Performance Telemetry (`Structure/wave0_diagnostic_receipt.json`)

> [!NOTE]
> **Evidence Category (`headless_desktop_webgl`):** The metrics below were captured in headless Chromium (`1280x729` WebGL buffer, `renderBudgetTier: "high"`) with the diagnostic 2D overlay disabled (`setOverlay(false)`). They establish the deterministic software/headless desktop WebGL baseline and **do not substitute for physical South African Android device telemetry**, which is required in Wave 1 acceptance testing.

| Metric Category | Metric Name | Measured Value (`PERF_BASELINE_UNCAPPED`) | Notes / Source |
| :--- | :--- | :---: | :--- |
| **Uncapped CPU Frame Execution Time** | `uncappedCpuRenderTimeMs` (`updateGame + updatePresentation + renderScene`) | **`p50 = 6.10 ms`**, `avg = 7.85 ms`, `min = 1.70 ms`, `p95 = 16.40 ms`, `p99 = 18.60 ms` (`N = 22` frames) | Unclamped `performance.now()` delta around synchronous CPU simulation + WebGL command submission. |
| **Uncapped `requestAnimationFrame` Interval** | `uncappedRafIntervalMs` (`time - lastRawRafMs`) | **`min = 66.7 ms`**, **`p50 = 199.9 ms`**, **`p95 = 249.9 ms`** (`N = 21` intervals) | Unclamped browser `requestAnimationFrame` callback cadence under headless software WebGL rasterization (`SwiftShader`). |
| **Capped Simulation Delta (Reference Only)** | `cappedSimDeltaReferenceMs` (`Math.min(0.033, dt)`) | `33.0 ms` (`p50 = 33.0 ms`) | Preserved only as a labeled reference showing why `Math.min(0.033, dt)` (`src/game.js:7311`) must not be used as frame-time evidence. |
| **Actual WebGL Draw Calls** | `glDrawCallsPerFrame` (`gl.drawElements` invocations per frame) | **`673` `gl.drawElements` calls / frame** | Counted directly inside `drawMesh()` (`src/game.js:5231`), replacing `state.rawDrawCalls` (`scenePassesPerFrame = 1`). |
| **JS Heap Memory** | `performance.memory.usedJSHeapSize` | **`5.78 MB`** (`6,057,789` bytes used / `14,488,285` bytes total) | Zero `new` allocations in `updateGame` or `renderScene` (`hot_path_audit.py`: `100%`). |

### 6.2 Correction 6 & 8 — Complete Endpoint Inventory & Local-Only Diagnostic Guards

| Endpoint & Method | Client Call Site (`src/game.js`) | Backend Handler (`backend/starfall_server.py`) | Ephemeral Local Backend (`127.0.0.1`) | Production (`starfallsalvage.kopanolabs.com`) | Security / Operating State |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **`GET /api/health`** | Health probe | `do_GET` (`line 225`) | `200 OK` (`{"ok": true}`) | **`404 Not Found`** (Read-only GET probe) | Confirms `backend/starfall_server.py` is **not mounted** on the static Vercel deployment (`vercel.json` has only `/hangar` static rewrites). |
| **`POST /api/signin`** | `signInOnlineAccount()` (`line 3834` via `requestJson`) | `do_POST` (`line 280`) | `200 OK` (`token`, `pilot`, `leaderboard`) | Unmounted (`404`; **zero POSTs sent to prod**) | Falls back to `localStorage` guest profile (`starfall.pilot.v2`) when offline/unmounted. |
| **`POST /api/score`** | `submitLeaderboardScore()` (`line 4252` via `requestJson`) | `do_POST` (`line 283`) | `200 OK` (`leaderboard` array) | Unmounted (`404`; **zero POSTs sent to prod**) | Falls back to `localStorage` (`starfall.leaderboard.v2`) + `KopanoVault` IndexedDB (`src/kopano-vault.js`). |
| **`GET /api/leaderboard`** | `refreshOnlineState()` (`line 3781` via `requestJson`) | `do_GET` (`line 235`) | `200 OK` (`leaderboard` array) | Unmounted (`404`) | Falls back to local seeded + player scores in `localStorage`. |
| **`GET /api/me`** | `refreshOnlineState()` (`line 3791` via `requestJson`) | `do_GET` (`line 244`) | `200 OK` (`pilot` object) | Unmounted (`404`) | Falls back to local pilot profile. |
| **`GET / POST /api/chat`** | `refreshOnlineState()` (`line 3782`), `sendChatMessage()` (`line 3905`) | `do_GET` (`line 239`), `do_POST` (`line 286`) | `200 OK` (`messages` array) | Unmounted (`404`; **zero POSTs sent to prod**) | Falls back to local `state.chatMessages`. |
| **Test-Only POSTs** (`/api/record_wave0`, `/api/save_screenshot`, `/api/record_journey`, `/api/record_upgrade`) | Harness-only (`tools/test_wave0_in_browser.html`) | **Absent** in `backend/starfall_server.py` (`404`); present only in `tools/serve_hangar.py` | `200 OK` from loopback; **`403 Forbidden`** when `X-Simulated-Public-Origin: 1` or non-local `Host` | Absent (`404`) | Guarded by `_is_local_diagnostic_request()` in `tools/serve_hangar.py`; `DIAG_ENABLED` in `src/game.js` is also gated by `isLocalDiagHost(window.location.hostname)`. |
| **OPS Access Code** (`hud.accessCodeInput`) | Client-side comparison (`src/game.js:3857`) | None | Client-side only | Client-side only | Registered for server-side hardening in backend sprint (literal code omitted from report). |

---

## 7. Correction 7 — Neutral POPIA-Compliant Guest Playtesting Checklist (South Africa)

1. **Zero Mandatory PII Collection for Playtesting:** Guest playtesters use auto-generated callsigns (`PILOT-XXXX`) stored exclusively in device-local `localStorage` / `IndexedDB` (`KopanoVault`). Do not collect real names, email addresses, phone numbers, or device hardware identifiers during Wave 1 playtests.
2. **Explicit Informed Consent (Adult & Minor Playtesters):** Under POPIA (Protection of Personal Information Act, 2013), obtain verbal/written consent from adult playtesters before recording screen captures or gameplay telemetry receipts. If any playtester is under 18, prior consent from a competent person (parent or legal guardian) is mandatory before participation.
3. **Local-Only Diagnostic Receipts:** Wave 0/1 diagnostic receipts (`wave0_diagnostic_receipt.json`) contain only viewport dimensions, anonymized frame timings, and in-game coordinates (`x, y, z, NDC`). No IP addresses, cookies, or session tokens are logged.
4. **Right to Reset / Erasure:** Playtesters can clear all local state at any time via browser site-data reset or `localStorage.clear()` + `indexedDB.deleteDatabase("KopanoVault")`.

---

## 8. Joint Wave 1 Flight Fairness Specification (AG + MINSTREL Reconciled)

In accordance with Forge CA Directives 1 & 2, **Wave 1 is strictly scoped to Flight Fairness, Steering Reachability, Collision Truthfulness, and Viewport Framing** (`src/game.js`).
- **Out of Scope for Wave 1 (Preserved for Later Sprints):**
  - The **one-rescue-per-run rule (`state.reviveAvailable = true` once per run)** remains **unchanged**.
  - All **three proposed cycling escape/revive mini-games** are preserved in design backlog for a subsequent sprint and will **not** be implemented in Wave 1.
  - No Hangar (`hangar/*`) modifications, shop, cosmetics, or backend deployment changes in Wave 1.

### 8.1 Two Distinct Control Candidates Preserved for Wave 1 Evaluation

Both control candidates unlock full-corridor horizontal and vertical reach (`x ∈ [-3.8, +3.8], y ∈ [-2.15, +1.55]`) so that **both mobile and desktop achieve `100.0%` static geometric reachability** (solving the `13.2%` desktop outer-X crystal blind spot and the `58.5%` mobile blind spot simultaneously):

| Control Candidate | Horizontal Steering ($X \in [-3.8, +3.8]\text{ m}$) | Vertical Steering ($Y \in [-2.15, +1.55]\text{ m}$) | Mobile & Desktop Parity |
| :--- | :--- | :--- | :--- |
| **Candidate A — Continuous 2D Direct-Delta / Virtual-Stick Steering** | Touch drag $(\Delta x, \Delta y)$ relative to pointer anchor (with dynamic anchor re-centering on direction reversal so continuous outer-to-center drags never suffer Case 4B override) + continuous analog/keyboard horizontal slew (`vx = 8.4 m/s`) across `[-3.8, +3.8]`. | Touch vertical drag $\Delta y$ maps continuously to `targetY ∈ [-2.15, +1.55]` (`normY` enabled on touch devices); keyboard `W/S/Up/Down` and pointer drag slew `targetY` at `vy = 7.8 m/s`. | **100.0%** static geometric reach on both mobile & desktop; **`>= 93.5%`** timed real-time collection on Seed `20261025`. |
| **Candidate B — Lane-Assisted Magnet + Vertical Slew Hybrid** | Preserves 3-lane snap assistance (`-2.2, 0, +2.2`) for quick lateral taps (`\|dx\| <= 32px` recovers center lane `0` cleanly, and continuous drag updates anchor at lane crossings to eliminate the Case 4B bug), while holding/dragging past outer lanes or holding `A/D/Left/Right` extends smoothly to the outer salvage shoulders `[-3.8, +3.8]`. | Vertical touch drag $\Delta y$ (or vertical thumb-zone slider) slews `targetY ∈ [-2.15, +1.55]` with soft spring return toward neutral cruise altitude (`y = -0.55m`) or hold-to-maintain altitude. | **100.0%** static geometric reach on both mobile & desktop; **`>= 92.0%`** timed real-time collection on Seed `20261025`. |

### 8.2 Wave 1 Revised Acceptance Criteria (Hard Automated Gates vs. Provisional Player-Validation Targets)

#### Part I — Hard Automated Invariants (`tools/test_gameplay_wave1_flight_fairness.mjs` + Headless WebGL)

| Gate ID | Hard Automated Invariant | Verification Requirement |
| :--- | :--- | :--- |
| **W1-HG1 (100% Geometric Collectible Reachability)** | All supported collectible positions (`crystal`, `powerOrb`, `buffOrb`) are geometrically reachable under both Candidate A and Candidate B on mobile and desktop (`x ∈ [-3.8, 3.8], y ∈ [-2.15, 1.55]`). | `100.0%` static geometric reachability across all 3 collectible classes for both Candidate A and Candidate B (`0` unreachable high-Y, low-Y, scallop-gap, or outer-X pickups). |
| **W1-HG2 (Zero Phantom Damage on Production-Valid & Synthetic Fixtures)** | No phantom damage in the known production-valid rotated debris regression fixtures (`Prod-P1..P4`: `0.90m, 1.12m, 1.25m, 1.34m`) or the preserved synthetic control fixture (`Control-C0`: `1.42m`), nor premature `1.54m` Z-lead damage (`COLLISION_C5`). | `0` hull hits across `Prod-P1..P4`, `Control-C0`, and premature `z = -8.89m` lead position (`hull` remains `3`). |
| **W1-HG3 (Reliable Genuine & Swept High-Speed / Low-FPS Collisions)** | Genuine head-on impacts, wing-clip impacts, and high-speed (`state.speed = 42 m/s`) / low-frame-rate (`dt = 0.050s`) swept-trajectory crossings continue to register reliably without tunneling. | `100%` hit registration across head-on, lateral wing-contact, and high-speed / low-FPS swept-contact test cases. |
| **W1-HG4 (Full Ship Mesh Visibility at All Movement Extremes)** | The full visible 264-triangle ship mesh (`inViewportRatio === 1.0`, not merely its projected center) remains inside the viewport across `393x873`, `873x393`, `1280x800`, `1920x1080`, and `2560x1080` at all tested movement extremes (`x ∈ {-3.8, 0, +3.8}, y ∈ {-2.15, -0.55, +1.55}`). | `inViewportRatio === 1.0` (`100%` of ship vertices inside frustum) across all 5 viewports and all extreme movement corners. |
| **W1-HG5 (Live Input Response & Case 4B Elimination)** | Input responds through the actual `updateGame(dt)` path on both Candidate A and Candidate B, preserves keyboard vertical/horizontal steering on touch-enabled laptops, and eliminates the continuous-drag center-lane override (`Case 4B`). | Both `Case 4A` (center tap) and `Case 4B` (continuous drag from `x = 40px` to `x = 196.5px`) settle cleanly at center (`x ≈ 0.00m`), and touch-capable keyboard steering updates `player.x` and `player.y`. |
| **W1-HG6 (Regression Suite Preservation)** | Existing Sovereign Hangar, discovery survey, hot-path zero-allocation (`100%`), and KC static audits remain green. | `npm run gate` exits `0`. |

#### Part II — Provisional Design Targets Requiring Physical Player & Android Device Validation

> [!IMPORTANT]
> **Separation of Ideal Scripted Targets vs. Human Player & Real-Device Evidence:**
> An ideal-lookahead controller reaching `93.83%` is **not** equivalent to a human or first-time player steering effectively, and headless desktop WebGL draw-call / CPU metrics are **not** substitutes for physical Android handset performance. The following remain **provisional design targets** pending physical adult playtesting and real Android device capture:
> 1. **Ideal-Lookahead Scripted Collection Rate (`>= 92%`):** Scripted benchmark only; human collection rate and control comprehension must be measured in live adult A/B playtesting.
> 2. **Camera NDC Margins, Follow Factors & Collider Feel:** Subject to player comfort and visual framing review by Robyn and MINSTREL.
> 3. **Input Slew Speeds & Sensitivity Tuning:** Subject to thumb-reach, overshoot, and fatigue feedback on Candidate A vs. Candidate B.
> 4. **Physical Android Performance (`glDrawCallsPerFrame` & Uncapped Frame Pacing):** The `~673` WebGL draw calls/frame baseline is treated as a mobile optimization target. Physical frame-time validation on an ordinary or lower-end South African Android handset (`uncappedRafIntervalMs` p50/p95) is required before performance acceptance.
> 5. **Child Participation HOLD:** Child playtesting remains on **HOLD** until guardian consent and safety review of guest identity prompts, chat surfaces, and feedback channels are completed.

---

## 9. Verification Commands & Reproducibility Receipts

```bash
# 1. Full deterministic + negative-control + hot-path + KC gate (0 failures)
npm run gate

# 2. Wave 0 positive diagnostic suite (34 / 34 checks passed)
npm run test:wave0

# 3. Wave 0 negative control suite (5 / 5 deliberate failure & guard controls passed)
npm run test:wave0-negative

# 4. Live headless WebGL browser campaign (26 / 26 steps passed + 4 PNG screenshots saved)
python3 tools/run_wave0_browser_audit.py
```
