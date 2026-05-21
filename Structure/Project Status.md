# Project Status

## Status

**Live on production** at `https://starfallsalvage.kopanolabs.com`. Active development continues.

## Last Updated

2026-05-19

## Current Branch Proof

- Active execution clone for this resumed run: `C:\Users\rkhol\.cursor\projects\empty-window\starfall-salvage`.
- Expected OneDrive clone `C:\Users\rkhol\OneDrive\Documents\Kopano Labs\starfall-salvage` was missing in the resumed environment; path drift stays on WATCH.
- Branch: `codex/starfall-mobile-weapon-ecosystem`.
- Code commit: do not trust stale static hashes here; use `git log -1` on the active clone for branch tip truth.
- Branch proof docs: this file now records the movement-control proof before final commit/push.
- Remote branch tip: use `git log -1` / `git ls-remote` for hash truth after the merge-resolution commit; production still requires merge or fast-forward to `main`.
- Manual PR URL: `https://github.com/Kopano-Labs/starfall-salvage/pull/new/codex/starfall-mobile-weapon-ecosystem`.
- Production redeploy: completed on 2026-05-19 after `main` fast-forwarded to `eac68f9`.

- **Sovereign Identity (2026-05-16):** Implemented biologically-adaptive flight deck (XY/XX theme switching), device-bound cryptographic Sovereign ID generation, and premium 'Neural Scan' onboarding.
- **Kinetic Gameplay (Turing Standard):** Added 'Temple Run' fluid lane shifting, 90° Yaw transitions, banking animations, and 'Neural Gate' procedural obstacles.
- **Microsoft Store Readiness:** Generated `AppxManifest.xml` and `msix_package_guide.md` in `Store/` directory. PWA manifest search-optimized and categorized for Arcade/Action.
- **Visual Rendering Upgrade:** Replaced flat cubes with procedural 'Salvage Debris' shard geometry for increased high-fidelity immersion.
- **Checklist Codification:** Created `docs/microsoft-readiness.md` as the binary compliance gate for the ecosystem.

## Production State (2026-05-06)

- **Live URL:** `https://starfallsalvage.kopanolabs.com` (Vercel Hobby + IONOS CNAME, served from `cpt1` Cape Town edge).
- **GitHub repo:** `https://github.com/Kopano-Labs/starfall-salvage` (public — Sovereign Tech CONTRIBUTING.md visible to CPUT community).
- **Vercel project:** `robynawesomes-projects/starfall-salvage`, Hobby plan, auto-deploy on push to main.
- **DNS:** `CNAME starfallsalvage  3600  IN  CNAME  4af9f515c8f66fb7.vercel-dns-017.com.`
- **OG/Twitter Card meta tags** resolving against absolute URLs — WhatsApp link previews work.
- **PWA installable** via `manifest.webmanifest` (Android Add-to-Home-Screen).

## Unified Device Ecosystem State (2026-05-14)

- PC, Android, Xiaomi-class Chrome, and Apple-class browser gameplay use one simulation model.
- Device differences are CSS/presentation only: safe-area, density, scroll containment, and touch target sizing.
- FIRE is visible on PC and mobile, and its label follows active weapon state: `FIRE`, `RAPID`, `TRIAD`, or `PRISM`.
- Existing buff system remains canonical: `overcharge`, `triad`, `aegis`, `prism`, plus legacy `powerOrb` bridge.
- Speed-responsive chrome uses CSS variables (`--speed-strength`, `--speed-accent`) and brightens as speed rises.

## Comfort Zoom Pass (2026-05-15)

- Field feedback: "Zoom out" and "the problem is it's too much."
- Mobile tall WebGL view is zoomed out with a wider FOV.
- Touch camera follow is softened.
- Mobile ready-state leaderboard/ecosystem panels are suppressed until game-over or non-ready states.
- Speed color remains active but glow/saturation are toned down.
- FIRE remains visible and touch-safe, with slower/smaller pulse.

## Orbital Wreck Lane Visual Slice (2026-05-18)

- Visual direction moved from flat tunnel to a space salvage runner through a township-built orbital wreck lane.
- Raw WebGL renderer now draws parallax stars, nebula haze, distant planet glow, corridor deck rails, overhead wreck structure, salvage silhouettes, and glowing salvage cores.
- Camera banking, sway, corridor drift, and shared corridor transforms create motion through a world without forking PC/mobile gameplay.
- This is not declared industry-competitive yet; it is a stronger visual slice with proof artifacts.

## Movement Control Fix (2026-05-19)

- Field report said the game was static and players could not move.
- Unified pointer steering now starts from the flight deck, so desktop mouse drag and mobile touch drag both move the ship.
- Keyboard movement remains active through WASD/arrow keys.
- UI controls and text inputs are guarded from the global canvas focus handler.
- Build/cache marker is `20260519-movement-control` so stale service-worker assets cannot keep serving the broken input path.

## Start/Fly Gate Fix (2026-05-21)

- Field report said clean users still could not get past the Start/Fly phase.
- First-run onboarding no longer auto-opens on load.
- Tapping Fly opens the briefing only when needed; Continue is always reachable on mobile and starts the run after dismissal.
- Build/cache marker is `20260521-start-fly-gate` so stale Start/Fly assets are invalidated.
- KC Student-Teacher records now express KC's opinion through `teacher_review` as `Save — ...` or `Watch — ...`, not chat.
- Main Brain end-to-end audit passed and seeded `kc-43`.
- Clean Redmi proof passed: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260521-start-fly-local-r3\report.json`, failures `[]`, build `20260521-start-fly-gate`.
- Starfall KC audit passed and seeded `kc-47`.

## Not Yet Proven

- Physical Redmi 13 recapture after this branch merges and Vercel redeploys production.
- Production has received the movement-control fix; live marker and runtime proof passed on 2026-05-19.
- GitHub PR creation from this agent lane is blocked by invalid `gh` token / connector 403; branch push can continue.
- MAIN-BRAIN path drift remains on WATCH: older registry path is `C:\Users\rkhol\Starfall Salvage`; expected current clone was `C:\Users\rkhol\OneDrive\Documents\Kopano Labs\starfall-salvage`; this run recovered `C:\Users\rkhol\.cursor\projects\empty-window\starfall-salvage`.
- Kasi-Comm chat backend is **not deployed** on production — frontend gracefully shows "Lobby offline." Phase C of 2026-05-06 session adds mailto-based idea capture with bounty incentive.
- SQLite leaderboard backend not deployed on production — frontend gracefully degrades to local browser scores.
- Production backend hosting (the Python `starfall_server.py`) is not configured. Current backend is local-demo only.
- Full WebGL context rebuild after GPU context loss is not implemented; current behavior reloads on context restore.
- Kasi-Comm has no WebSocket/realtime layer; polling cadence is 3s and may show send-receive lag during heavy traffic.
- Bounty payout rails (Yoco/PayFast/EFT) are documented in CONTRIBUTING.md but not yet wired to a payout automation.
- Kopano-Labs org has "Payment unsuccessful" banners on GitHub + IONOS billing — non-blocking for the deploy, but card on file needs clearing for future renewals.

## Verification

- `node --check .\src\game.js` passed on 2026-05-14 resume audit.
- `npm run vault:check` passed on 2026-05-14 resume audit.
- `git diff --check` passed on 2026-05-14 resume audit.
- Browser layout proof passed across Redmi 393x873, narrow 360x800, and desktop 1280x720: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260514-resume-r1\report.json`.
- Speed-color proof passed in deterministic browser run: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260514-resume-speed-r5\report.json`.
- Comfort layout proof passed: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260515-comfort-r1\report.json`.
- Comfort speed proof passed: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260515-comfort-speed-r1\report.json`.
- Orbital wreck lane responsive proof passed across Redmi 393x873, narrow 360x800, and desktop 1280x720: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260518-orbital-wreck-r3\report.json`, failures `[]`.
- KC student audit passed after Lesson 013 watcher wiring: `python tools\kc_starfall_watch.py --once --seed-kc`, `kc_context_id=kc-39`, 69/69 curriculum proofs.
- Movement proof passed across keyboard, desktop mouse drag, Redmi 393 touch drag, and narrow 360 touch drag: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260519-movement-r3\report.json`, failures `[]`.
- KC student audit passed after Lesson 014 movement wiring: `python tools\kc_starfall_watch.py --once --seed-kc`, `kc_context_id=kc-41`, 75/75 curriculum proofs.
- `npm run gate` (`node --check` + `kc_starfall_watch.py --once --skip-backend`) passes on dev lane.
- Merged-with-main browser movement proof passed: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260519-merge-movement-r4\report.json`, failures `[]`, keyboard/mouse/Redmi/narrow all moved `x=0 -> 2.2`, `targetLane=1`.
- Merged-with-main KC gate passed: `npm run gate`, 104/104 curriculum proofs across Lessons 001-018.
- Production movement proof passed after `main` fast-forward: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260519-production-movement-r1\report.json`, failures `[]`, live build `20260519-movement-control`.
- Local clean Start/Fly proof passed: `C:\Users\rkhol\AppData\Local\Temp\starfall-audit-20260521-start-fly-local-r3\report.json`, failures `[]`; build `20260521-start-fly-gate`, visible Fly CTA, onboarding Continue, playing mode, persistence, and touch drag all passed.
- KC Starfall audit passed after Start/Fly gate fix: `kc_context_id=kc-47`, 104/104 curriculum proofs, mobile stress 100%.
- `node --check src\game.js` passed.
- `python -m py_compile backend\starfall_server.py tools\kc_starfall_watch.py` passed.
- Backend `/api/health`, `/api/signin`, `/api/score`, and `/api/leaderboard` passed locally against SQLite.
- Headless Edge smoke passed: sign-in, start, dash, pause, FPS, HUD, and screenshot.
- Headless Edge login smoke passed: pressing Enter in the login modal signs in without launching the game.
- KC hard-QA watcher passed and seeded `kc-3`, then final rerun seeded `kc-4`.
- GitHub push complete: profile/backend/KC lane, HUD logo fix, and KC verification log are pushed to `origin/main`.
