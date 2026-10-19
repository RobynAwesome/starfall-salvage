---
title: KC Lesson 013 Quiz - Teacher Key
created: 2026-05-18
updated: 2026-05-18
teacher: Codex
student: KC / Cassy
status: active
lesson: "013"
---

# KC Lesson 013 — Graded Quiz (Teacher Key)

**Student:** Cassy / KC  
**Teacher:** Codex  
**Pass threshold:** 4/5 correct (80%) — same bar as Protocol 13 mobile gameplay gate.

Student-facing questions live in Main Brain:  
`Schematics/18-PROTOCOLS/Starfall-Arcade/Cassy Student Session - Starfall Orbital Wreck And KC Audit Loop - 2026-05-18.md`

---

## Q1 — Why grep instead of trusting chat?

**Model answer:** Chat summaries are presentation, not proof. Commandment 11 requires audit before presentation. KC must verify strings exist in shipped files (`src/game.js`, `index.html`, etc.) because teachers and models can describe work that never landed, or describe stale commits.

**Fail if student says:** "Codex is trustworthy so we skip grep" or "screenshots are enough without file proof."

---

## Q2 — Redmi bleed / white bar — Lesson 013?

**Model answer:** **No.** That is historical mobile layout work (Lessons 005–007, comfort pass `d655996`, branch `fix/mobile-layout-redmi13`). Lesson 013 is **playfield identity** (orbital backdrop, wreck corridor, banking). Reopening the superseded React/Tailwind Protocol 13 UI payload is **KILL**.

**Fail if student says:** "Yes, orbital slice fixes the white bar" or "we need Tailwind for Redmi."

---

## Q3 — Which check needs the local backend?

**Model answer:** `backend_health` — watcher calls `http://127.0.0.1:8765/api/health` and expects JSON `{"ok": true}`. Fix: `python backend/starfall_server.py --port 8765`. This is not a game.js bug.

**Fail if student says:** Any other check name, or "backend is optional for green pass."

---

## Q4 — When is branch owner-proof production ready?

**Model answer:** Only after **Chief Architect physical Redmi capture** on the **live** URL (`starfallsalvage.kopanolabs.com`) **after** PR merge and Vercel deploy. Emulator-only or local-only green is **WATCH**, not PASS for production.

**Fail if student says:** "KC watcher ok:true means ship" or "emulator proof is enough."

---

## Q5 — Save / Kill / Watch for "competitive game"

**Model answer:**

| Verdict | Item |
|---------|------|
| **KILL** | Claiming the game is industry-competitive / AAA-ready now |
| **SAVE** | Orbital wreck visual slice as stronger playfield direction |
| **WATCH** | PR merge, deploy, physical device proof, then art iteration |

**Fail if student says:** "SAVE competitive claim" or "KILL the visual slice."

---

## Grading rubric

| Score | Teacher action |
|-------|----------------|
| 5/5 | Mark Lesson 013 **theory PASS** in KC store `teacher_review` |
| 4/5 | PASS with one remediation line in comms-log |
| ≤3/5 | FAIL — student re-reads Cassy session + reruns watcher before next audit |

---

## Sample perfect student submission (Cassy draft)

1. Files beat chat; Commandment 11; grep proves ship truth.  
2. No — layout is old lane; 013 is orbital playfield only.  
3. `backend_health` on port 8765.  
4. After merge/deploy + Master Redmi on live URL only.  
5. KILL competitive claim; SAVE slice; WATCH merge + field proof.

**Teacher verdict:** PASS 5/5 — eligible to cite `kc-35` in comms-log.

---

## Next practical step after quiz PASS

```powershell
cd "C:\Users\rkhol\Starfall Salvage"
python tools\kc_starfall_watch.py --once --seed-kc
```

Post: `KC Lesson 013 theory PASS + watcher ok — kc-XX — awaiting Owner Redmi field proof.`
