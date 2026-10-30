#!/usr/bin/env python3
"""
Capture Wave 2 Stage 2 visual evidence:
1. Boss Combat with #bossHealthCard HUD
2. Rescue Minigame 1: Core Surge Stabilizer
3. Rescue Minigame 2: Reaction Lock Calibration
4. Rescue Minigame 3: Salvage Glide Emergency Course
5. Return-to-Hub Flow (Sovereign Hangar Hub active, zero obsolete modal)
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path("/home/rkhol/workspaces/starfall-salvage")
OUT_DIR = ROOT / "artifacts" / "wave2_stage2_evidence"
OUT_DIR.mkdir(parents=True, exist_ok=True)
BRAIN_DIR = Path("/home/rkhol/.gemini/antigravity/brain/1c926809-ecf7-487a-90b9-3d4e8d3e280e/wave2_stage2_evidence")
BRAIN_DIR.mkdir(parents=True, exist_ok=True)

CHROME_BIN = Path("/home/rkhol/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome")
EXTRA_LIB_DIR = "/home/rkhol/.cache/chrome-libs/root/usr/lib/x86_64-linux-gnu"
HTTP_PORT = 8993
CDP_PORT = 9333

sys.path.insert(0, str(ROOT / "tools"))
from run_wave1_browser_audit import SimpleWebSocket

def save_screenshot(ws, filename):
    shot = ws.call("Page.captureScreenshot", {"format": "jpeg", "quality": 88})
    data = base64.b64decode(shot["data"])
    out_path = OUT_DIR / filename
    brain_path = BRAIN_DIR / filename
    out_path.write_bytes(data)
    brain_path.write_bytes(data)
    print(f"  -> Saved {filename} ({len(data)} bytes)")

def main():
    srv = subprocess.Popen(
        [sys.executable, str(ROOT / "tools" / "serve_hangar.py"), str(HTTP_PORT)],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(0.5)

    env = os.environ.copy()
    env["LD_LIBRARY_PATH"] = f"{EXTRA_LIB_DIR}:{env.get('LD_LIBRARY_PATH', '')}"

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
            raise RuntimeError("Failed to connect to CDP")

        ws = SimpleWebSocket(ws_url)
        ws.call("Page.enable")
        ws.call("Runtime.enable")

        stable = 0
        for _ in range(80):
            try:
                ready = ws.eval_js(
                    "Boolean(window.__starfallBooted && window.__starfallWave1 && window.__starfallWave2 && document.readyState === 'complete')"
                )
                if ready:
                    ws.eval_js("new Promise(r => setTimeout(r, 250))")
                    stable += 1
                    if stable >= 2:
                        break
                    continue
            except RuntimeError:
                pass
            stable = 0
            time.sleep(0.25)

        # Standard tall portrait Android viewport (393x873, dpr 2.75)
        ws.call(
            "Emulation.setDeviceMetricsOverride",
            {
                "width": 393,
                "height": 873,
                "deviceScaleFactor": 2.75,
                "mobile": True
            }
        )
        ws.call("Emulation.setTouchEmulationEnabled", {"enabled": True})

        # 1. Capture Boss Combat
        print("Capturing Boss Combat with Health HUD...")
        ws.eval_js("""(() => {
            window.dispatchEvent(new Event('resize'));
            window.__starfallWave1.preparePlayState();
            window.__starfallWave1.setPlayerState({ x: 0, y: -0.68, settleCamera: true });
            window.__starfallWave1.triggerBossEntry(8);
            window.__starfallWave1.triggerBossCombat();
            window.__starfallWave1.stepSimulation(10, 0.016);
        })()""")
        time.sleep(0.4)
        save_screenshot(ws, "w2s2_boss_combat_portrait_393x873.jpg")

        # 2. Capture Core Surge Minigame
        print("Capturing Rescue Minigame 1: Core Surge...")
        ws.eval_js("""(() => {
            window.__starfallWave1.triggerRescue('core_surge');
        })()""")
        time.sleep(0.3)
        save_screenshot(ws, "w2s2_rescue_core_surge_portrait_393x873.jpg")

        # 3. Capture Reaction Lock Minigame
        print("Capturing Rescue Minigame 2: Reaction Lock...")
        ws.eval_js("""(() => {
            window.__starfallWave1.triggerRescue('reaction_lock');
        })()""")
        time.sleep(0.3)
        save_screenshot(ws, "w2s2_rescue_reaction_lock_portrait_393x873.jpg")

        # 4. Capture Salvage Glide Minigame
        print("Capturing Rescue Minigame 3: Salvage Glide...")
        ws.eval_js("""(() => {
            window.__starfallWave1.triggerRescue('salvage_glide');
        })()""")
        time.sleep(0.3)
        save_screenshot(ws, "w2s2_rescue_salvage_glide_portrait_393x873.jpg")

        # 5. Capture Return to Hub
        print("Capturing Return-to-Hub...")
        ws.eval_js("""(() => {
            window.__starfallWave1.simulateFinalDeath();
        })()""")
        time.sleep(1.4) # Wait for 1.1s death transition
        save_screenshot(ws, "w2s2_return_to_hub_portrait_393x873.jpg")

        print("All visual evidence captured successfully!")

    finally:
        if ws and hasattr(ws, "sock") and ws.sock:
            try:
                ws.sock.close()
            except Exception:
                pass
        chrome.terminate()
        srv.terminate()
        try:
            chrome.wait(timeout=2)
            srv.wait(timeout=2)
        except Exception:
            pass

if __name__ == "__main__":
    main()
