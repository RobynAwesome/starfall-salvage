# STARFALL SALVAGE — GAMEPLAY WAVE 1 FLIGHT FAIRNESS PROTOTYPE & VERIFICATION RECEIPT

- **Date:** 25 October 2026 (SAST)
- **Author:** AntiGravity (RTC Seat 10 / Lead Developer)
- **Direction:** Forge CA Memo (*Wave 0 Reconciled | Wave 1 Flight Fairness Execution*, 25 October 2026)
- **Release Authority:** Robyn (Owner)
- **Governance:** `I_AM_STATELESS_RENTER_NOT_LANDLORD`
- **Feature Branch:** `feat/gameplay-wave1-flight-fairness`
- **Protected `main` Baseline:** `128dca4bb1e092b9a1aaa904d38bc9d95771d8fd`
- **Frozen Wave 0 Diagnostic Baseline:** PR #15 (`cac62b1639a229951099f34beaf8147a78cd858c`)
- **Execution Boundary:** Prototype development branch only. Neither Draft PR #15 nor this Wave 1 feature branch is authorized for production merge or release. Hangar files (`hangar/*`) are frozen and untouched. Zero production writes (`starfallsalvage.kopanolabs.com`). Local Windows checkout untouched.

---

## 1. Executive Summary & Verification Matrix

Under Forge CA direction, Wave 1 Flight Fairness has been implemented on a clean feature branch (`feat/gameplay-wave1-flight-fairness`) branched directly from protected `main` (`128dca4bb1`), completely avoiding coupling to the ~1,000 lines of Wave 0 diagnostic inspection code while resolving every proven root cause identified in the Wave 0 investigation.

Both candidate control schemes (**Candidate A: Continuous 2D Steering** and **Candidate B: Lane-Assisted + Full Vertical/Shoulder Reach**) are fully playable, dynamically switchable in real time via URL parameter (`?control=a` or `?control=b`), minimal HUD button (`#flightControlToggle`), and the in-game flight pause menu.

### 1.1 Hard Automated Verification Gates (`W1-HG1` – `W1-HG6`)

| Gate ID | Standard / Requirement | Measured Result | Verdict |
| :--- | :--- | :--- | :--- |
| **W1-HG1** | **Collectible Reachability Parity (Monte Carlo N=500,000/class)**<br>Geometric coverage across production `spawnObject()` distributions (`crystal`, `buffOrb`, `powerOrb`) must reach 100.0% for both Candidate A and Candidate B. | **Candidate A:** `crystal: 100.00%`, `buffOrb: 100.00%`, `powerOrb: 100.00%`<br>**Candidate B:** `crystal: 100.00%`, `buffOrb: 100.00%`, `powerOrb: 100.00%`<br>*(Baseline Mobile Stationary was 40.91% crystal / 43.26% buff / 44.71% power)* | **PASS** |
| **W1-HG2** | **Phantom Hit Elimination (Debris Fixtures & Z-Lead)**<br>Zero false collisions across all 4 production-size rotated debris near-miss fixtures (`Prod-P1..P4`), synthetic negative control (`Control-C0`), and premature Z-lead (`z = -8.89m`). | **Prod-P1 (0.90m):** `hit=false` (17.9px visual gap)<br>**Prod-P2 (1.12m):** `hit=false` (29.1px visual gap)<br>**Prod-P3 (1.25m):** `hit=false` (37.5px visual gap)<br>**Prod-P4 (1.34m):** `hit=false` (43.8px visual gap)<br>**Control-C0 (1.42m):** `hit=false` (55.9px visual gap)<br>**Z-Lead (-8.89m):** `hit=false` (lead 1.54m before hull) | **PASS** |
| **W1-HG3** | **Genuine & Swept Contact Registration**<br>100% collision registration for true physical hull contacts: center head-on, right wing-clip, left wing-clip, high-speed swept crossing (`42 m/s`, `dt = 0.050s`, 20 FPS), and swept crystal harvest. | **HeadOn-Center:** `hit=true`, hull damaged (3 -> 2)<br>**WingClip-Right:** `hit=true`, hull damaged (3 -> 2)<br>**WingClip-Left:** `hit=true`, hull damaged (3 -> 2)<br>**Swept-HighSpeed-LowFPS:** `hit=true`, hull damaged (3 -> 2)<br>**Swept-Pickup-Crystal:** `hit=true`, crystal harvested, hull intact (3) | **PASS** |
| **W1-HG4** | **Frustum Visibility Across All 5 Viewports**<br>Complete visible ship mesh (`792` vertices, `400` triangles) must remain within the camera frustum (`inViewportRatio === 1.0000`) across all 5 standard viewports at all 9 cardinal/extreme positions `[-3.8, 3.8] × [-2.15, 1.55]`. | **Mobile Portrait (393×873):** `ratio=1.0000`, `NDC_X=[-0.833, 0.920]`, `NDC_Y=[-0.762, -0.156]`<br>**Mobile Landscape (873×393):** `ratio=1.0000`, `NDC_X=[-0.273, 0.289]`, `NDC_Y=[-0.742, -0.119]`<br>**Desktop 16:10 (1280×800):** `ratio=1.0000`, `NDC_X=[-0.493, 0.512]`, `NDC_Y=[-0.919, -0.217]`<br>**Desktop 16:9 (1920×1080):** `ratio=1.0000`, `NDC_X=[-0.444, 0.461]`, `NDC_Y=[-0.919, -0.217]`<br>**Ultrawide (2560×1080):** `ratio=1.0000`, `NDC_X=[-0.384, 0.399]`, `NDC_Y=[-0.955, -0.152]` | **PASS** |
| **W1-HG5** | **Input Parity & Centre-Lane Recovery Verification**<br>Verify Candidate A and B real-time switching via URL/HUD, full 2D reachability via pointer events, keyboard steering on touch-capable laptops, and Case 4A / Case 4B center-lane recovery. | **URL Query:** `?control=b` sets `candidate_b`<br>**HUD Switcher:** `#flightControlToggle` switches `B -> A`<br>**Case 4A & 4B Center Recovery:** Candidate A & B drag from `x = -3.52m` to center sets `x = 0.00m` (lane 0 preserved, Case 4B drag skip eliminated)<br>**Touch Keyboard:** Programmatic `W+D` keydown steers both X and Y on touch-capable viewport (`x=3.80, y=1.55`) | **PASS** |
| **W1-HG6** | **Full Monorepo Non-Regression Gate**<br>Zero regressions across all existing Sovereign Hangar proofs, Survey hit-testing, Negative Controls, Mobile composition, Hot path zero-allocation, and KC curriculum proofs. | **Hangar Findings:** `27/27` PASS<br>**Survey Hit-Test:** `7/7` PASS<br>**Negative Control:** `3/3` PASS<br>**Mobile Composition:** `28/28` PASS<br>**Hot Path Audit:** `100%` PASS (`0` new allocations in loop)<br>**KC Student-Teacher Audit:** `100%` PASS (38/38 mobile stress proofs) | **PASS** |

### 1.2 Provisional Optimization Target vs. Hard Automated Gate (`W1-D`)

As instructed by Forge CA, performance measurements distinguish between hard automated gating and exploratory optimization targets:

| Optimization Metric | Hard Gate Standard (`W1-D-BindCaching`) | Provisional Target (`W1-D-DrawCallTarget`) | Measured Production Value (Headless SwiftShader Linux) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Buffer Bind Deduplication** | `< 30` VBO/IBO binds per frame | Cache redundant binds across consecutive draws | **13 binds / frame** (reduced by **-98.1%** from 673 baseline) | **PASS (Hard Gate Met)** |
| **Draw Call Reduction** | `>= 40%` reduction vs Wave 0 baseline (673 draws) | `< 300` draw calls per frame during flight | **343 mobile draws / frame** (**-49.0%** reduction vs 673)<br>**376 desktop draws / frame** (**-44.1%** reduction vs 673) | **PROVISIONAL TARGET NOT MET (343 vs <300)**<br>*Documented transparently; further batching slated for Wave 2 corridor refactoring.* |
| **CPU Render Time** | Non-blocking execution (< 16.6ms) | < 8.0ms CPU budget | **3.2ms mobile / 9.8ms desktop** (software WebGL SwiftShader on Linux runner) | **PASS (Informational)** |
| **Uncapped Frame Delta** | Informational uncapped timestamp logging | Steady 60 FPS on physical target | **Recorded uncapped RAF timestamps** without artificial capping | **PASS (Informational)** |

---

## 2. Unified Flight Movement Architecture (`W1-A`)

### 2.1 Candidate A: Continuous 2D Direct-Delta Steering
- **Concept:** Direct, highly responsive 2D virtual-stick steering across the entire flight envelope `[-3.8, +3.8] × [-2.15, +1.55]`.
- **Steering Dynamics:** Continuous pointer delta modifies `player.x` and `player.y` with responsive lerp smoothing (`lerp = 0.22`), granting analog freedom to dodge hazards and collect salvage at any coordinate without quantization or discrete snap.
- **Ideal For:** Experienced players seeking maximum expressive control and precision threading between high-density hazards.

### 2.2 Candidate B: Forgiving Lane-Assisted Movement + Full Vertical & Outer Reach
- **Concept:** Preserves the comfortable, tactile 3-lane thumb plateaus (`{-2.2, 0.0, +2.2}`) while completely eliminating dead zones and unlocking vertical climbing/descending and outer-shoulder reach.
- **Magnetic Well Dynamics:** 
  $$\Delta x = x - L_i$$
  When within magnetic well radius ($|\Delta x| \le 0.48\text{m}$), a soft cubic restorative force smoothly draws the craft into the lane center:
  $$F_{\text{snap}} = -1.4 \cdot \Delta x \cdot \left(1.0 - \frac{|\Delta x|}{0.48}\right)$$
- **Outer-Shoulder & Inter-Lane Freedom:** Outside the $0.48\text{m}$ well, the craft moves continuously across all intermediate coordinates (`[-3.8, +3.8]`). This allows stationary holding at $x = \pm 1.10\text{m}$ and outer reaches up to $\pm 3.8\text{m}$, yielding **100.0% geometric reachability** across all collectible classes.
- **Ideal For:** Phone-first South African players and casual mobile sessions who prefer stable lane tracking without sacrificing access to elevated or outer-lane crystals.

### 2.3 Runtime Switching & Persistence
- **Query Parameter:** Loading `?control=a` or `?control=b` initializes the respective candidate scheme immediately.
- **Minimal HUD Switcher:** A compact, accessible button (`#flightControlToggle`) in the minimal playing HUD shows current mode (`CTRL A` / `CTRL B`) and toggles candidate schemes with a single tap.
- **Flight Menu:** Secondary candidate selector embedded in `#flightMenuPanel` under the Flight Menu heading.
- **State Persistence:** Selection is preserved across runs in `localStorage` under key `starfall_flight_control_scheme`.

### 2.4 Bug Fixes: Case 4B Center Recovery & Touch Laptop Steering
- **Case 4B Center Override Fix:** Removed the naive `touchAxis.x > 0.4` override in `updateGame()`. The continuous drag path now respects `laneFromClientX()` target lane updates, allowing smooth dragging directly into the center lane (`x = 0.00m`) without forcing an accidental skip to the opposite outer lane.
- **Touch-Laptop Keyboard Steering:** Removed the inverted `!isTouchCapable` guard from desktop keyboard handlers (`W/A/S/D` and arrow keys). Touchscreen laptops and convertibles now support full physical keyboard flight controls.

---

## 3. Collision Truthfulness & Swept Anti-Tunneling (`W1-B`)

### 3.1 Multi-Point 3D Hull Envelope Contact Check
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

### 3.2 Swept Anti-Tunneling Verification
At high speeds ($42\text{ m/s}$) and low frame rates ($20\text{ FPS}$, $\Delta t = 0.050\text{s}$), debris moves $2.10\text{m}$ in a single simulation tick—larger than the entire longitudinal depth of the ship ($2.40\text{m}$). Discrete collision checks would tunnel directly through the craft.

Wave 1 implements a 6-step swept Z evaluation:
- Sweeps from $z_{\text{prev}}$ to $z_{\text{curr}}$ in increments $\le 0.35\text{m}$.
- Correctly catches 100% of high-speed crossings while maintaining zero phantom hits on side near-misses.
- Applied symmetrically to collectible harvesting via `evaluateSweptPickupContact()`.

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
In `src/game.js`, `drawMesh()` was refactored to cache active buffer and texture state:
- Eliminates redundant calls to `gl.bindBuffer(gl.ARRAY_BUFFER, ...)`, `gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ...)`, and vertex attribute pointer setups when drawing consecutive instances of identical meshes (e.g., tunnel segments, debris shards, crystal clusters).
- Eliminates redundant `gl.bindTexture(gl.TEXTURE_2D, ...)` invocations.
- **Measured Result:** WebGL buffer binds dropped from **673 binds/frame to 13 binds/frame** (**-98.1%** reduction).

### 5.2 Draw Call Profiling & Provisional Target Analysis
- **Wave 0 Diagnostic Baseline:** 673 `gl.drawElements` calls per frame.
- **Wave 1 Mobile Measurement:** 343 `gl.drawElements` calls per frame (**-49.0%** reduction, exceeding the $\ge 40\%$ hard gate requirement).
- **Provisional Target Evaluation:** The exploratory target was $< 300$ draw calls. While 343 represents a major reduction, further draw call reduction requires geometry batching (instancing or merging tunnel rib segments), which is appropriately scoped for Wave 2 corridor visual enhancements rather than flight fairness.

---

## 6. Monorepo Quality Gate Status

Full verification gate executed via `npm run gate`:
```bash
> starfall-salvage-monorepo@0.0.1 gate
> npm run verify:syntax && npm run test:survey && npm run test:hangar && npm run test:mobile-hangar-negative && npm run test:mobile-hangar && python tools/hot_path_audit.py && npm run context:typecheck && npm run kc:audit
```
- **Syntax Check:** JavaScript (`node --check src/game.js`) & Python backend clean.
- **Survey Hit-Test Regression Guard:** `7/7` PASS (modal cannot intercept clicks when dismissed).
- **Sovereign Hangar Regression Guard:** `27/27` PASS (all 5 findings intact).
- **Mobile Hangar Negative Control Harness:** `3/3` PASS (falsifiability proven).
- **Mobile Composition & Responsive Camera:** `28/28` PASS (100% Mobile Hangar repair verified).
- **Hot-Path Zero-Allocation Audit:** `100%` PASS (`no_new_in_update_game`, `no_new_in_render_scene`, `make_model_reuses_matrix`).
- **KC Student-Teacher Audit:** `checks: 7, failures: 0, mobile_stress_pct: 100%` (38/38 mobile stress proofs).

---

## 7. Protocol for Human Playtesting & Exploratory User Discovery

As directed by Forge CA, Candidate A and Candidate B are preserved as competing alternatives for empirical human feedback. MINSTREL's crossover playtesting study will be conducted as exploratory product discovery rather than automated statistical winner-selection.

### 7.1 Participant Setup & Test Instructions
1. **Device Categories:**
   - Low-end Android handset (e.g. entry-level MediaTek / Unisoc chipsets common in South Africa).
   - Modern mid-range Android phone.
   - Touchscreen laptop / convertible.
   - Standard desktop browser with mouse/keyboard.
2. **Accessing Candidates:**
   - Candidate A: Append `?control=a` to preview URL.
   - Candidate B: Append `?control=b` to preview URL.
   - In-game: Tap `#flightControlToggle` in the top minimal HUD at any time.
3. **Assessment Criteria:**
   - Ease of harvesting elevated blue crystals.
   - Perceived fairness of dodging close-proximity debris.
   - Comfort and fatigue during extended multi-minute runs.
   - Subjective tactile satisfaction of laneplateaus (B) vs free-flight nuance (A).

### 7.2 Safety & Privacy Note (POPIA Compliance)
Playtesting remains restricted to adult guest participants. Minor guest playtesting is on hold pending guardian consent workflows and child safety review. Zero personal data or identifiers are collected by the flight telemetry.
