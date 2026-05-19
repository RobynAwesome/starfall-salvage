# Session Log

## 2026-05-05

- Starfall project moved to `C:\Users\rkhol\Starfall Salvage`.
- Private GitHub repo created under Kopano Labs.
- Tactical WebGL upgrades completed.
- Kopano Labs logo added to the HUD and account modal.
- Local profile/account modal implementation started and wired.
- Local Python backend added for demo sign-in and score persistence.
- KC promoted to strict dev QA lane for this project.
- `tools/kc_starfall_watch.py` added to record methodical pass/fail/retry logs.
- KC watcher initially failed to seed the KC store because of a dynamic import/dataclass issue; the watcher was patched and passed on retry.
- KC contexts `kc-3` and `kc-4` created for passing Starfall hard-QA passes.
- Profile/backend/KC lane, HUD logo fix, and KC verification log pushed to `origin/main`.
- Login modal input isolation fixed so Enter submits the pilot profile without launching the game.
- Backend storage upgraded from JSON to SQLite at `.data/starfall.db`.

## 2026-05-14

- Current public `origin/main` audited at `6a27bc1` before patching; older mobile-only branch was not pushed over newer main.
- Working branch created: `codex/starfall-mobile-weapon-ecosystem`.
- Unified-device ecosystem patch applied on top of current main: desktop FIRE visibility, active weapon labels, speed-responsive chrome, compact mobile HUD/share behavior, and ecosystem copy aligned to one ruleset across PC, Android, Xiaomi, and Apple browsers.
- Existing `origin/main` buff model preserved: overcharge, triad, aegis, prism, revive modal, guest CTA, schema spawns, PWA boot, and modal history traps.
- Browser proof passed across Redmi 393x873, narrow 360x800, and desktop 1280x720.
- Speed-color proof passed with deterministic survival run: `speedStrength=0.125`, `speedAccent=hsl(170 47% 40%)`, `speedValue=1.4x`.
- Case study added: `Structure/2026-05-14 - Unified Device Ecosystem Case Study.md`.
- Resume audit after context compaction rechecked MAIN-BRAIN/sub-brain drift, reran `node --check`, `npm run vault:check`, `git diff --check`, fresh responsive browser proof, and fresh deterministic speed-color proof. New proof reports: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260514-resume-r1\report.json` and `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260514-resume-speed-r5\report.json`.

## 2026-05-15

- WhatsApp field feedback said "Zoom out" and "the problem is it's too much."
- Comfort pass applied on `codex/starfall-mobile-weapon-ecosystem`: wider mobile FOV, softer touch camera follow, suppressed mobile ready-state leaderboard/ecosystem panels, toned-down speed glow, and slower FIRE pulse.
- Browser proof passed across Redmi 393x873, narrow 360x800, and desktop 1280x720: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260515-comfort-r1\report.json`.
- Speed proof passed: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260515-comfort-speed-r1\report.json`.
- Case study added: `Structure/2026-05-15 - Comfort Zoom Pass Case Study.md`.

## 2026-05-18

- Resumed environment did not contain the expected OneDrive execution clone, so the branch was recovered in `C:\Users\rkhol\.cursor\projects\empty-window\starfall-salvage` and switched to `codex/starfall-mobile-weapon-ecosystem`.
- Stale mobile-Tailwind payload was rejected as historical; current work targeted the scene, not HUD polish.
- Orbital wreck lane visual slice added: parallax starfield, nebula/planet backdrop, salvage dressing, corridor deck/rails, shared corridor transform, and camera banking/drift.
- Cache/build markers bumped to `20260515-orbital-wreck-lane`.
- Responsive browser proof passed across Redmi 393x873, narrow 360x800, and desktop 1280x720: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260518-orbital-wreck-r3\report.json`, failures `[]`.
- KC teacher/student lane updated to audit visual identity via screenshot proof, not only syntax and DOM proof strings.
- KC watcher patched for Lesson 013 and passed with `kc_context_id=kc-39`, 69/69 proofs.

## 2026-05-19

- Field report: "THE GAME IS STATIC PLAYERS CAN'T GET TO THE GAME BECAUSE THEY CAN'T MOVE."
- Movement control fix applied on `codex/starfall-mobile-weapon-ecosystem`: unified pointer steering now starts from the flight deck, desktop mouse drag moves the ship, mobile touch drag works beyond canvas-only assumptions, and UI controls keep their own focus.
- Cache/build markers bumped to `20260519-movement-control` to kill stale service-worker assets.
- Browser movement proof passed: keyboard arrow-right, desktop mouse drag, Redmi 393 touch drag, and narrow 360 touch drag all moved player state numerically with failures `[]`.
- Final proof report: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260519-movement-r3\report.json`.
