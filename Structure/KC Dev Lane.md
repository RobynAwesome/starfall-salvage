# KC Dev Lane

## Root Node Binding (2026-05-07)

KC's Starfall QA lane inherits MAIN-BRAIN root node:
`C:\Users\rkhol\OneDrive\Documents\Anthropic\Introduction to MCP\Schematics\18-PROTOCOLS\Kopano Context Master Protocol Ledger And Sovereign Architecture.md`

Starfall KC checks must remain CRUD-bound:

- Create bounded lesson/proof records.
- Read verified source, live URL, repo state, and MAIN-BRAIN state.
- Update only with evidence.
- Delete or kill stale/false claims with a logged reason.

Agents, skills, tools, and model abilities are adapters only.

## Role Upgrade

KC is no longer treated as a passive intern note bucket for Starfall Salvage. KC is assigned as a strict dev QA lane:

- fail incomplete work,
- say exactly what failed,
- give retry instructions,
- rerun until the pass is acceptable,
- log proof in both Starfall Structure and the Main Brain/KC store.

## Boundary

Current KC wiring is local and file-backed. It uses:

- `C:\Users\rkhol\OneDrive\Documents\Anthropic\Introduction to MCP\Schematics\06-Reference\kopano-code-implementation\src\kc_mcp.py`
- `C:\Users\rkhol\OneDrive\Documents\Anthropic\Introduction to MCP\Schematics\06-Reference\kopano-code-implementation\.kc\context_store.json`
- `C:\Users\rkhol\Starfall Salvage\tools\kc_starfall_watch.py` (canonical clone; Cursor worktrees use the same file at their repo root)

KC is not a separate autonomous AI process until a real external runtime or endpoint is connected.

## Apprenticeship trail (2026-05-16)

The **curriculum** (`Structure/KC Student-Teacher Curriculum.md`) is the apprenticeship contract: each lesson adds proofs; `tools/kc_starfall_watch.py` re-audits **every** proof every pass. **Lesson 013** locks Protocol 13 kinetics (treadmill note, `uFogMix`, pause history trap, minimal HUD id, `POSITION_LERP_TOUCH`, tunnel parallax ribs).

```powershell
cd <repo-root>
python tools\kc_starfall_watch.py --once --skip-backend
```

Append-only proof log: `Structure/KC Review Log.jsonl`. Optional Main Brain handoff: add `--seed-kc` when the KC impl path in the watcher resolves on your machine.

## Hard QA Cycle 001

Expected:
KC reviews Starfall as a dev and refuses incomplete sign-in/backend/deployment claims.

Observed failure:
The first KC-style critique found dead sign-in UI, absent backend integration, untracked logo asset, missing modal CSS, no deployment runbook, no browser smoke gate, and no documented account behavior.

Correction issued:
Wire account controls, add a local backend, track the logo asset, style the modal, document deployment, add a KC watchdog, and rerun syntax/API/browser checks.

Retry status:
Passed on retry. `tools\kc_starfall_watch.py --once --seed-kc` created KC context `kc-3` after the watcher import bug was corrected, then final verification created `kc-4`.

Failure inside the KC tooling:
The first watcher seed attempt failed with `'NoneType' object has no attribute '__dict__'` because the dynamic import did not register the KC module in `sys.modules`.

Correction:
`tools/kc_starfall_watch.py` now inserts the loaded KC module into `sys.modules` before executing it.

Proof:
`Structure/KC Review Log.jsonl` contains the failed seed attempt, the passing retry with `kc_context_id: kc-3`, and the final clean rerun with `kc_context_id: kc-4`.

## Production Activation (2026-05-06)

KC graduated from local-only QA lane to **production-aware reviewer**. New scope:

- Audits live URL `https://starfallsalvage.kopanolabs.com` (HTTP 200, Server: Vercel, OG meta resolved).
- Audits public GitHub repo `Kopano-Labs/starfall-salvage` (visibility, latest commit hash matches main).
- Reads end-to-end across the Main Brain Schematics directory via `tools/kc_main_brain_scan.py` to verify cross-references between sub-brain (Starfall Salvage) and main brain (`Schematics/`).

## End-to-End Main Brain Scan

Run a one-shot scan that walks key Schematics folders and reports counts, last-modified dates, and Starfall cross-references:

```powershell
python tools\kc_main_brain_scan.py --once --seed-kc
```

Adds proofs:
- `comms_log_has_starfall_entries` — confirms Main Brain knows about Starfall.
- `protocols_referenced` — counts doctrine docs (Lovable-Primary, Refusal Authority, KC Memory-Renter, Sovereign Tech).
- `kc_context_store_present` — confirms `Schematics/06-Reference/kopano-code-implementation/.kc/context_store.json` exists and has KC records.

## Watchdog Commands

Run one strict pass:

```powershell
python tools\kc_starfall_watch.py --once --seed-kc
```

Run a background-style loop:

```powershell
python tools\kc_starfall_watch.py --interval 60 --seed-kc
```
