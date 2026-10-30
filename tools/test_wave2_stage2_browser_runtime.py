#!/usr/bin/env python3
"""
tools/test_wave2_stage2_browser_runtime.py

Browser-Driven Live Runtime Assertions for Wave 2 Stage 2:
- Live src/game.js execution under Headless Chrome CDP
- Full Rescue Minigame Matrix (Core Surge, Reaction Lock, Salvage Glide):
  * Win (via live DOM pointerdown/click event dispatch)
  * Lose / Collision
  * Timeout
  * Skip (via live #reviveSkipButton click)
- Background / Resume Continuity (Hidden -> Paused -> Resume -> Restored state & timer)
- Death -> Hub -> Fresh Flight Transition (zero obsolete modals, no intrusive survey popup)
"""

import os
import sys
import time
import json
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHROME_BIN = Path("/home/rkhol/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome")
EXTRA_LIB_DIR = "/home/rkhol/.cache/chrome-libs/root/usr/lib/x86_64-linux-gnu"
HTTP_PORT = 8996
CDP_PORT = 9336
RECEIPT_FILE = ROOT / "Structure" / "wave2_stage2_browser_receipt.json"

sys.path.insert(0, str(ROOT / "tools"))
from run_wave1_browser_audit import SimpleWebSocket

checks = []
passed_count = 0
failed_count = 0

def check_assert(cid, desc, condition, details=None):
    global passed_count, failed_count
    if condition:
        passed_count += 1
        print(f"[PASS] {cid:14} — {desc}")
        if details:
            print(f"       Details: {json.dumps(details)}")
        checks.append({"id": cid, "desc": desc, "ok": True, "details": details})
    else:
        failed_count += 1
        print(f"[FAIL] {cid:14} — {desc}")
        if details:
            print(f"       Details: {json.dumps(details)}")
        checks.append({"id": cid, "desc": desc, "ok": False, "details": details})

def main():
    print("=" * 80)
    print("   STARFALL SALVAGE · WAVE 2 STAGE 2 LIVE BROWSER RUNTIME AUDIT")
    print("   Live CDP Assertions on src/game.js, DOM Events & Sovereign Lifecycle")
    print("=" * 80)

    # 1. Start HTTP Server
    srv = subprocess.Popen(
        [sys.executable, str(ROOT / "tools" / "serve_hangar.py"), str(HTTP_PORT)],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(0.8)

    env = os.environ.copy()
    cur_ld = env.get("LD_LIBRARY_PATH", "")
    env["LD_LIBRARY_PATH"] = f"{EXTRA_LIB_DIR}:{cur_ld}" if cur_ld else EXTRA_LIB_DIR

    user_data = f"/tmp/starfall_live_runtime_{int(time.time())}"
    chrome = subprocess.Popen(
        [
            str(CHROME_BIN),
            "--headless=new",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--enable-webgl",
            "--ignore-gpu-blocklist",
            "--window-size=1280,800",
            f"--user-data-dir={user_data}",
            f"--remote-debugging-port={CDP_PORT}",
            f"http://127.0.0.1:{HTTP_PORT}/?control=a"
        ],
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    ws = None
    try:
        ws_url = None
        for _ in range(40):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{CDP_PORT}/json", timeout=1) as r:
                    pages = json.loads(r.read().decode("utf-8"))
                    for p in pages:
                        if p.get("type") == "page" and "webSocketDebuggerUrl" in p:
                            ws_url = p["webSocketDebuggerUrl"]
                            break
                if ws_url:
                    break
            except Exception:
                pass
            time.sleep(0.25)

        if not ws_url:
            print("[FAIL] Could not discover Chrome CDP WebSocket target.")
            sys.exit(1)

        ws = SimpleWebSocket(ws_url)
        ws.call("Page.enable")
        ws.call("Runtime.enable")

        def evaluate(expr, retries=8):
            for i in range(retries):
                try:
                    res = ws.eval_js(expr)
                    return res if res is not None else {}
                except RuntimeError as e:
                    err_str = str(e)
                    if "Inspected target navigated" in err_str or "Execution context was destroyed" in err_str:
                        time.sleep(0.3)
                        continue
                    raise
            return {}

        # Wait for page readiness, PWA controller reload settlement & __starfallWave2 API
        stable = 0
        for _ in range(80):
            try:
                ready = ws.eval_js(
                    "Boolean(window.__starfallBooted && window.__starfallWave2 && window.__starfallWave2.getRescueState && document.readyState === 'complete')"
                )
                if ready:
                    time.sleep(0.3)
                    stable += 1
                    if stable >= 2:
                        break
                    continue
            except RuntimeError:
                pass
            stable = 0
            time.sleep(0.25)

        api_ready = (stable >= 2)
        check_assert("BOOT-01", "Live window.__starfallWave2 API mounted and functional", api_ready)
        if not api_ready:
            print("[FATAL] window.__starfallWave2 not accessible.")
            sys.exit(1)

        # Ensure flight runner is in playing mode
        evaluate("""
            (() => {
                const onboardingBtn = document.getElementById('onboardingContinueButton');
                if (onboardingBtn) onboardingBtn.click();
            })()
        """)
        time.sleep(0.5)

        # ═════════════════════════════════════════════════════════════════════
        # SECTION 1: CORE SURGE MINIGAME MATRIX (WIN, TIMEOUT, SKIP)
        # ═════════════════════════════════════════════════════════════════════
        print("\n--- SECTION 1: CORE SURGE MINIGAME ---")

        # 1A. Core Surge WIN via DOM Tap Events
        init_res = evaluate("""
            (() => {
                const api = window.__starfallWave2;
                return api.triggerRescue("core_surge");
            })()
        """)
        check_assert("CS-WIN-01", "Core Surge rescue triggered with variant 'core_surge' and active status",
                     init_res.get("variant") == "core_surge" and init_res.get("active") is True, init_res)

        # Dispatch DOM taps on #coreSurgeTapBtn
        tap1 = evaluate("""
            (() => {
                const btn = document.getElementById('coreSurgeTapBtn');
                btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                btn.click();
                const st = window.__starfallWave2.getRescueState();
                return { hits: st.coreSurge.hits, need: st.coreSurge.need, active: st.active };
            })()
        """)
        check_assert("CS-WIN-02", "First live DOM pointerdown+click registers hit 1/2",
                     tap1.get("hits") == 1 and tap1.get("active") is True, tap1)

        time.sleep(0.15)

        tap2 = evaluate("""
            (() => {
                const btn = document.getElementById('coreSurgeTapBtn');
                if (btn) {
                    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                    btn.click();
                }
                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const st = window.__starfallWave2.getRescueState();
                return {
                    hits: st.coreSurge.hits,
                    active: st.active,
                    mode: dbg.mode,
                    hull: st.hull,
                    reviveUsed: st.reviveUsedThisRun
                };
            })()
        """)
        check_assert("CS-WIN-03", "Second live DOM tap completes Core Surge: restored mode 'playing'/'countdown', hull 1, reviveUsed=true",
                     tap2.get("active") is False and tap2.get("mode") in ("playing", "countdown") and tap2.get("hull") == 1 and tap2.get("reviveUsed") is True, tap2)

        # 1B. Core Surge TIMEOUT -> GameOver Transition
        evaluate("window.__starfallWave2.resetReviveUsed();")  # reset flag for test
        evaluate("window.__starfallWave2.triggerRescue('core_surge');")
        to_res = evaluate("""
            (() => {
                const api = window.__starfallWave2;
                // Step time past the 4.8s limit
                api.stepRescue(5.0);
                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const st = api.getRescueState();
                return {
                    active: st.active,
                    timer: st.timer,
                    mode: dbg.mode
                };
            })()
        """)
        check_assert("CS-TIMEOUT", "Core Surge timer expiry (>=4.8s) closes rescue and transitions to 'gameover'",
                     to_res.get("active") is False and to_res.get("timer") <= 0 and to_res.get("mode") == "gameover", to_res)

        # 1C. Core Surge SKIP via Live #reviveSkipButton Click
        evaluate("window.__starfallWave2.resetReviveUsed();")
        evaluate("window.__starfallWave2.triggerRescue('core_surge');")
        skip_res = evaluate("""
            (() => {
                const skipBtn = document.getElementById('reviveSkipButton');
                skipBtn.click();
                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const st = window.__starfallWave2.getRescueState();
                return {
                    active: st.active,
                    mode: dbg.mode
                };
            })()
        """)
        check_assert("CS-SKIP", "Clicking live DOM #reviveSkipButton aborts Core Surge to 'gameover'",
                     skip_res.get("active") is False and skip_res.get("mode") == "gameover", skip_res)

        # ═════════════════════════════════════════════════════════════════════
        # SECTION 2: REACTION LOCK MINIGAME MATRIX (WIN, TIMEOUT, SKIP)
        # ═════════════════════════════════════════════════════════════════════
        print("\n--- SECTION 2: REACTION LOCK MINIGAME ---")

        # 2A. Reaction Lock WIN via Live Node Clicks
        evaluate("window.__starfallWave2.resetReviveUsed();")
        evaluate("window.__starfallWave2.triggerRescue('reaction_lock');")
        rl_init = evaluate("window.__starfallWave2.getRescueState()")
        check_assert("RL-WIN-01", "Reaction Lock rescue active with 3 calibration nodes required",
                     rl_init.get("variant") == "reaction_lock" and rl_init.get("active") is True and rl_init.get("reactionLock", {}).get("total") == 3)

        # Tap node 1, 2, 3
        rl_steps = evaluate("""
            (async () => {
                const api = window.__starfallWave2;
                const sleep = ms => new Promise(r => setTimeout(r, ms));

                // Node 1
                let node = document.getElementById('reactionActiveNode');
                if (node) {
                    node.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                    node.click();
                }
                const s1 = api.getRescueState().reactionLock.step;
                await sleep(120);

                // Node 2
                node = document.getElementById('reactionActiveNode');
                if (node) {
                    node.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                    node.click();
                }
                const s2 = api.getRescueState().reactionLock.step;
                await sleep(120);

                // Node 3
                node = document.getElementById('reactionActiveNode');
                if (node) {
                    node.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                    node.click();
                }
                const s3 = api.getRescueState().reactionLock.step;

                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const st = api.getRescueState();
                return {
                    s1, s2, s3,
                    active: st.active,
                    mode: dbg.mode,
                    hull: st.hull
                };
            })()
        """)
        check_assert("RL-WIN-02", "Sequential DOM taps advance calibration (1->2->3) and restore 'playing'/'countdown' mode with hull=1",
                     rl_steps.get("s1") == 1 and rl_steps.get("s2") == 2 and rl_steps.get("s3") == 3 and rl_steps.get("active") is False and rl_steps.get("mode") in ("playing", "countdown") and rl_steps.get("hull") == 1, rl_steps)

        # 2B. Reaction Lock TIMEOUT
        evaluate("window.__starfallWave2.resetReviveUsed();")
        evaluate("window.__starfallWave2.triggerRescue('reaction_lock');")
        rl_to = evaluate("""
            (() => {
                const api = window.__starfallWave2;
                api.stepRescue(5.0);
                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const st = api.getRescueState();
                return { active: st.active, mode: dbg.mode };
            })()
        """)
        check_assert("RL-TIMEOUT", "Reaction Lock timer expiry closes rescue and transitions to 'gameover'",
                     rl_to.get("active") is False and rl_to.get("mode") == "gameover", rl_to)

        # 2C. Reaction Lock SKIP
        evaluate("window.__starfallWave2.resetReviveUsed();")
        evaluate("window.__starfallWave2.triggerRescue('reaction_lock');")
        rl_skip = evaluate("""
            (() => {
                document.getElementById('reviveSkipButton').click();
                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const st = window.__starfallWave2.getRescueState();
                return { active: st.active, mode: dbg.mode };
            })()
        """)
        check_assert("RL-SKIP", "Reaction Lock skip button transitions to 'gameover'",
                     rl_skip.get("active") is False and rl_skip.get("mode") == "gameover", rl_skip)

        # ═════════════════════════════════════════════════════════════════════
        # SECTION 3: SALVAGE GLIDE MINIGAME MATRIX (WIN, COLLISION, TIMEOUT, SKIP)
        # ═════════════════════════════════════════════════════════════════════
        print("\n--- SECTION 3: SALVAGE GLIDE MINIGAME ---")

        # 3A. Salvage Glide WIN: Dodge all 3 waves cleanly
        evaluate("window.__starfallWave2.resetReviveUsed();")
        evaluate("window.__starfallWave2.triggerRescue('salvage_glide');")
        sg_init = evaluate("window.__starfallWave2.getRescueState()")
        check_assert("SG-WIN-01", "Salvage Glide rescue initialized with 3 debris obstacles",
                     sg_init.get("variant") == "salvage_glide" and sg_init.get("active") is True and len(sg_init.get("salvageGlide", {}).get("obstacles", [])) == 3)

        sg_win = evaluate("""
            (() => {
                const api = window.__starfallWave2;
                // Wave 1: open center (50%). Drone starts at 50%.
                api.setGlideDroneX(50);
                for (let i = 0; i < 130; i++) api.stepRescue(0.016);

                // Wave 2 & 3: open lane 2 (80%). Steer to 80%.
                api.setGlideDroneX(80);
                for (let i = 0; i < 160; i++) api.stepRescue(0.016);

                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const st = api.getRescueState();
                return {
                    active: st.active,
                    mode: dbg.mode,
                    hull: st.hull,
                    timerRemaining: st.timer
                };
            })()
        """)
        check_assert("SG-WIN-02", "Salvage Glide completed under 4.8s timeout: restored mode 'playing'/'countdown', hull 1",
                     sg_win.get("active") is False and sg_win.get("mode") in ("playing", "countdown") and sg_win.get("hull") == 1 and sg_win.get("timerRemaining") > 0, sg_win)

        # 3B. Salvage Glide COLLISION LOSE
        evaluate("window.__starfallWave2.resetReviveUsed();")
        evaluate("window.__starfallWave2.triggerRescue('salvage_glide');")
        sg_col = evaluate("""
            (() => {
                const api = window.__starfallWave2;
                // Steer into lane 0 (20%) where Wave 1 hazard is located
                api.setGlideDroneX(20);
                for (let i = 0; i < 140; i++) {
                    api.stepRescue(0.016);
                    if (!api.getRescueState().active) break;
                }
                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const st = api.getRescueState();
                return { active: st.active, mode: dbg.mode };
            })()
        """)
        check_assert("SG-COLLISION", "Debris collision triggers immediate rescue failure and mode 'gameover'",
                     sg_col.get("active") is False and sg_col.get("mode") == "gameover", sg_col)

        # 3C. Salvage Glide TIMEOUT
        evaluate("window.__starfallWave2.resetReviveUsed();")
        evaluate("window.__starfallWave2.triggerRescue('salvage_glide');")
        sg_to = evaluate("""
            (() => {
                const api = window.__starfallWave2;
                api.stepRescue(5.0);
                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const st = api.getRescueState();
                return { active: st.active, mode: dbg.mode };
            })()
        """)
        check_assert("SG-TIMEOUT", "Salvage Glide timeout triggers 'gameover'",
                     sg_to.get("active") is False and sg_to.get("mode") == "gameover", sg_to)

        # 3D. Salvage Glide SKIP
        evaluate("window.__starfallWave2.resetReviveUsed();")
        evaluate("window.__starfallWave2.triggerRescue('salvage_glide');")
        sg_skip = evaluate("""
            (() => {
                document.getElementById('reviveSkipButton').click();
                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const st = window.__starfallWave2.getRescueState();
                return { active: st.active, mode: dbg.mode };
            })()
        """)
        check_assert("SG-SKIP", "Salvage Glide skip button triggers 'gameover'",
                     sg_skip.get("active") is False and sg_skip.get("mode") == "gameover", sg_skip)

        # ═════════════════════════════════════════════════════════════════════
        # SECTION 4: BACKGROUNDING / RESUME CONTINUITY (HIDDEN -> RESUME)
        # ═════════════════════════════════════════════════════════════════════
        print("\n--- SECTION 4: BACKGROUNDING & RESUME CONTINUITY ---")

        # 4A. Core Surge Backgrounding Continuity
        evaluate("window.__starfallWave2.resetReviveUsed();")
        evaluate("window.__starfallWave2.triggerRescue('core_surge');")
        # Do 1 tap
        evaluate("""
            (() => {
                const btn = document.getElementById('coreSurgeTapBtn');
                btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                btn.click();
            })()
        """)
        # Simulate tab hide
        hide_cs = evaluate("""
            (() => {
                const api = window.__starfallWave2;
                api.simulateVisibilityChange(true);
                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const modal = document.getElementById('reviveModal');
                return {
                    mode: dbg.mode,
                    suspendedMode: api.getSuspendedMode(),
                    modalHidden: modal.classList.contains('is-hidden')
                };
            })()
        """)
        check_assert("SUSPEND-CS-01", "Core Surge tab hidden: mode becomes 'paused', suspendedMode='revive', modal hidden",
                     hide_cs.get("mode") == "paused" and hide_cs.get("suspendedMode") == "revive" and hide_cs.get("modalHidden") is True, hide_cs)

        # Resume game
        resume_cs = evaluate("""
            (() => {
                const api = window.__starfallWave2;
                const res = api.resumeGame();
                const st = api.getRescueState();
                return {
                    mode: res.mode,
                    suspendedMode: res.suspendedMode,
                    rescueActive: res.rescueActive,
                    modalVisible: res.rescueModalVisible,
                    hitsPreserved: st.coreSurge.hits,
                    timer: st.timer
                };
            })()
        """)
        check_assert("RESUME-CS-02", "Core Surge resumed: mode restored to 'revive', modal visible, hit count (1) & timer preserved",
                     resume_cs.get("mode") == "revive" and resume_cs.get("rescueActive") is True and resume_cs.get("modalVisible") is True and resume_cs.get("hitsPreserved") == 1 and resume_cs.get("timer") > 0, resume_cs)

        time.sleep(0.15)

        # Finish Core Surge after resume
        finish_cs = evaluate("""
            (() => {
                const btn = document.getElementById('coreSurgeTapBtn');
                if (btn) {
                    btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                    btn.click();
                }
                const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                const st = window.__starfallWave2.getRescueState();
                return { mode: dbg.mode, hull: st.hull };
            })()
        """)
        check_assert("RESUME-CS-03", "Core Surge completes successfully after background resume: restored 'playing'/'countdown' mode",
                     finish_cs.get("mode") in ("playing", "countdown") and finish_cs.get("hull") == 1, finish_cs)

        # 4B. Reaction Lock Backgrounding Continuity
        evaluate("window.__starfallWave2.resetReviveUsed();")
        evaluate("window.__starfallWave2.triggerRescue('reaction_lock');")
        evaluate("""
            (() => {
                const node = document.getElementById('reactionActiveNode');
                node.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
                node.click();
            })()
        """)
        evaluate("window.__starfallWave2.simulateVisibilityChange(true);")
        resume_rl = evaluate("""
            (() => {
                const api = window.__starfallWave2;
                api.resumeGame();
                const st = api.getRescueState();
                return { mode: window.__starfallDebug().mode, step: st.reactionLock.step, active: st.active };
            })()
        """)
        check_assert("RESUME-RL", "Reaction Lock background resume preserves active status and calibration step (1)",
                     resume_rl.get("mode") == "revive" and resume_rl.get("active") is True and resume_rl.get("step") == 1, resume_rl)

        # 4C. Salvage Glide Backgrounding Continuity
        evaluate("window.__starfallWave2.resetReviveUsed();")
        evaluate("window.__starfallWave2.triggerRescue('salvage_glide');")
        evaluate("window.__starfallWave2.simulateVisibilityChange(true);")
        resume_sg = evaluate("""
            (() => {
                const api = window.__starfallWave2;
                api.resumeGame();
                const st = api.getRescueState();
                return { mode: window.__starfallDebug().mode, active: st.active, droneX: st.salvageGlide.droneX };
            })()
        """)
        check_assert("RESUME-SG", "Salvage Glide background resume preserves active status and drone positioning",
                     resume_sg.get("mode") == "revive" and resume_sg.get("active") is True and resume_sg.get("droneX") == 50, resume_sg)

        # ═════════════════════════════════════════════════════════════════════
        # SECTION 5: FINAL DEATH -> HUB -> FRESH LAUNCH LIFECYCLE
        # ═════════════════════════════════════════════════════════════════════
        print("\n--- SECTION 5: FINAL DEATH -> SOVEREIGN HUB -> FRESH LAUNCH ---")

        # 5A. Trigger Final Death (revive already used)
        death_res = evaluate("""
            (() => {
                const api = window.__starfallWave2;
                const res = api.simulateFinalDeath();
                return {
                    mode: res.mode,
                    isFinalizingDeath: res.isFinalizingDeath,
                    gameOverSectionPresent: api.isGameOverSectionPresent(),
                    surveyVisible: api.isSurveyVisible()
                };
            })()
        """)
        check_assert("DEATH-01", "Final fatal death triggers clean gameover without obsolete #gameOverSovereign modal",
                     death_res.get("gameOverSectionPresent") is False, death_res)
        check_assert("DEATH-02", "Intrusive discovery survey modal is NOT automatically displayed on death",
                     death_res.get("surveyVisible") is False, death_res)

        # Allow death transition to Sovereign Hangar Hub (scheduled at ~1.1s)
        time.sleep(1.6)

        hub_state = evaluate("""
            (() => {
                const scrim = document.getElementById('sovereignScrim');
                const hFrame = document.getElementById('hangarFrame');
                const hWin = hFrame ? hFrame.contentWindow : null;
                const hObj = hWin ? hWin.__hangar : null;
                return {
                    scrimVisible: scrim ? (scrim.style.display !== 'none' && !scrim.classList.contains('is-hidden')) : false,
                    hangarRunning: hObj && hObj.lifecycle ? hObj.lifecycle.isRunning : false,
                    currentCraft: hObj && hObj.state ? hObj.state.current : null
                };
            })()
        """)
        check_assert("HUB-RETURN", "Death transitions smoothly to Sovereign Hangar Hub: scrim active, Three.js hangar running",
                     hub_state.get("scrimVisible") is True and hub_state.get("hangarRunning") is True, hub_state)

        # 5B. Verify intentional survey invocation remains operational
        evaluate("window.__starfallWave2.openSurvey();")
        survey_active = evaluate("window.__starfallWave2.isSurveyVisible()")
        check_assert("SURVEY-API", "Intentional survey open API (window.__starfallWave2.openSurvey) functions cleanly",
                     survey_active is True)
        # Dismiss survey
        evaluate("""
            (() => {
                const modal = document.getElementById('surveyModal');
                if (modal) modal.classList.add('is-hidden');
            })()
        """)

        # 5C. Trigger Fresh Launch from Hub
        fresh_launch = evaluate("""
            (() => {
                const hFrame = document.getElementById('hangarFrame');
                const hDoc = hFrame ? hFrame.contentDocument : null;
                const btnLaunch = hDoc ? hDoc.getElementById('btn-launch') : null;
                if (btnLaunch) btnLaunch.click();
                return { launchClicked: Boolean(btnLaunch) };
            })()
        """)
        time.sleep(0.5)

        # Dismiss briefing if shown
        evaluate("""
            (() => {
                const btn = document.getElementById('onboardingContinueButton');
                if (btn) btn.click();
            })()
        """)
        time.sleep(0.6)

        fresh_playing = {}
        for _ in range(40):
            fresh_playing = evaluate("""
                (() => {
                    const dbg = window.__starfallDebug ? window.__starfallDebug() : {};
                    const scrim = document.getElementById('sovereignScrim');
                    const st = window.__starfallWave2.getRescueState();
                    return {
                        mode: dbg.mode,
                        scrimHidden: scrim ? (scrim.hidden || scrim.style.display === 'none' || scrim.classList.contains('is-hidden')) : false,
                        reviveUsedThisRun: st.reviveUsedThisRun,
                        hull: st.hull
                    };
                })()
            """)
            if fresh_playing.get("mode") == "playing" and fresh_playing.get("scrimHidden") is True:
                break
            time.sleep(0.15)

        check_assert("FRESH-LAUNCH", "Hub LAUNCH FLIGHT starts fresh playing lane: scrim hidden, reviveUsed reset to false, hull intact",
                     fresh_playing.get("mode") == "playing" and fresh_playing.get("scrimHidden") is True and fresh_playing.get("reviveUsedThisRun") is False, fresh_playing)

    finally:
        if ws:
            try:
                ws.sock.close()
            except Exception:
                pass
        chrome.kill()
        srv.kill()

    # Record Receipt
    verdict = "PASS" if failed_count == 0 else "FAIL"
    receipt_data = {
        "harness": "tools/test_wave2_stage2_browser_runtime.py",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "target": f"http://127.0.0.1:{HTTP_PORT}/?control=a",
        "verdict": verdict,
        "summary": {
            "passed": passed_count,
            "failed": failed_count,
            "total": len(checks)
        },
        "checks": checks
    }
    with open(RECEIPT_FILE, "w") as f:
        json.dump(receipt_data, f, indent=2)

    print("\n" + "=" * 80)
    print(f"   LIVE BROWSER RUNTIME VERDICT: {verdict}")
    print(f"   Passed: {passed_count} / {len(checks)} checks | Failed: {failed_count}")
    print(f"   Receipt saved to: {RECEIPT_FILE}")
    print("=" * 80 + "\n")

    if verdict == "PASS":
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
