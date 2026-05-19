# Starfall Salvage - WebGL Edition

Starfall Salvage is a fresh raw-WebGL browser game inspired by the supplied Pong project structure. It keeps the same assignment-friendly approach of plain HTML, CSS, JavaScript, shaders, buffers, event listening, and a real-time animation loop, but changes the gameplay into a 3D salvage runner.

## Run

Open `index.html` in a WebGL-capable browser, or serve the folder locally.

Static frontend only:

```powershell
python -m http.server 8765
```

Then browse to `http://localhost:8765`.

Local backend demo with pilot profiles and score sync stored in SQLite:

```powershell
python backend\starfall_server.py --port 8765
```

Then browse to `http://127.0.0.1:8765`.

No compilation is required because this project uses browser-native WebGL and JavaScript.

## Controls

- `WASD` or arrow keys: move the salvage drone
- `Space`: phase dash through one dangerous object
- `P`: pause or resume
- `R`: restart
- Buttons on screen: sign in, start, pause, reset

## Profile Mode

The pilot sign-in is demo-safe. If the Python backend is running, the game stores pilot profiles and leaderboard entries in `.data/starfall.db` using SQLite. If the backend is unavailable, it falls back to browser `localStorage` so the game still works offline.

## Files

- `index.html`: game canvas and HUD markup
- `styles.css`: responsive full-screen game layout
- `src/game.js`: raw WebGL renderer, matrix transforms, game loop, collision, input, procedural textures
- `backend/starfall_server.py`: optional local SQLite backend for pilot profiles and scores
- `tools/kc_starfall_watch.py`: KC hard-QA watcher for pass/fail/retry logs (includes **mobile static stress ≥ 80%** before `npm run gate` passes)
- `docs/MAINTAINER-MAP.md`: one-page entrypoints, gate command, optional Playwright audit
- `docs/MAO-Starfall-Lane.md`: MAO protocol (Architect / Business / Forensic Sociology) bound to this repo’s gates and multitask + weapon lane checks
- `DEPLOYMENT.md`: subdomain and hosting runbook
- `PROJECT_DOCUMENTATION.md`: assignment-style documentation
