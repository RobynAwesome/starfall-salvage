# Microsoft Store — Starfall Salvage integration plan

This is the execution checklist to ship the **PWA/Web** build on the **Microsoft Store** (Windows customers discover games there; it is not a replacement for the open web or the Kopano 360 link ring).

## 1. Product packaging (MSIX / PWA)

1. Confirm **PWA manifest** (`manifest.webmanifest`) — `name`, `icons`, `display`, `start_url`, `theme_color`, `lang`.
2. Run **PWABuilder** (https://www.pwabuilder.com/) against the production URL: package as **Windows** (MSIX) with valid signing.
3. In **Partner Center**, create the app listing, age rating questionnaire, and store screenshots (desktop + touch).
4. Wire **update channel**: each web deploy should bump a visible build string so Store users pull fresh assets.

## 2. Technical gates Store reviewers care about

- Offline / slow network: game already degrades without backend; document expected behaviour.
- Input: keyboard + pointer + touch; no hard dependency on browser-only APIs without fallbacks.
- Privacy: link to a clear **privacy notice** (what is stored locally vs server; no dark patterns).

## 3. Auth and “product discovery” (not extraction)

- **Today:** demo `POST /api/signin` + local profile — fine for dev; **not** a production identity system.
- **Next:** pick one path — **Microsoft Entra External ID**, **Clerk**, **Auth0**, or **Supabase Auth** — with explicit consent copy and **export/delete** story.
- **Surveys / one question:** embed a single hosted form (Microsoft Forms, Typeform, or static JSON to your API) behind a **Post-run** or **Settings** entry — never block gameplay. One question per surface is enough if copy is sharp.

## 4. 360° ecosystem (traffic, not extraction)

Standardise a **single header strip** (or footer) component reused across:

- Portfolio, Fives Arena, Starfall Salvage, Gasoline, Office — each repo or CDN bundle imports the same fragment.

Starfall already carries the ecosystem panel in menus; **other properties** must link back here for the loop to close.

## 5. Pilot profile and inclusion

Product analytics should use **optional, consent-based** fields. **Do not** force a restrictive gender model in software; use neutral copy (“How should we refer to you?” / optional pronouns / skip) so the experience respects all pilots and stays defensible in enterprise and education contexts.

## 6. KC

After any Store-related code or manifest change, run:

`python tools/kc_starfall_watch.py --once --skip-backend`

Add new proofs to `Structure/KC Student-Teacher Curriculum.md` when behaviour is locked.
