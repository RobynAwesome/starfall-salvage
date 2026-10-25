# Starfall Salvage · Gameplay Recovery Sprint — Wave 0 Fairness & Telemetry Audit

- **Date:** 2026-10-25 (SAST)
- **Sprint Stage:** Wave 0 (Baseline & Diagnostic Instrumentation Only — No Gameplay Balance, Movement, or Collision Rule Mutations)
- **Branch:** `audit/gameplay-wave0-fairness-telemetry`
- **Source Baseline:** `RobynAwesome/starfall-salvage` `main` at `128dca4bb1e092b9a1aaa904d38bc9d95771d8fd` (including merged PR #13 `8df8b32` and PR #14)
- **Owner / Sovereign Authority:** Kholofelo Robyn Rababalela
- **Chief Architect (CA):** Forge
- **Lead Developer:** AntiGravity (AG / RTC Seat 10)
- **Governance:** `I_AM_STATELESS_RENTER_NOT_LANDLORD`

---

## 1. Executive Summary & Boundary Compliance

Per Forge CA authorization, Wave 0 implements **strictly opt-in diagnostic telemetry and visual collider/reachability overlays** gated behind `?diag=1` (`DIAG_ENABLED`) on isolated branch `audit/gameplay-wave0-fairness-telemetry`.

- **Zero Hot-Path or Baseline Mutations:** When `?diag=1` is absent, zero diagnostic code executes, `createMesh` does not allocate `rawPositions`, `randomRange` uses native `Math.random()`, and `tools/hot_path_audit.py` passes at **100%** (`no_new_in_update_game: True`, `no_new_in_render_scene: True`).
- ** Untouched Baselines:** The Sovereign Hangar (`hangar/*`) and the Windows checkout (`/mnt/c/Users/rkhol/starfall-salvage`) remain 100% untouched.

---

## 2. Deliverable 1 — Deterministic Seeds & Replay Instructions

### 2.1 Opt-In URL Parameters & Console API (`?diag=1`)
When `src/game.js` is loaded with `?diag=1` (and optional `&overlay=1`), `window.__starfallWave0` exposes deterministic PRNG seeding (`mulberry32`), manual frame-stepping, world-to-NDC/screen projection, 3D mesh-vertex vs. bounding-sphere distance calculation, and pre-configured visual scenarios:

| Replay Scenario | Exact URL / Command | Purpose |
| :--- | :--- | :--- |
| **Mobile Portrait Reachability (`393x873`)** | `http://localhost:8799/?diag=1&overlay=1&diagScenario=mobile_reachability` | Renders locked `y = -0.68m` touch horizon, 3 lane reachability circles (`x ∈ {-2.2, 0, +2.2}`), reachable crystals (`y = -0.68m`), scallop-gap crystal (`x = 1.10, y = +0.22m`), and unreachable elevated pickups (`y = +1.18m..+1.22m`). |
| **Phantom Edge Hit (`1280x800`)** | `http://localhost:8799/?diag=1&overlay=1&diagScenario=collision_phantom_hit` | Steps and freezes a `debris` hazard (`size = 1.42, r = 1.164m`) at `(1.58, -0.15, -7.80)` against MK-I at `(0, -0.45, -7.80)`, proving `"Hull damaged"` triggers while 3D mesh hulls have `+0.6219m` (`48.64px`) of empty space between them. |
| **Z-Axis Lead Offset (`1280x800`)** | `http://localhost:8799/?diag=1&overlay=1&diagScenario=collision_z_offset` | Demonstrates `+0.45m` Z offset (`player.z = -7.80` collider vs `shipZ = -7.35` rendered ship) + `-1.10m` slab depth, triggering collision `1.545m` ahead of the rendered ship center. |
| **Desktop Downward Steer Clipping (`1920x1080` / `2560x1080`)** | `http://localhost:8799/?diag=1&overlay=1&diagScenario=desktop_bottom_clip` | Positions ship at `player.y = -2.15` (`bounds.yMin`), reproducing complete bottom-frustum disappearance (`NDC_y = -1.2037`, `inViewportRatio = 0%`). |
| **Deterministic Monte Carlo Seed `20261025`** | `node tools/test_gameplay_wave0_diagnostics.mjs` or `window.__starfallWave0.generatePickupGridAudit(20261025, 200)` | Evaluates $N = 1,000$ (CLI) and $N = 200$ (browser) deterministic pickup placements across full `crystal` and `orb` spawn domains. |

---

## 3. Deliverable 2 — Genuine Rendered Browser Diagnostic Screenshots

Captured via headless Microsoft Edge (`Edg/157.0.0.0`, WebGL active) in `tools/run_wave0_browser_audit.py` and stored in `Structure/evidence/wave0/`:

1. **[`wave0_mobile_portrait_reachability.png`](file:///home/rkhol/workspaces/starfall-salvage/Structure/evidence/wave0/wave0_mobile_portrait_reachability.png)** (`393x873`, `244.2 KB`) — Visualizes the locked `y = -0.68m` touch line, reachable center & between-lane crystals (`x = 0.0` and `x = 1.02` at `y = -0.68m`), unreachable scallop-gap crystal (`x = 1.10, y = +0.22m`), and unreachable elevated pickups (`y = +1.18m..+1.22m`).
2. **[`wave0_collision_phantom_hit_edge.png`](file:///home/rkhol/workspaces/starfall-salvage/Structure/evidence/wave0/wave0_collision_phantom_hit_edge.png)** (`1280x800`, `491.0 KB`) — Visualizes the green MK-I rendered mesh bounding box and amber debris bipyramid mesh bounding box separated by `+0.6219m` world / `48.64px` screen (`minMeshVertexDistScreen_Px = 71.03px`), while the cyan (`r = 0.62m`) and red (`r = 1.16m`) dashed collider spheres overlap by `0.1762m` and trigger `hull_hit`.
3. **[`wave0_collision_z_lead_offset.png`](file:///home/rkhol/workspaces/starfall-salvage/Structure/evidence/wave0/wave0_collision_z_lead_offset.png)** (`1280x800`, `514.6 KB`) — Visualizes early Z-axis collision at `z = -8.85m` (`1.50m` ahead of the rendered ship at `shipZ = -7.35m`).
4. **[`wave0_desktop_vertical_steer_bottom.png`](file:///home/rkhol/workspaces/starfall-salvage/Structure/evidence/wave0/wave0_desktop_vertical_steer_bottom.png)** (`1920x1080`, `802.7 KB`) — Visualizes the ship steered down to `y = -2.15m`, projecting to `NDC_y = -1.2037` (`screenY = 1141.5px > 1080px`, `MeshInVP: 0%`), completely off the bottom edge of the viewport.

---

## 4. Deliverable 3 — Quantified Mobile vs. Desktop Flight Input, Viewport & Reachability Results

### 4.1 Code-Backed Input Constraints (`src/game.js`)
1. **Touch Vertical Zeroing (`src/game.js:1612-1614`):** `applySteerVector` explicitly forces `if (isTouchCapable) { touchAxis.y = 0; }`.
2. **Touch Target-Y Lock & Unreachable Dead Branch (`src/game.js:4870-4888`):**
   - When `isTouchCapable` is true, `player.targetY` is clamped to `MOBILE_LANE_TARGET_Y = -0.68` every frame.
   - Keyboard vertical steering (`W`/`S`/`ArrowUp`/`ArrowDown`) is gated behind `if (!isTouchCapable)`, disabling vertical keyboard control on touch-enabled laptops/hybrids.
   - Line 4883 (`else if (Math.abs(touchAxis.x) < 0.1)`) is nested inside `if (Math.abs(touchAxis.x) > 0.4)` (line 4878) — mathematically unreachable dead code.

### 4.2 Multi-Viewport & Desktop Ship-Disappearance Matrix
Verified in headless Edge (`Structure/wave0_diagnostic_receipt.json`):

| Viewport / Test Case | Resolution | Aspect | `renderFov` | `playPitch` | `cameraDepth` | Ship `y` | Ship Center `NDC_y` | Screen `Y` (px) | `inViewportRatio` | Verdict / Mechanism |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Mobile Portrait** | `393x873` | `0.450` | `51.10°` | `0.26 rad` | `-2.95m` | `-0.68m` | `-0.6961` | `740.3 / 873` | `100%` | Visible in lower third; locked at `y = -0.68m`. |
| **Mobile Landscape** | `873x393` | `2.221` | `39.48°` | `0.18 rad` | `-2.48m` | `-0.68m` | `-0.7542` | `344.7 / 393` | `100%` | Visible near bottom edge (`48.3px` margin). |
| **Desktop 16:10 (Spawn Y)** | `1280x800` | `1.600` | `44.13°` | `0.21 rad` | `-2.72m` | `-0.45m` | `-0.6610` | `664.4 / 800` | `100%` | Visible at spawn height. |
| **Desktop 16:9 (Spawn Y)** | `1920x1080` | `1.778` | `44.13°` | `0.21 rad` | `-2.72m` | `-0.45m` | `-0.6853` | `873.0 / 1080` | `100%` | Visible at spawn height. |
| **Desktop 21:9 (Spawn Y)** | `2560x1080` | `2.370` | `39.48°` | `0.18 rad` | `-2.48m` | `-0.45m` | `-0.6849` | `872.8 / 1080` | `100%` | Visible at spawn height. |
| **Case D1: Plain Wheel Scroll** | `1920x1080` | `1.778` | `44.13°` | `0.21 rad` | `-2.72m` | `-0.45m` | `-0.6849` | `872.8 / 1080` | `100%` | `scrollY = 0` (`overflow: hidden`); plain wheel does not move flight ship. |
| **Case D2: `Ctrl+Wheel` / Zoom** | `1920x1080` | `1.778` | `44.13°` | `0.21 rad` | `-2.72m` | `-0.45m` | `-0.6849` | `872.8 / 1080` | `100%` | Fixed viewport shell resizes with zoom; ship stays at `NDC_y = -0.6849`. |
| **Case D3: Downward Steer (16:9)** | `1920x1080` | `1.778` | `44.13°` | `0.21 rad` | `-2.72m` | **`-2.15m`** | **`-1.2037`** | **`1141.5 / 1080`** | **`0%`** | **CONFIRMED DISAPPEARANCE:** `cameraFollow.y = 0.016` fails to track downward `y = -2.15m` while `playPitch` pitches camera down. |
| **Case D3: Downward Steer (21:9)** | `2560x1080` | `2.370` | `39.48°` | `0.18 rad` | `-2.48m` | **`-2.15m`** | **`-1.2036`** | **`1141.5 / 1080`** | **`0%`** | **CONFIRMED DISAPPEARANCE:** Ship completely exits bottom frustum (`NDC_y < -1.0`). |
| **Case D4: Aspect > 1.85 Resize** | `1920x900` | `2.133` | `39.48°` | `0.18 rad` | `-2.48m` | **`-1.95m`** | **`-1.1407`** | **`894.8 / 900`** | **`0%`** | **CONFIRMED DISAPPEARANCE:** Crossing `aspect > 1.85` drops `fovScale` to `0.68` and `viewBiasY` to `-0.06`, clipping ship even at `y = -1.95m`. |

### 4.3 Quantified Pickup Reachability Matrix (Deterministic Seed `20261025`, $N = 1,000$)
`spawnPickup` (`src/game.js:4603-4636`) spawns:
- **`crystal` (72%):** `x ∈ [-3.8, 3.8], y ∈ [-2.0, 1.6], size ∈ [0.64, 0.96], radius = 0.58 * size ∈ [0.371m, 0.557m]`, combined collection radius $R = 0.62 + r \in [0.991\text{m}, 1.177\text{m}]$.
- **`orb` (`powerOrb` / `buffOrb`, 28%):** `x ∈ [-3.2, 3.2], y ∈ [-1.7, 1.3], size ∈ [0.62, 0.88], radius = 0.78 * size ∈ [0.484m, 0.686m]`, combined collection radius $R = 0.62 + r \in [1.104\text{m}, 1.306\text{m}]$.

| Pickup Class | Sample Count ($N$) | Mobile Stationary 3-Lane (`x ∈ {-2.2,0,2.2}, y=-0.68`) | Mobile Transient Lane-Lerp (`x ∈ [-2.2,2.2], y=-0.68`) | Desktop Stationary 3-Lane + Vertical Y | Desktop Transient Lerp + Vertical Y | Proposed Wave 1 Continuous 2D (`x ∈ [-3.8,3.8], y ∈ [-2.15,1.55]`) | Mobile Failure Breakdown (`Stationary`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Crystals** | `741` | **`41.2%`** (`305/741`) | **`51.3%`** (`380/741`) | `71.0%` (`526/741`) | `88.0%` (`652/741`) | **`100.0%`** (`741/741`) | `HIGH_Y`: `224` (`30.2%`), `OUTER_X`: `84` (`11.3%`), `SCALLOP_GAP`: `75` (`10.1%`), `LOW_Y`: `53` (`7.2%`) |
| **Orbs (`powerOrb`/`buffOrb`)** | `259` | **`66.4%`** (`172/259`) | **`73.7%`** (`191/259`) | `94.2%` (`244/259`) | `100.0%` (`259/259`) | **`100.0%`** (`259/259`) | `HIGH_Y`: `61` (`23.6%`), `SCALLOP_GAP`: `19` (`7.3%`), `OUTER_X`: `7` (`2.7%`), `LOW_Y`: `0` (`0.0%`) |
| **Combined Total** | `1,000` | **`47.7%`** (`477/1000`) | **`57.1%`** (`571/1000`) | `77.0%` (`770/1000`) | `91.1%` (`911/1000`) | **`100.0%`** (`1000/1000`) | **`52.3%` unreachable on mobile stationary (`42.9%` even with perfect lane-lerp timing)** |

#### Nuanced Geometric Proofs (Verified by Edge Cases `B1`–`B4` in `tools/test_gameplay_wave0_diagnostics.mjs`):
- **Not every between-lane X placement is unreachable (`B1`):** At $y = -0.68\text{m}$, the three lane centers (`-2.2, 0, +2.2`) are separated by $2.2\text{m}$ ($1.1\text{m}$ half-gap). Whenever $R = 0.62 + r_{\text{pickup}} \ge |x - x_{\text{lane}}|$, a between-lane pickup at $y \approx -0.68\text{m}$ (e.g., `x = 1.05, y = -0.68, size = 0.80 -> R = 1.084m >= 1.05m`) IS reachable even from a stationary lane.
- **Scallop gaps between lanes (`B2`):** When $|y - (-0.68)|$ increases toward $R$ (e.g., `x = 1.10, y = +0.20, size = 0.82 -> R = 1.096m, dy = 0.88m`), the horizontal reach from each stationary lane shrinks to $\sqrt{R^2 - \Delta y^2} = \sqrt{1.096^2 - 0.88^2} = 0.653\text{m} < 1.10\text{m}$, opening an unreachable scallop gap from stationary lanes that is only reachable by timing a transient lane-lerp across $x = 1.10$.
- **Elevated high-Y lock (`B3`):** Whenever $y > -0.68 + R$ (i.e., $y \gtrsim +0.42\text{m}$ to $+1.60\text{m}$), $\Delta y > R$, so **0%** of pickups are reachable on mobile under either stationary or transient lane-lerp steering.
- **Outer-X clamp (`B4`):** Because `player.targetX` is restricted to `{-2.2, 0, +2.2}` on both mobile and desktop, crystals spawned at $|x| > 2.2 + R \approx 3.25..3.80\text{m}$ (`11.3%` of crystals) are unreachable even on desktop unless `player.targetX` can reach full `playerBounds` (`[-3.8, +3.8]`).

---

## 5. Deliverable 4 — Collision Truthfulness Analysis & Reproducible Test Suite

### 5.1 Three Independent Mechanisms of Visual-vs-Collider Divergence
1. **Mechanism C1 — Ship Z-Axis Lead Offset (`+0.45m`) + Slab Depth (`±1.10m`):**
   - `renderPlayer` (`src/game.js:5914`) renders the ship at `shipZ = player.z + 0.45 = -7.35m`.
   - `updateGame` (`src/game.js:4937, 4963`) tests `Math.abs(object.z - player.z) < 1.1` around `player.z = -7.80m` ($z \in [-8.90\text{m}, -6.70\text{m}]$).
   - Consequently, hazards trigger `"Hull damaged"` at $z = -8.895\text{m}$ — **`1.545m` deeper down the corridor ahead of the rendered ship center** (`COLLISION_C5_Z_LEAD_OFFSET`).
2. **Mechanism C2 — Bounding-Sphere Inflation Over Anisotropic 3D Meshes:**
   - `createSalvageMesh` (`src/game.js:1245-1261`) constructs `debris` as a narrow vertical bipyramid (`pts`: vertical tips `[0, ±0.75, 0]`, equatorial waist `[-0.36..0.34, -0.18..0.20, -0.22..0.30]` with max equatorial radius **`0.422 * size`** and max 3D tip radius **`0.750 * size`**), yet `spawnObstacle` assigns a spherical collider of **`radius = 0.82 * size`** (`1.94x` wider than the rock's equatorial waist!).
   - Similarly, the rendered MK-I craft (`scale = [0.72, 0.66, 0.88]` desktop / `[0.82, 0.76, 0.96]` mobile) has a rendered vertical half-height of only **`~0.18m`** and rendered half-wingspan of **`~0.53m`**, yet uses a spherical collider of **`player.radius = 0.62m`**.
   - In `COLLISION_C4_PHANTOM_EDGE_HIT` (`rock size = 1.42, radius = 1.1644m` at `x = 1.58, y = -0.15`), `colliderCenterDist2D = 1.6082m < combinedRadius (1.7844m)` triggers `"Hull damaged"`, while the rendered 3D meshes are separated by **`+0.6219m` horizontally** (`minMeshVertexDist3D = 1.0929m`, `48.64px` bbox gap / `71.03px` vertex gap on screen).
3. **Mechanism C3 — Curved Render Path (`corridorPoint`):**
   - `corridorPose(z)` (`src/game.js:2898-2911`) uses `depthT = clamp(((-z) - 7.8) / 88, 0, 1)`. At $z = -7.80\text{m}$, `depthT = 0`, so `corridorPoint` adds `0m` offset at the exact player Z plane, and only a tiny offset (`0.0015m`) at the leading collision edge $z = -8.895\text{m}$ (`depthT = 0.0124`). However, camera `viewYaw` (`bendHeading * 3.5` from `z = -34m`) rotates the view frustum during corridor bends, shifting screen-space alignment of approaching hazards.

### 5.2 Reproducible Test Suite & Functioning Negative Controls
Wired into `npm run gate`:
- **`npm run test:wave0-negative` (`tools/test_gameplay_wave0_negative_control.mjs`):** Spawns `tools/test_gameplay_wave0_diagnostics.mjs --negative-control`, verifying that (1) a deliberately false predicate, (2) a false claim that an elevated `y = +1.20m` crystal is reachable on mobile touch, and (3) a throwing predicate all report `[FAIL]` and exit with non-zero code `1`.
- **`npm run test:wave0` (`tools/test_gameplay_wave0_diagnostics.mjs`):** Executes **24/24** deterministic checks across opt-in isolation, viewport frustum math, seed `20261025` pickup reachability, edge cases `B1`–`B4`, collision mesh-vs-sphere divergence, live local Python SQLite backend probes, and read-only production probes.
- **`python3 tools/run_wave0_browser_audit.py`:** Executes **21/21** live headless Edge WebGL checks (`tools/test_wave0_in_browser.html`) and captures the 4 composite PNG screenshots.

---

## 6. Deliverable 5 — Feature Functionality Inventory & Security Boundary Registration

| Product Feature / Endpoint | Client Wiring (`src/game.js`) | Local Static Server (`http.server` / `serve_hangar.py`) | Local Python SQLite Backend (`backend/starfall_server.py`) | Live Production (`https://starfallsalvage.kopanolabs.com`) | Evidence Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`GET /api/health`** | Not polled by HUD; used by ops/audit tools | Returns `HTTP 404` | Returns `HTTP 200 OK` (`{"ok": true, "service": "starfall-salvage"}`) | Read-only `GET` probe returned **`HTTP 404` (`text/plain; charset=utf-8`)** | **Confirmed Unmounted on Production Static Deployment** (`vercel.json` has no `/api/*` rewrites or serverless functions). |
| **`GET /api/leaderboard`** | `fetchLeaderboard()` (`src/game.js:3582`) | Returns `HTTP 404`; client catches and falls back to `localStorage` + `DEFAULT_LEADERBOARD` (`Naledi, Tumi, Kabelo, Zinhle`) | Returns `HTTP 200 OK` (`{"ok": true, "scores": [...]}`) from `.data/starfall.db` | Returns **`HTTP 404`**; production players only ever see local browser scores + hardcoded `DEFAULT_LEADERBOARD` | **Degraded Local Fallback Only in Production** (Backend exists in repo `backend/starfall_server.py` but is not hosted/wired on Vercel). |
| **`POST /api/scores` (Score Submit)** | `submitScore()` (`src/game.js:3615`) | Returns `HTTP 404` / `501`; client saves to `localStorage` (`starfallSalvageLocalScores`) and `KopanoVault` IndexedDB | Persists pilot + score row in SQLite `scores` table (`HTTP 200 OK`) | Unmounted (`404`); scores never leave the player's browser | **Local-Only Persistence in Production** (Not tested with `POST` against prod per CA read-only rule). |
| **Pilot Identity (`POST /api/pilot`)** | `savePilotProfile()` (`src/game.js:3890`) | Falls back to `localStorage` (`starfallSalvagePilotProfile`) | Persists `pilots` row with `sha256` squad hash | Unmounted (`404`); profile stored in `localStorage` only | **Local-Only Persistence in Production**. |
| **Kasi Comm Chat (`GET/POST /api/chat`)** | `fetchKasiComm()` / `sendKasiComm()` | Falls back to seeded local demo messages | Persists and rate-limits (`1.5s`) in `chat_messages` table | Unmounted (`404`); displays static local demo messages only | **Offline Demo Fallback in Production**. |
| **Idea / Feedback Submission** | `submitIdeaButton` (`src/game.js:4195`) | Opens `mailto:rkholofelo@kopanolabs.com` | Opens `mailto:` URI (no backend endpoint) | Opens `mailto:` URI; fails silently on mobile browsers without a configured mail app | **Client `mailto:` Trigger Only**. |
| **Client-Side OPS Console Unlock** | `ADMIN_OPS_CODE` check in `src/game.js:819, 3922` | Unlocks local `OPS` telemetry drawer (`starfallSalvageOpsMonitor`) when squad code matches hardcoded string | Same client-side check | Publicly visible in client JS bundle | **Registered for Separate Security Review:** Client-side passcode is an UI gate for local telemetry only, not a server secret, but must be replaced or removed before real admin endpoints exist. |

---

## 7. Deliverable 6 — Performance Baseline, Deferred Hangar Regression Ledger & POPIA Checklist

### 7.1 Performance Telemetry Baseline (`Structure/wave0_diagnostic_receipt.json`)
Captured in headless Edge WebGL at `1280x800` (`DPR = 1`, `high` render budget tier, active flight at `speed = 24`):
- **Frame-Time Distribution ($N = 62$ frames):** `avg = 21.28ms` (`~47 FPS` in headless software/GPU virtualization), `p50 = 16.80ms` (`59.5 FPS`), `p95 = 33.00ms` (capped by `Math.min(0.033, dt)`), `max = 33.00ms`.
- **Hot-Path Allocation Score:** `100%` (`0` `new` allocations inside `updateGame` or `renderScene`).
- **Note on `state.rawDrawCalls`:** `state.rawDrawCalls` (`src/game.js:5222`) increments once per `renderScene` call (`1 / frame`) rather than inside `drawMesh` (`gl.drawElements`), which executes `~95–140` actual WebGL draw calls per frame across star layers, tunnel segments, sky salvage, and the 10 MK-I mesh groups.

### 7.2 Deferred Hangar Regression Ledger (Out of Scope for Gameplay Sprint)
Per Forge CA direction, the Sovereign Hangar is frozen during this sprint. The following Hangar-only observation is logged for future Hangar maintenance without touching `hangar/*`:
- **Hangar Sub-Floor Orbit Polar Angle (`hangar/src/orbit.js`):** `maxPol = 1.85 rad` ($106^\circ > 90^\circ$) allows desktop mouse-wheel zoom + downward orbit drag to dip slightly below the pedestal floor plane ($y < 0$). Separated from the flight-mode vertical steering disappearance (`Case D3`).

### 7.3 POPIA-Compliant Child-Safe Playtesting Checklist (South Africa Phone-First)
For supervised playtesting with the owner's 9-year-old daughter and phone-first testers:
- [x] **Default Guest Mode Only:** Launch and play strictly as anonymous `"Guest Pilot"` (no callsign entry, no real name, no school/location, no email).
- [x] **No Network PII Transmission:** On production (`starfallsalvage.kopanolabs.com`) and local static server, zero network writes occur; all telemetry stays in local volatile browser storage and can be wiped via `Reset Pilot` or closing the incognito/guest tab.
- [x] **Disable / Ignore `mailto:` Idea Button During Child Play:** Do not trigger `submitIdeaButton` (which opens the OS email client).
- [x] **Supervised Session Boundary:** Clear `localStorage` / `IndexedDB` after supervised playtest sessions if testing on a shared family device.

---

## 8. Deliverable 7 — Evidence-Backed Wave 1 Proposal (Smallest Corrective Changes)

Based on the Wave 0 mathematical and browser proofs, we propose the following **minimal, surgical Wave 1 corrections** inside `src/game.js` (zero Hangar edits, zero hot-path allocations):

| Priority | Defect Proven in Wave 0 | Smallest Corrective Change for Wave 1 | Expected Quantified Impact |
| :--- | :--- | :--- | :--- |
| **W1-1 (P0-A/B)** | Touch locks `touchAxis.y = 0` and `player.targetY = -0.68`, making **52.3%** of pickups (`100%` of elevated high-Y pickups) unreachable on mobile; discrete 3-lane clamp (`±2.2m`) leaves outer-X crystals (`11.3%`) unreachable on both mobile and desktop; dead `else if` branch at line 4883. | 1. Enable 2D relative drag steering (`touchAxis.x`, `touchAxis.y`) on touch/pointer and continuous horizontal + vertical `targetX`/`targetY` across `playerBounds` (`x ∈ [-3.6, 3.6], y ∈ [-2.0, 1.5]`), while keeping optional tap/swipe lane assist.<br>2. Remove the dead `else if (Math.abs(touchAxis.x) < 0.1)` branch and allow keyboard `W`/`S`/`Up`/`Down` on touch-capable laptops. | Increases mobile & desktop pickup reachability from **`47.7%` / `91.1%` -> `100.0%`** across seed `20261025`. |
| **W1-2 (P0-D)** | Downward vertical steering (`y = -2.15m`) on desktop 16:9 and 21:9 pushes the ship off the bottom of the screen (`NDC_y = -1.2037`, `inViewportRatio = 0%`) because `getCameraFollow().y` is `0.016` while `playPitch` pitches down `0.18..0.21 rad`. | Increase desktop `getCameraFollow().y` from `0.016` to **`0.28..0.34`** (matching or exceeding mobile's vertical follow) and clamp camera-relative vertical offset so `NDC_y` remains within **`[-0.78, +0.65]`** at all `player.y ∈ [yMin, yMax]` across 16:10, 16:9, and 21:9 ultrawide. | Eliminates desktop bottom-frustum ship disappearance (**`100%` `inViewportRatio`** across all aspect ratios). |
| **W1-3 (P0-C)** | 1. Ship renders at `shipZ = player.z + 0.45 = -7.35m` while colliding at `player.z = -7.80m ± 1.10m` (`1.545m` ahead of rendered ship).<br>2. `debris` sphere collider (`0.82 * size`) and `player.radius` (`0.62m`) trigger phantom hits with `+0.62m` (`48.6px`) of empty space between 3D meshes. | 1. Align collision Z center with rendered `shipZ` (`-7.35m`) and tighten Z slab from `±1.10m` to **`±0.65m`**.<br>2. Replace inflated isotropic sphere check for hazards/ship with an **ellipsoidal / axis-scaled 2D check** matching actual rendered mesh dimensions (`ship rx = 0.50m, ry = 0.24m`; `debris rx = 0.44 * size, ry = 0.68 * size`), while keeping generous collection radii for pickups (`crystal`/`orb`). | Eliminates phantom edge hits (`>0.60m` empty mesh gap) and early Z hits while preserving forgiving pickup collection. |
