# 2026-05-21 - Curve Anticipation Pass Case Study

## Trigger

Start/Fly was fixed, but the world still felt too static. The next field requirement was stronger turn anticipation, visible banking, and a more legible salvage corridor without forking controls or bloating the renderer.

## Decision

Do not keep polishing HUD chrome. Use the existing raw WebGL lane and make the camera respond to the corridor itself:

> stronger horizon lead, stronger bank, stronger lane cues, same ruleset.

This is not declared industry-competitive yet. It is the next grounded slice after the orbital wreck lane pass.

## Changes

| Area | Change |
|---|---|
| `src/game.js` | Added a corridor-heading helper that blends local slope with far-horizon lead so the bend signal is large enough to matter at runtime. |
| `src/game.js` | Added `viewYaw` camera state and routed it into camera smoothing, roll coupling, and moderated yaw rotation. |
| `src/game.js` | Added `renderLaneSignals()` for outer beacons, floor cues, and overhead warning bars that read upcoming bend pressure. |
| `src/game.js` | Kept movement unified; proof still drags the player from `x=0` to `x=2.2` on the same ruleset after the visual pass. |
| `index.html`, `src/pwa-boot.js`, `service-worker.js`, `tools/kc_starfall_watch.py` | Bumped build/cache marker to `20260521-curve-anticipation` so stale Start/Fly assets do not mask the new render slice. |

## Proof

| Check | Result |
|---|---|
| Browser proof | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260521-curve-anticipation-local-r3\report.json`, failures `[]` |
| Redmi playing | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260521-curve-anticipation-local-r3\redmi-393x873-playing.png` |
| Narrow playing | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260521-curve-anticipation-local-r3\narrow-360x800-playing.png` |
| Desktop playing | `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260521-curve-anticipation-local-r3\desktop-1280x720-playing.png` |
| Runtime bend signal | Max `viewYaw` sampled in proof: Redmi `0.0837`, narrow `0.0503`, desktop `0.0434` |
| Movement regression | All proof viewports still moved `x=0 -> 2.2`, `targetLane=1` after screenshot capture |

## KC Teacher/Student Note

KC keeps the same doctrine: no chat voice, only steward-written ledger review. This pass should be recorded as `Save` only if the proof artifact and branch files agree on `20260521-curve-anticipation`.

- Starfall KC audit seeded `kc-51`, `teacher_review: Save — bounded file evidence; no external claim beyond repo.`
- Main Brain audit seeded `kc-52`, `teacher_review: Save — bounded file evidence; no external claim beyond repo.`

## Save / Kill / Watch

| Lane | Verdict |
|---|---|
| Save | Horizon-led camera bank, lane signal pass, unified movement rules, stale-cache guard for the new slice. |
| Kill | Any claim that the bend pass was proven by syntax alone, or that `20260521-start-fly-gate` is still the current visual marker. |
| Watch | Physical Redmi capture after merge/deploy; top-half negative space is still generous on mobile and may need a tighter forward frame in the next art-direction pass. |

## Handoff Summary

- Branch: `codex/starfall-mobile-weapon-ecosystem`.
- Build marker: `20260521-curve-anticipation`.
- Current proof: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260521-curve-anticipation-local-r3\report.json`, failures `[]`.
- KC Starfall seed: `kc-51`.
- KC Main Brain seed: `kc-52`.
- Production remains unchanged until the branch is merged and redeployed.
