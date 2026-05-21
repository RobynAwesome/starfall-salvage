# Session Log

## 2026-05-16

- **Kinetic:** Danger-scaled `uFogMix` fog; tunnel **parallax rib** pass (secondary Z drift vs primary shell) for Temple-style sightline breakup; treadmill contract unchanged (scrap still streams +Z).
- **KC / apprenticeship:** `Structure/KC Student-Teacher Curriculum.md` **Lesson 013** added; `tools/kc_starfall_watch.py` extended with six proofs (`treadmill_architecture_note`, `danger_scaled_fog_uniform`, `sovereign_pause_history_trap`, `minimal_playing_hud_dom`, `touch_lerp_constant`, `tunnel_parallax_ribs`). Run `python tools/kc_starfall_watch.py --once --skip-backend` after every ship; append-only log at `Structure/KC Review Log.jsonl`. Optional Main Brain sync: same command with `--seed-kc` when the KC store path is available.

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
- Current `origin/main` was merged into `codex/starfall-mobile-weapon-ecosystem` without reverting the movement fix. Merge proof passed `npm run vault:check`, `npm run gate`, `git diff --check`, and Chrome CDP movement proof.
- Merged proof report: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260519-merge-movement-r4\report.json`, failures `[]`; keyboard, desktop mouse drag, Redmi 393 touch drag, and narrow 360 touch drag all moved `x=0 -> 2.2`, `targetLane=1`.
- Branch and `main` were pushed to `eac68f9`; production proof passed on `https://starfallsalvage.kopanolabs.com` with live build `20260519-movement-control`: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260519-production-movement-r1\report.json`, failures `[]`.

## 2026-05-21

- Field report: "THE GAME STILL NOT ALLOWING PEOPLE TO GET PASSED THE START FLY PHASE."
- Root cause reproduced on production: clean Redmi-sized first-run opened onboarding before play, while clearance controls could sit below the visible mobile viewport.
- Start/Fly gate fix applied: onboarding no longer auto-opens on load; Fly opens the briefing only if needed; Continue is always reachable and starts the run after dismissal.
- Cache/build markers bumped to `20260521-start-fly-gate` to prevent phones from reusing stale Start/Fly assets.
- KC Student-Teacher lane tightened: KC does not chat; steward-written `teacher_review` records now use `Save — ...` or `Watch — ...`.
- Main Brain audit passed and seeded `kc-43`: 4 checks, 0 failures, 143 markdown files across 8 sections.
- Clean Redmi proof passed: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260521-start-fly-local-r3\report.json`, failures `[]`; build `20260521-start-fly-gate`, visible `Tap to fly`, Continue, playing mode, onboarding persistence, and touch drag all passed.
- Starfall KC audit seeded `kc-47` with `teacher_review: Save — bounded file evidence; no external claim beyond repo.`
- Branch and `main` were pushed to `b253afc`; production served build `20260521-start-fly-gate`.
- Production clean Redmi proof passed: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260521-start-fly-production-r1\report.json`, failures `[]`; visible `Tap to fly`, Continue, playing mode, onboarding persistence, and touch drag all passed.
