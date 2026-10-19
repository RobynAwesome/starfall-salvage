# 2026-05-23 - Screen Fill Frame Pass Case Study

## Trigger

Field feedback remained direct: the scene still left dead space on screen, especially on tall mobile. The corridor existed, but the frame still looked like the world was hanging too low inside black emptiness.

The correction bar was:

`realism accommodates aesthetics`

That meant filling the screen with world evidence, not padding it with UI or random glow.

## Decision

Promote the local realism-frame experiment into branch truth, but only after it proved the screen was more occupied by structure, salvage lane, and backdrop on both mobile and desktop.

The frame pass stayed inside the raw WebGL renderer:

- tighter forward camera
- steeper downward pitch
- less mobile vertical drift
- closer canopy structure
- larger background haze and lane mass

## Changes

| Area | Change |
| --- | --- |
| `src/game.js` | Added `viewPitch` camera state and promoted it into the active branch build. |
| `src/game.js` | Tightened the camera for mobile and desktop with closer depth, stronger pitch, and reduced dead vertical bias. |
| `src/game.js` | Brought the corridor closer and added nearer canopy beams so the top half reads as structure, not empty black. |
| `src/game.js` | Enlarged starfield density and backdrop haze so the frame reads as space, not a flat void. |
| `index.html`, `src/pwa-boot.js`, `service-worker.js`, `tools/kc_starfall_watch.py` | Bumped build/cache marker to `20260523-screen-fill-frame` so stale curve-anticipation assets cannot mask the promoted frame pass. |
| `styles.css` | Ready-state scrim keeps utility chrome hidden and lets the world stay visible under the Start Flying page. |

## Proof

| Check | Result |
| --- | --- |
| Browser proof | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260523-screen-fill-frame-r3\report.json`, failures `[]` |
| Redmi ready | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260523-screen-fill-frame-r3\redmi-393x873-ready.png` |
| Redmi playing | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260523-screen-fill-frame-r3\redmi-393x873-playing.png` |
| Narrow ready | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260523-screen-fill-frame-r3\narrow-360x800-ready.png` |
| Narrow playing | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260523-screen-fill-frame-r3\narrow-360x800-playing.png` |
| Desktop ready | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260523-screen-fill-frame-r3\desktop-1280x720-ready.png` |
| Desktop playing | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260523-screen-fill-frame-r3\desktop-1280x720-playing.png` |
| Runtime state | All three proof viewports reported `mode: playing` with build `20260523-screen-fill-frame` after the Start Flying flow. |

## KC Teacher/Student Note

KC and Cassy stay in the same doctrine:

- no chat voice for KC
- Cassy remains on the student-teacher lane
- `Save` only after code, marker, docs, and screenshots agree

This pass should be treated as promoted branch truth because the proof bundle, build marker, and curriculum marker now align on `20260523-screen-fill-frame`.

## Save / Kill / Watch

| Lane | Verdict |
| --- | --- |
| Save | screen-fill framing, promoted view-pitch camera, closer canopy mass, aligned cache/build marker |
| Kill | any claim that the old local realism-frame pass is still unpromoted or detached from branch truth |
| Watch | mobile can still benefit from denser close salvage silhouettes; solve that with structure, not more HUD or decorative color |

## Handoff Summary

- Branch: `codex/starfall-mobile-weapon-ecosystem`
- Build marker: `20260523-screen-fill-frame`
- Proof bundle: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260523-screen-fill-frame-r3\report.json`
- Production remains unchanged until merge
