# Maintainer map — Starfall Salvage (WebGL root)

One-page index for operators and reviewers. Evidence doctrine: **PASS/FAIL + artefact**, not narrative.

## Entrypoints

| Surface | Path | Role |
|---------|------|------|
| Game shell | `index.html` | Canvas, HUD, sovereign pause, minimal play HUD, flight menu |
| Game logic | `src/game.js` | WebGL loop, input, weapons, multitask UI sync |
| Styles | `styles.css` | Layout, touch targets, flight menu, safe-area |
| Backend (optional) | `backend/starfall_server.py` | SQLite profiles, chat, scores |
| KC gate | `tools/kc_starfall_watch.py` | `npm run gate` proofs |
| MAO lane | `docs/MAO-Starfall-Lane.md` | Architect / Business / Forensic Sociology routing |
| Store readiness | `docs/microsoft-readiness.md` | Binary commandments + pillars |

## Run (local)

```powershell
# Static only
python -m http.server 8765
# Open http://localhost:8765/index.html

# With backend
python backend\starfall_server.py --port 8765
# Open http://127.0.0.1:8765
```

## Gate (required before merge)

```powershell
npm run gate
```

Expect: `{"failures": 0, "mobile_stress_pct": >= 80, "ok": true}`.

## Optional mobile layout audit (Playwright)

```powershell
python -m http.server 8765
# other terminal:
npm run mobile:stress:pw
```

Requires `@playwright/test` or `playwright` installed locally; **not** part of default `gate`.

## Mobile multitask (manual smoke)

1. Start run → tap **☰** → choose **Bolt / Scatter / Pierce** → fire.
2. **Step out — hub pause** → sovereign **Resume** or menu **Drop in — resume**.
3. Confirm minimal HUD stays usable while paused (score, speed, menu).

## Build trace

- Package version: `package.json` → `version`
- In-game build stamp: `GAME_BUILD` in `src/game.js`
