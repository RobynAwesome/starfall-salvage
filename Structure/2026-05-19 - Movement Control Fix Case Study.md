# 2026-05-19 - Movement Control Fix Case Study

## Trigger

Field report: "THE GAME IS STATIC PLAYERS CAN'T GET TO THE GAME BECAUSE THEY CAN'T MOVE."

## Decision

Treat this as a control-path blocker. The game must prove numeric player movement on keyboard, desktop mouse drag, Redmi-class touch drag, and narrow mobile touch drag before any new visual work continues.

## Changes

| Area | Change |
|---|---|
| `src/game.js` | Added unified pointer steering on the flight deck so mouse and touch drag move the ship. |
| `src/game.js` | Kept keyboard movement, FIRE, and legacy touch fallback active under one ruleset. |
| `src/game.js` | Added a diagnostic `window.__starfallDebug` probe behind `?diag=1` for numeric movement proof, including `targetLane` after the main merge. |
| `src/game.js` | Guarded the global pointer focus handler so UI controls and text inputs keep focus. |
| `index.html` | Updated control copy from canvas-only drag to flight-deck drag. |
| `index.html`, `src/pwa-boot.js`, `service-worker.js` | Bumped cache/build markers to `20260519-movement-control`. |
| `tools/kc_starfall_watch.py` | Added Lesson 018 movement-control proofs after merging current `origin/main` Lessons 013-016. |

## Proof

| Check | Result |
|---|---|
| Syntax | `node --check .\src\game.js` PASS |
| Vault | `npm run vault:check` PASS |
| Gate | `npm run gate` PASS after merge with current `origin/main` |
| Whitespace | `git diff --check` PASS |
| Movement proof r3 | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260519-movement-r3\report.json`, failures `[]` |
| Merged browser proof r4 | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260519-merge-movement-r4\report.json`, failures `[]` |
| Production browser proof r1 | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260519-production-movement-r1\report.json`, failures `[]` |
| KC student audit | `npm run gate` PASS, 104/104 curriculum proofs across Lessons 001-018 |

## Movement Results

| Surface | Proof |
|---|---|
| Desktop keyboard | Arrow-right moved player `x` from `0` to `3.8`, `vx=7.2`. |
| Desktop mouse drag | Drag moved player `x` from `0` to `3.8`, pointer type `mouse`. |
| Redmi 393 touch drag | Touch drag moved player `x` from `0` to `2.66`, pointer type `touch`. |
| Narrow 360 touch drag | Touch drag moved player `x` from `0` to `2.66`, pointer type `touch`. |
| Merged desktop keyboard | Arrow-right moved player `x` from `0` to `2.2`, `targetLane=1`. |
| Merged desktop mouse drag | Drag moved player `x` from `0` to `2.2`, `targetLane=1`. |
| Merged Redmi 393 touch drag | Touch drag moved player `x` from `0` to `2.2`, `targetLane=1`. |
| Merged narrow 360 touch drag | Touch drag moved player `x` from `0` to `2.2`, `targetLane=1`. |
| Production keyboard/mouse/touch | Live site served build `20260519-movement-control`; keyboard, mouse drag, Redmi touch, and narrow touch all moved `x=0 -> 2.2`, `targetLane=1`. |

## KC Teacher/Student Note

Teacher instruction: KC must reject any future "playable" claim unless movement is proven by runtime state, not just screenshots or static DOM checks. Student proof now includes pointer steering, current cache marker, focus guard, and the movement case study.

## Save / Kill / Watch

| Lane | Verdict |
|---|---|
| Save | Unified PC/mobile ruleset, keyboard movement, desktop drag movement, mobile touch drag, FIRE affordance, and orbital wreck lane visuals. |
| Kill | Any stale service-worker build marker that serves pre-fix `game.js`. Any claim that canvas-only drag is enough. |
| Watch | Physical Redmi recapture after merge/deploy; camera follow still makes mobile movement feel subtler than desktop; next slice should improve visible player anchoring without hurting comfort. |

## Handoff Summary

- Branch: `codex/starfall-mobile-weapon-ecosystem`.
- Build marker: `20260519-movement-control`.
- Current merged proof: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260519-merge-movement-r4\report.json`, failures `[]`.
- Production was fast-forwarded to `eac68f9` and passed live movement proof.
