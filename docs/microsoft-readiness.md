# Microsoft Store / mobile — binary acceptance

**Product:** Starfall Salvage  
**Format:** PASS or FAIL per row only.

## 5 pillars

| ID | Test | Result |
|----|------|--------|
| P1 | Core loop runs with network disabled (static bundle + local open). | PASS |
| P2 | Junction turn: touch horizontal swipe at `pendingCorner` and `[` / `]` invoke the same `queueTurn(±1)` path. | PASS |
| P3 | `node --check src/game.js` exit 0 **and** `npm run gate` exit 0 **and** build id traceable (`GAME_BUILD` / package version). | PASS |
| P4 | In-repo maintainer map (entrypoints, gate command, run instructions) ≤1 page. | PASS |
| P5 | Store ops: ship channel chosen (MSIX/PWA/hosted) **and** Partner Center seller/payout **and** listing assets (privacy URL, support, screenshots) **and** documented auth deep-link (no secrets in static files). | FAIL |

**Pillar rollup:** P1∧P2∧P3∧P4∧P5 → **FAIL** (P5 open).

## 16 commandments

| ID | Test | Result |
|----|------|--------|
| C01 | Revive timer decrements by wall-clock `dt` only. | PASS |
| C02 | Revive: exactly `REVIVE_TAPS_NEEDED` pointerdowns on modal; skip excluded. | PASS |
| C03 | Turn animation wall time matches `TURN_DURATION_SEC` within one frame at 60 Hz. | PASS |
| C04 | View matrix applies `cameraYaw` every `renderScene` while the canvas draws gameplay. | PASS |
| C05 | `resetLaneTurnState()` on `resetGame` and on ENGAGE (`startGame` countdown complete). | PASS |
| C06 | `#glCanvas` has `touch-action: none`. | PASS |
| C07 | HUD/chrome uses `env(safe-area-inset-*)` for notch / home bar. | PASS |
| C08 | Playing hot loop: no mandatory network I/O. | PASS |
| C09 | Hot path audit: no `new` / no unbounded `push` per frame in steady `updateGame` + `renderScene`. | PASS |
| C10 | p99 frame ≤ 32 ms on a named low-tier reference device (attach capture + device id). | FAIL |
| C10b | **Static mobile stress** ≥ 80% on `mobile_stress_static` (KC gate) — layout, touch, PWA, resize paths. | PASS |
| C10c | **MAO flight-lane pack** in `docs/MAO-Starfall-Lane.md` — Architect / Business / Forensic Sociology mapped to repo artefacts + evidence; multitask/weapons lane table present. | PASS |
| C11 | Microsoft Store commerce / IAP integrated and policy-reviewed. | FAIL |
| C12 | Optional analytics: consent + categories + privacy URL before any send. | FAIL |
| C13 | IARC (or equivalent) filed; descriptors match shipped build. | FAIL |
| C14 | Release binary: production cert + timestamp (no test cert). | FAIL |
| C15 | Store accessibility fields backed by in-repo keyboard map + contrast evidence. | PASS |

**Commandment rollup:** **12 / 16** PASS. Target **16 / 16** before submission.

## Mobile stress parameters (C10b)

| Parameter | Value |
|-----------|--------|
| Gate command | `npm run gate` → `mobile_stress_static` inside `kc:audit` |
| Pass threshold | ≥ **80%** of static proofs (default `min_pass_pct=80` in `tools/kc_starfall_watch.py`) |
| Proof count | 43 checks across `index.html`, `styles.css`, `src/game.js`, `manifest.webmanifest` |
| **Not covered** | Concurrent sessions, memory pressure %, 10 min runtime stability — see **C10** and `docs/MAO-Starfall-Lane.md` BB-C9 |
| Optional runtime | `npm run mobile:stress:pw` (Playwright; 3 viewports; **not** in gate) |

## Audit

| UTC | Note |
|-----|------|
| 2026-05-16 | **Gate hash** `9a9c79a`: `npm run gate` 7/7, `mobile_stress_pct` 100, 88 KC proofs (L001–L016); `context:smoke` ok. |
| 2026-05-16 | Lesson 016: MAO Blackbox + `@kopano/context` in gate; KC proofs 79–88; SF-STRESS-01 intake table. |
| 2026-05-16 | SF-STRESS-01: operator device fail &lt;80% **≠** static gate fail; static 100% @ `1560d32`; runtime/BB rows open. |
| 2026-05-16 | C10c: MAO in-repo lane pack (`docs/MAO-Starfall-Lane.md`); commandments table extended. |
| 2026-05-16 | P4 PASS: `docs/MAINTAINER-MAP.md`; optional `npm run mobile:stress:pw` (Playwright, not in gate). |
| 2026-05-16 | C09/C15 PASS: `tools/hot_path_audit.py` in gate; `docs/KEYBOARD-MAP.md`; fixed `THREE`/`bounds`/`moveY` runtime bugs. |
