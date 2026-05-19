# MAO — Starfall Salvage flight lane (in-repo)

This file is the **local execution pack** for the three MAO lenses applied to **this repository only**. Canonical vault registers live in Obsidian; here we bind **mode → artefact → evidence** so PRs and `npm run gate` stay the source of truth.

| Mode | Question it answers | Primary artefacts (this repo) | Evidence type |
|------|---------------------|------------------------------|----------------|
| **Architect** | Is the structure correct, testable, and shippable? | `src/game.js`, `index.html`, `styles.css`, `tools/kc_starfall_watch.py`, `docs/MAINTAINER-MAP.md` | `npm run gate`, `node --check src/game.js`, KC JSON summary |
| **Business** | What outcome and risk are we trading? | `docs/microsoft-readiness.md`, `DEPLOYMENT.md`, Store checklist rows | PASS/FAIL tables, Partner Center screenshots (external) |
| **Forensic Sociology** | What does the operator feel, and where does friction hide? | Playing HUD, sovereign pause, flight menu, onboarding | Device capture (C10), manual tap-through notes |

## Lane register — multitask + weapons (static)

| Check ID | Assertion | PASS criterion |
|----------|-----------|----------------|
| SF-MT-01 | Flight menu exists in minimal HUD | `index.html` contains `flightMenuToggle`, `flightMenuPanel`, `flightResumeItem`, `flightStepOutItem` |
| SF-MT-02 | Paused multitask: HUD + sovereign coherent | `syncSovereignPresentation`: `paused && !blockMenu` keeps scrim without `backdrop-only` and `playHud.hidden = false` |
| SF-WP-01 | Three weapon modes + persistence | `STARFLIGHT_WEAPON_STORAGE_KEY`, `setWeaponMode`, `spawnPlayerBullet` branches `bolt` / `scatter` / `pierce` |
| SF-GATE-01 | Stress gate | `mobile_stress_static` ≥ 80% and full `kopano_upgrade_audit` via `npm run gate` |

## Anti-patterns (lane hygiene)

| Anti-pattern | Why it fails MAO | Remedy |
|--------------|------------------|--------|
| “Effectively done” without gate output | Business lens: no auditable proof | Attach `npm run gate` exit 0 + timestamp |
| Checkmark drift (UI says shipped, table says FAIL) | Architect + Sociology: dual truth | Align `microsoft-readiness.md` with measured state |
| Hero metrics (“100% GPU stress”) from static checks only | Architect: category error | Separate **C10b** (static) from **C10** (device p99) |

## Evolution hook (next increments)

| # | Lens | Status | Next action |
|---|------|--------|-------------|
| 1 | Architect | **Done (optional)** | `npm run mobile:stress:pw` — 3 viewports; install `playwright` locally; not in `gate` |
| 2 | Business | **P4 done** | `docs/MAINTAINER-MAP.md` — **P5 open** until Partner Center + listing assets attached |
| 3 | Forensic Sociology | **Open** | C10: named device p99 capture; multitask path ☰ → step out → resume on that device |

## MAO routing at the gate

```
Change → Architect: npm run gate
       → Business: update microsoft-readiness.md row only with evidence
       → Forensic Sociology: device note or FAIL until capture exists
```

## Breaking Point — Blackbox rows (Forensic Sociology gate)

**ID collision warning:** `docs/microsoft-readiness.md` uses C01–C16 for *gameplay/store* commandments. Breaking Point uses **BB-C5 / BB-C9 / BB-C12** here for *stress + consent + outage* so rows are not confused with C05 (lane reset) or C09 (hot path).

| BB ID | Breaking Point theme | PASS criterion | FAIL criterion | Repo binding | Status (2026-05-16) |
|-------|-------------------|----------------|----------------|--------------|---------------------|
| **BB-C5** | Consent-first telemetry | No analytics/event send before explicit opt-in; privacy URL linked before any optional tracker | Silent retry storm on auth/session; telemetry without consent UI | Store row **C12**; onboarding copy; no pre-consent `fetch` to analytics endpoints in `src/game.js` | **FAIL** (C12 open — no shipped consent surface) |
| **BB-C9** | Retention under pressure | 10 min continuous play OR equivalent scripted session: save state intact, no black canvas, hull/score recover after background tab | Crash, WebGL black canvas, or unrecoverable state before 10 min | **C10** device p99; `webglcontextlost` handler in `game.js`; KopanoVault offline queue | **FAIL** until named device log attached |
| **BB-C12** | Outage behaviour | Offline: core loop + local scores; leaderboard/auth degrade with **visible** message (no infinite spinner) | Hard fail on intermittent net; silent data loss | P1; `renderLeaderboard` offline strings; `kopano-vault.js`; backend health skip in gate | **PASS** (static paths); **runtime re-test required** |

### Stress incident SF-STRESS-01 (operator report)

| Field | Value |
|-------|-------|
| Title | Starfall Mobile: stress fail &lt;80% — root cause + re-test criteria |
| Repo | `starfall-salvage` |
| Symptom | Operator reports break **before** 80% threshold on **device** (not necessarily static gate) |
| Static gate (Architect) | `mobile_stress_static` **100%** (43/43) at commit `1560d32` — `npm run gate` exit 0 |
| Prod divergence risk | Hosted build may lag `main`; SW/cache (`?v=`) — hard refresh required after deploy |
| Acceptance | (1) Define metric: **static ≥80%** (C10b) AND **runtime** 10 min stable WebGL on named phone; (2) BB-C5/C9/C12 rows marked PASS with evidence links; (3) gate hash in `Structure/KC Review Log.jsonl` |
| 48h rule (Business) | If runtime root cause not ticketed → mobile scale **aspirational** (Commandment XII save-kill posture) |

### SF-STRESS-01 intake (fill before re-test — teacher cannot close BB-C9)

| Field | Operator value |
|-------|----------------|
| `failure_mode_at_pct` | _e.g. static 100% gate but prod HUD bleed at landing_ |
| `minute_or_action` | _e.g. 0:00 landing / 2:30 first boss / after background tab_ |
| `auth_flow` | `guest` \| `signed-in` \| `unknown` |
| `network` | `offline-only` \| `online` \| `flapping` |
| `device_id` | _model + OS + browser_ |
| `deploy_build` | _URL + cache-bust query on CSS/JS_ |
| `screenshot_or_video` | _path or link_ |
| `suspected_path` | `deploy-lag` \| `webgl-context-loss` \| `ui-state` \| `other` |

### KC apprenticeship (Lesson 016)

| Step | Command | Pass |
|------|---------|------|
| Student audit | `npm run gate` | exit 0 + `mobile_stress_pct` ≥ 80 |
| Governance smoke | `npm run context:smoke` | exit 0 |
| Log hash | append line to `Structure/KC Review Log.jsonl` | `commit` field present |

### Static vs runtime stress (category separation)

| Layer | What “80%” means | Command |
|-------|------------------|---------|
| **C10b** | % of static proofs in `check_mobile_stress_score()` (viewport, touch, PWA, flight menu, safe-area, …) | `npm run gate` |
| **C10** | p99 frame ≤32 ms on **named** low-tier device | Manual capture + device id |
| **Operator load test** | Must be written down: concurrent sessions? memory? minutes played? | Ticket field **failure_mode_at_pct** |

## Identic Flow Bridge (auth / session — in-repo hooks)

| Flow | Surface | Offline / backoff expectation |
|------|---------|------------------------------|
| **A — Sign-in / pilot** | `signInButton`, account modal, `pilotProfile`, local storage | No extractive retry loop; show status string on backend miss |
| **B — Score sync** | `submitScore`, leaderboard refresh | Fail → local rows + `"Score saved offline"` |
| **C — Kasi-Comm** | `kasi-comm` lobby | `"Lobby offline"` / queue via vault when backend down |

Bridge rule: stress re-test must state whether **Flow A** was active (signed-in) or **guest offline-only**.

## ZAR ledger stub (Business — cost of retry)

| Line | Estimate | Note |
|------|----------|------|
| Re-test engineering | 4–8 h | Device capture + BB row evidence + deploy verify |
| Ship-date slip (7 d) | Partner / hackathon window risk | Tie to P5 Store ops, not WebGL alone |
| Revenue at risk | Qualitative | KasiLink / squad invite flows blocked if mobile marked “ready” falsely |
| Halt scaling spend | **Yes** until SF-STRESS-01 closed | Gate PASS alone is insufficient for “mobile ready” ✓ on any external index |
