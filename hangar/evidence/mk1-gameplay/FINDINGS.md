# FINDINGS — Evidence Recovery Session (2026-10-19)

## F-1 · Pre-existing game defect: invisible discovery-survey overlay blocks the start button
**Severity: UX defect (pre-existing in game; NOT introduced by the hangar work)**
**Status: DOCUMENTED ONLY — owner decides the fix. Zero game files modified.**

### Evidence
- After the survey is answered or skipped, `hideSurvey()` (src/game.js:1493-1497)
  adds `.is-hidden` to the modal.
- `styles.css:3135-3138`:
  ```css
  .survey-modal.is-hidden {
    opacity: 0;
    pointer-events: none;
  }
  ```
  `display` remains `flex` (styles.css:3126) and `visibility` stays `visible`;
  the inner `#surveyOptions` (.survey-options) remains hit-testable.
- Live receipt: `document.elementFromPoint()` over the visible "Tap to fly"
  button (rect x=560, y=446, w=320) returns `DIV#surveyOptions` — the
  invisible survey — instead of the button.
- Consequence: the first user click in the covered region lands on an
  invisible survey control; automation hit-testing refused the click with
  "covered by <div#surveyOptions>" (observed 3× during this session).
- The game's own silencing key
  (`starfallSalvageDiscoverySurveyV1 = {v:1, never:true, skipped:true}`)
  works correctly for SHOWING the survey, but does not remove the blocking
  layer after dismissal.

### Suggested one-line-class fix (owner to approve — not applied)
Add `visibility: hidden;` (or `display: none;`) to `.survey-modal.is-hidden`,
or `pointer-events: none;` on `.survey-options` when the modal is hidden.
Requires a regression pass on the survey re-show path (src/game.js:3684).

## F-2 · Forge review corrections — CONFIRMED against code
- `createFaceMesh()` (src/game.js:1157-1172) already bakes per-face normals
  via `normalFor()` (src/game.js:1143-1155). The earlier roadmap claim that
  the hangar would "add real per-face normals" was WRONG and is retracted.
- The game already has directional + ambient lighting:
  shader `uLightDirection` / `uAmbientLight` / Lambert diffuse at
  src/game.js:406-419; constants `LIGHT_DIRECTION = [0.35, 0.9, 0.55]`
  (src/game.js:478), ambient 0.28 + diffuse 0.86 (src/game.js:4609-4611).
- Therefore the evolution roadmap Phase 1 is re-scoped: the differentiator
  is NOT normals/lighting existence — it is material richness (per-part
  colors/groups, glow groups, texture strategy), which the demo on this
  branch demonstrates using the game's own pipeline unchanged.

## F-3 · Remote state (confirms Forge)
- Commit `2baa88b2d026be1adf65388e489546e3534dbbfc` and branch
  `feature/sovereign-hangar` exist ONLY in this sandbox:
  `git ls-remote origin` lists no such ref; remote main is
  `fc01b6437f554870c1c3ccb2322535b001e309b3`.
- Push is impossible here: `git push --dry-run` → "could not read Username
  for 'https://github.com'" (no credentials).
- Review artifacts exported: `0001-sovereign-hangar.patch` (applies with
  `git am`) and `sovereign-hangar.bundle` (verify: `git bundle verify`,
  PASS) in the evidence package.
- 116 working-tree "modifications" are file-mode-only sandbox noise
  (644→755); zero content diffs in src/game.js, index.html, vercel.json or
  any hangar file (verified per-file, content-diff-lines: 0).
