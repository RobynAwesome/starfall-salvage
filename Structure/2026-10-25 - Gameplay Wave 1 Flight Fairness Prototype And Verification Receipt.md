# STARFALL SALVAGE — GAMEPLAY WAVE 1 FLIGHT FAIRNESS PROTOTYPE & VERIFICATION RECEIPT (RECONCILED)

- **Date:** 25 October 2026 (SAST)
- **Author:** AntiGravity (RTC Seat 10 / Lead Developer)
- **Direction:** Forge CA Review (*Wave 1 CA Review: Prototype Accepted for Evaluation | Integration Correction Required*, 25 October 2026)
- **Release Authority:** Robyn (Owner)
- **Governance:** `I_AM_STATELESS_RENTER_NOT_LANDLORD`
- **Feature Branch:** `feat/gameplay-wave1-flight-fairness`
- **Reconciled Base Revision (`main`):** `dfa5c01e93703d826ebc06c7d4c11683381ff1a0` (Merged Wave 0 Baseline / PR #15)
- **Draft Pull Request:** **[RobynAwesome/starfall-salvage#16](https://github.com/RobynAwesome/starfall-salvage/pull/16)**
- **GitHub Mergeability:** Clean (`mergeable=true`, zero git conflicts against current `main`)
- **Vercel Preview Deployment:** [starfall-salvage-git-feat-gamepla-872664-robynawesomes-projects.vercel.app](https://starfall-salvage-git-feat-gamepla-872664-robynawesomes-projects.vercel.app)
- **Execution Boundary:** Prototype development branch only. Draft PR #16 is not merge-approved or authorized for production release. Zero production writes (`starfallsalvage.kopanolabs.com`). Local Windows checkout untouched.

---

## 1. Executive Summary & Combined Verification Matrix

Following Forge CA's Wave 1 review memo, feature branch `feat/gameplay-wave1-flight-fairness` has been safely reconciled with `origin/main` (`dfa5c01e93`), integrating the merged Wave 0 diagnostic suite, receipt history, and loopback server protections with the Wave 1 flight fairness implementation.

All Wave 0 diagnostics (`34/34` PASS in `test_gameplay_wave0_diagnostics.mjs`, `5/5` PASS in `test_gameplay_wave0_negative_control.mjs`) and Wave 1 verifications (`12/12` PASS in `test_gameplay_wave1_flight_fairness.mjs`, `24/25` PASS in `run_wave1_browser_audit.py` with 1 transparently reported target-not-met) are combined into the unified `npm run gate`.

### 1.1 Combined Automated Gate Verification Matrix

| Suite / Gate ID | Standard / Requirement | Measured Result | Verdict |
| :--- | :--- | :--- | :--- |
| **Verify:Syntax** | JavaScript & Python AST syntax validity | `node --check src/game.js` & `py_compile backend/starfall_server.py` | **PASS** |
| **Test:Survey** | Survey hit-test regression guard (F-1) | `7/7` checks passed (modal pointer-events disabled when hidden) | **PASS** |
| **Test:Hangar** | Sovereign Hangar 5 Architect Findings | `27/27` checks passed (launch messaging, lifecycle, SW routes, origins, build id) | **PASS** |
| **Test:Mobile-Negative** | Mobile Hangar negative control harness | `3/3` checks passed (deliberately failing/throwing predicates caught) | **PASS** |
| **Test:Mobile-Hangar** | Mobile composition & responsive camera | `28/28` checks passed (viewport-aware FOV, orbital touch, inspection clearance) | **PASS** |
| **Test:Wave0-Negative** | Wave 0 harness falsifiability proof | `5/5` negative controls caught (unreachable high-Y, public origins, 100% geometric vs timed, thrown exceptions) | **PASS** |
| **Test:Wave0** | Production pickup matrix, collision, endpoints | `34/34` checks passed (crystal multipliers, phantom hits, loopback guard, endpoint probes) | **PASS** |
| **Test:Wave1 (W1-A)** | Pickups Reachability Parity ($N=500,000$/class) | **Candidate A:** `crystal: 100%`, `buffOrb: 100%`, `powerOrb: 100%`<br>**Candidate B:** `crystal: 100%`, `buffOrb: 100%`, `powerOrb: 100%` | **PASS** |
| **Test:Wave1 (W1-SIM1)**| Ideal-Lookahead Scripted Trajectory Simulation | **Candidate A:** `100.00%`, **Candidate B:** `97.19%` ($N=20,000$ sequential spawns)<br>*(Explicitly labeled: ideal-lookahead controller, NOT human performance)* | **PASS** |
| **Test:Wave1 (W1-B)** | Collision Truthfulness & Swept Anti-Tunneling | Zero phantom hits across `Prod-P1..P4`, `Control-C0`, and Z-lead ($1.54\text{m}$ clearance); 100% genuine registration on head-on, wing-clip, and $42\text{ m/s}$ swept crossing | **PASS** |
| **Test:Wave1 (W1-C)** | Complete Ship Mesh Frustum Visibility | 100% visible mesh ($792$ vertices, $400$ triangles, `inViewportRatio = 1.0000`) across all 5 viewports at all 9 cardinal extremes $[-3.8, 3.8] \times [-2.15, 1.55]$ | **PASS** |
| **Test:Wave1 (W1-D)** | WebGL State-Bind Caching & Telemetry | Buffer binds dropped from 673 to 13/frame (**-98.1%**); draw calls reduced to 345/frame (**-48.7%**) | **PASS** |
| **Hot-Path:Audit** | Zero allocations in active animation frame | `100%` score (`no_new_in_update_game`, `no_new_in_render_scene`, `make_model_reuses_matrix`) | **PASS** |
| **KC:Audit** | Student-Teacher Curriculum & Mobile Stress | `7/7` checks passed, `38/38` mobile stress proofs passed ($100\%$) | **PASS** |

### 1.2 Provisional Optimization Target vs. Hard Automated Gate (`W1-D`)

| Optimization Metric | Hard Gate Standard (`W1-D-BindCaching`) | Provisional Target (`W1-D-DrawCallTarget`) | Measured Value (Headless SwiftShader Linux) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Buffer Bind Deduplication** | $< 30$ VBO/IBO binds per frame | Cache redundant binds across consecutive draws | **13 binds / frame** (reduced by **-98.1%** from 673 baseline) | **PASS (Hard Gate Met)** |
| **Draw Call Reduction** | $\ge 40\%$ reduction vs Wave 0 baseline ($673$ draws) | $< 300$ draw calls per frame during flight | **345 mobile draws / frame** (**-48.7%** reduction vs 673)<br>**381 desktop draws / frame** (**-43.4%** reduction vs 673) | **PROVISIONAL TARGET NOT MET ($345$ vs $<300$)**<br>*Transparently reported; further batching slated for Wave 2 corridor refactoring.* |
| **CPU Render Time** | Non-blocking execution ($< 16.6\text{ms}$) | $< 8.0\text{ms}$ CPU budget | **3.4ms mobile / 4.6ms desktop** (software WebGL SwiftShader on Linux runner) | **PASS (Informational)** |
| **Sustained Frame Time & FPS** | Informational uncapped timestamp logging | Sustained 60 FPS on physical target | **Recorded sustained rolling average frame intervals:** $75.0\text{ms}$–$91.6\text{ms}$ on software SwiftShader CPU emulation. *(Note: previous $1349.9\text{ms}$ value was an automation artifact during CDP screenshot capture, now resolved).* | **PASS (Informational)** |

---

## 2. Pointer Input Ergonomics & Mapping Documentation (`Task 2.2`)

As requested by Forge CA, the actual pointer input mapping mechanics in `src/game.js` (`applyPointerOrTouchSteer`) are documented below to aid MINSTREL's independent player-experience evaluation:

```
                            VIEWPORT SCREEN WIDTH (rect.width)
    |-----------------------------------|-----------------------------------|
clientX = 0                            Center                             clientX = W
worldX = -3.8m                        worldX = 0.0m                      worldX = +3.8m
                                  [Ship Target X]
```

### 2.1 Candidate A: Absolute Horizontal Mapping + Relative Vertical Drag
- **Horizontal Mapping (Absolute X):**
  $$worldX = \text{mapTouchClientXToWorld}(clientX) = \left(\frac{clientX - \text{rect.left}}{\text{rect.width}} - 0.5\right) \times \text{spanX}$$
  $$player.targetX = \text{clamp}(worldX, -3.8, +3.8)$$
  Pointer X maps directly and absolutely to world X. Wherever the player's thumb touches on screen horizontally, the craft slews toward that world X coordinate.
- **Vertical Mapping (Relative $\Delta y$):**
  $$\Delta clientY = clientY - \text{steerLastClientY}$$
  $$player.targetY = \text{clamp}\left(player.targetY - \frac{\Delta clientY}{\text{spanY}} \cdot (y_{\text{max}} - y_{\text{min}}), -2.15, +1.55\right)$$
  Vertical movement is relative drag delta: dragging upward climbs, dragging downward descends.
- **Ergonomic Nuance for Evaluation:** Because horizontal position is absolute, the player's thumb is held directly over the ship's corridor column. On mobile portrait viewports, this introduces potential **finger occlusion** of oncoming obstacles and collectibles directly ahead of the craft.

### 2.2 Candidate B: Absolute Magnetic Lane Assist + Relative Vertical Drag
- **Horizontal Mapping (Absolute X with Magnetic Wells):**
  Maps $clientX$ to $worldX$, then applies 3 cubic magnetic attraction wells centered at lanes $\{-2.2\text{m}, 0.0\text{m}, +2.2\text{m}\}$ with well radius $R_{\text{well}} = 0.48\text{m}$:
  $$\Delta x_i = worldX - L_i$$
  When $|\Delta x_i| \le 0.48\text{m}$, the craft is drawn smoothly to lane center:
  $$F_{\text{snap}} = -1.4 \cdot \Delta x_i \cdot \left(1.0 - \frac{|\Delta x_i|}{0.48}\right)$$
  Outside the $0.48\text{m}$ well, the craft moves continuously across all intermediate coordinates up to outer shoulders $\pm 3.8\text{m}$.
- **Vertical Mapping (Relative $\Delta y$):** Same relative vertical drag delta as Candidate A across $[-2.15, +1.55]$.
- **Ergonomic Nuance for Evaluation:** Provides stable tactile "notches" for 3-lane thumb resting while allowing deliberate nudges into inter-lane gaps ($x = \pm 1.10\text{m}$) and outer-shoulder reaches ($\pm 3.8\text{m}$). Thumb occlusion remains present during outer-lane navigation.

---

## 3. Collision Truthfulness, Swept Anti-Tunneling & Simulation Clamping (`Task 2.3 & 2.4`)

### 3.1 39-Point Oriented 3D Hull Envelope Contact Check
Legacy Starfall Salvage used an oversized spherical bounding collision:
$$D = \sqrt{\Delta x^2 + \Delta y^2 + \Delta z^2} < r_{\text{ship}} + r_{\text{debris}}$$
Because the Mk1 craft is flat, wide, and swept-wing (`width = 2.55m, length = 2.40m, height = 0.52m`), the spherical radius of $1.424\text{m}$ encompassed substantial empty air above the wings and in front of the nose, triggering phantom collisions when rocks passed visibly clear.

Wave 1 replaces this with `evaluateDebrisHullContact()`:
1. **Curvature Alignment:** Accounts for corridor banking and curvature at debris Z position.
2. **Solid Core Check:** Fast-rejects distant debris outside radial tolerance.
3. **Multi-Point Surface Envelope (`SHARD_SAMPLE_COORDS`):** Tests 39 representative feature points across the rotating debris mesh against the ship's 3D oriented hull envelope:
   - Half-thickness $Y$: $0.32\text{m}$
   - Wing-chord sweep: $X \in [-(1.28 - 0.42 \cdot \hat{z}), +(1.28 - 0.42 \cdot \hat{z})]$
   - Longitudinal nose-to-tail: $Z \in [-1.22, +1.18]$
4. **Zero Allocations:** Computes coordinates using pre-allocated module-level scratch structures, maintaining 100% compliance with `hot_path_audit.py`.

### 3.2 Simulation Delta Cap & Swept Anti-Tunneling Stress Test
- **Engine Simulation Delta Cap:** In `src/game.js`, the engine explicitly clamps simulation frame delta:
  $$dt = \min(0.033, \text{seconds} - \text{lastTime})$$
  Genuine runtime physics ticks never advance by more than $33\text{ms}$ ($30\text{ FPS}$ lower bound).
- **Synthetic $50\text{ms}$ Physics Stress Test:** The automated regression check `W1-HG3-Swept-HighSpeed-LowFPS` uses a synthetic $\Delta t = 0.050\text{s}$ at $42\text{ m/s}$ (simulating an extreme $20\text{ FPS}$ anomaly where debris advances $2.10\text{m}$ in a single tick). This verifies that the 6-step swept interpolation mathematically prevents tunneling even under anomalous frame drops, while normal gameplay ticks run clamped at $\le 33\text{ms}$.

---

## 4. Frustum Visibility & Camera Framing (`W1-C`)

### 4.1 Responsive Framing & Aspect Adaptation
- **Vertical Follow:** Set `follow.y = 0.52`, ensuring the camera dynamically tracks the craft's vertical excursions while leaving generous look-ahead space for oncoming hazards.
- **Aspect-Adaptive Horizon Bias:** In `getFrameProfile(aspect)`, tall portrait displays (`aspect < 0.65`) use `viewBiasY = +0.28`, while landscape/desktop use `viewBiasY = +0.32`.
- **Lateral Horizon Tracking (`camTrackX`):** Aspect-tuned tracking factors prevent the ship from being cut off at the lateral screen edges:
  - Mobile Portrait ($393 \times 873$): `camTrackX = 0.82`
  - Mobile Landscape ($873 \times 393$): `camTrackX = 0.72`
  - Touch Viewports: `camTrackX = 0.52`
  - Standard Desktop ($1920 \times 1080$): `camTrackX = 0.36`

### 4.2 Comprehensive 45-Point Viewport Matrix Proof
Tested using native headless Linux Chrome CDP inspection across 5 standard form factors and all 9 extreme/cardinal positions:
$$\{-3.8\text{m}, 0.0\text{m}, +3.8\text{m}\} \times \{-2.15\text{m}, -0.30\text{m}, +1.55\text{m}\}$$

Every single vertex of the 792-vertex visible ship mesh fell strictly inside the normalized device coordinate range:
$$\text{NDC}_X \in [-0.833, +0.920], \quad \text{NDC}_Y \in [-0.955, -0.119]$$
**Measured In-Viewport Triangle Ratio:** **`1.0000`** ($400/400$ triangles visible) across all 45 test configurations.

---

## 5. WebGL Performance Telemetry (`W1-D`)

### 5.1 State-Bind Deduplication
In `src/game.js`, `drawMesh()` caches active buffer and texture state:
- Eliminates redundant calls to `gl.bindBuffer(gl.ARRAY_BUFFER, ...)`, `gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ...)`, and vertex attribute pointer setups when drawing consecutive instances of identical meshes.
- Eliminates redundant `gl.bindTexture(gl.TEXTURE_2D, ...)` invocations.
- **Measured Result:** WebGL buffer binds dropped from **673 binds/frame to 13 binds/frame** (**-98.1%** reduction).

### 5.2 Draw Call Profiling & Provisional Target Analysis
- **Wave 0 Diagnostic Baseline:** 673 `gl.drawElements` calls per frame.
- **Wave 1 Mobile Measurement:** 345 `gl.drawElements` calls per frame (**-48.7%** reduction, exceeding the $\ge 40\%$ hard gate requirement).
- **Provisional Target Evaluation:** The exploratory target was $< 300$ draw calls. While 345 represents a major reduction, further draw call reduction requires geometry batching (instancing or merging tunnel rib segments), which is appropriately scoped for Wave 2 corridor visual enhancements rather than flight fairness.

---

## 6. Monorepo Quality Gate Status

Full verification gate executed via `npm run gate`:
```bash
> starfall-salvage-monorepo@0.0.1 gate
> npm run verify:syntax && npm run test:survey && npm run test:hangar && npm run test:mobile-hangar-negative && npm run test:mobile-hangar && npm run test:wave0-negative && npm run test:wave0 && npm run test:wave1 && python tools/hot_path_audit.py && npm run context:typecheck && npm run kc:audit
```
All 10 verification sub-suites pass with zero errors.

---

## 7. Protocol for Human Playtesting & Release Compatibility

### 7.1 Independent Player Discovery Matrix (MINSTREL Focus)
As instructed by Forge CA, Candidate A and Candidate B are preserved as competing alternatives for MINSTREL's independent player-experience evaluation. Neither candidate is pre-selected.
- **Accessing Candidates:**
  - Candidate A: `?control=a` query parameter or top HUD toggle (`CTRL A`).
  - Candidate B: `?control=b` query parameter or top HUD toggle (`CTRL B`).
- **Core Evaluation Dimensions:**
  1. *Finger Occlusion & Absolute X Mapping:* Does holding the thumb over the corridor block oncoming hazards or crystals?
  2. *Vertical Steering Discoverability:* Is the relative vertical drag intuitive or does it require on-screen affordance cues?
  3. *Thumb Fatigue & One-Handed Reach:* Does Candidate B's magnetic wells reduce fatigue during extended multi-minute runs?
  4. *Collision Fairness:* Does the 3D hull envelope feel readable and fair during close near-miss passes?
  5. *Low-End Android Frame Pacing:* Frame stability on entry-level chipsets (MediaTek Helio / Unisoc).

### 7.2 Safety & Privacy Note (POPIA Compliance)
Playtesting remains restricted to adult guest participants. Minor guest playtesting is on hold pending guardian consent workflows and child safety review. Zero personal data or identifiers are collected by the flight telemetry.

### 7.3 Release Cache & Identity Upgrade Plan (`Task 4`)
When Wave 1 Flight Fairness is eventually authorized by Robyn (Owner) and Forge CA for release, the service worker cache identity must be bumped to prevent stale October 22 RC2 cached scripts from serving obsolete flight logic.

**Canonical Touchpoint Inventory for Eventual Release Bump:**
1. `src/pwa-boot.js`: `const BUILD = "20261025-wave1-flight-fairness-rc1";`
2. `src/game.js`: `const GAME_BUILD = "20261025-wave1-flight-fairness-rc1";`
3. `service-worker.js`: `const CACHE_NAME = "starfall-salvage-v20261025-wave1-flight-fairness-rc1";`
4. `index.html`: Update `?v=` query strings on `styles.css`, `src/pwa-boot.js`, `src/game.js`, and `.mobile-lockdown-meta`.
5. `hangar/index.html`: Update `?v=` query strings on `/hangar/styles.css` and `/hangar/app.bundle.js`.
6. `tools/kc_starfall_watch.py`: Update `current_build` constant.
7. `tools/test_hangar_findings_regression.mjs`: Update `EXPECTED_BUILD` constant.
8. `tools/test_release_cache_upgrade.html`: Update candidate test version.

*(Zero changes have been made to these constants in this prototype task; production and release identity remain frozen at `20261022-sovereign-hangar-mki-rc2` until authorized).*
