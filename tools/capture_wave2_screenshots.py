#!/usr/bin/env python3
"""
Capture post-implementation Wave 2 Stage 1 screenshots across 5 viewports:
- 360x640 (standard small portrait)
- 393x873 (tall modern Android / Redmi 13)
- 720x1280 (owner Android 16 device recording aspect)
- 873x393 (landscape mobile)
- 1280x800 (standard desktop)
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
OUT_DIR = ROOT / "artifacts" / "wave2_visuals" / "after"
OUT_DIR.mkdir(parents=True, exist_ok=True)
BRAIN_DIR = Path("/home/rkhol/.gemini/antigravity/brain/1c926809-ecf7-487a-90b9-3d4e8d3e280e/mobile_video_evidence")
BRAIN_DIR.mkdir(parents=True, exist_ok=True)

CHROME_BIN = Path("/home/rkhol/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome")
EXTRA_LIB_DIR = "/home/rkhol/.cache/chrome-libs/root/usr/lib/x86_64-linux-gnu"
HTTP_PORT = 8991
CDP_PORT = 9331

sys.path.insert(0, str(ROOT / "tools"))
from run_wave1_browser_audit import SimpleWebSocket

VIEWPORTS = [
    {
        "name": "after_portrait_360x640",
        "width": 360,
        "height": 640,
        "dpr": 2.0,
        "mobile": True
    },
    {
        "name": "after_portrait_393x873",
        "width": 393,
        "height": 873,
        "dpr": 2.75,
        "mobile": True
    },
    {
        "name": "after_portrait_720x1280",
        "width": 720,
        "height": 1280,
        "dpr": 1.0,
        "mobile": True
    },
    {
        "name": "after_landscape_873x393",
        "width": 873,
        "height": 393,
        "dpr": 2.0,
        "mobile": True
    },
    {
        "name": "after_desktop_1280x800",
        "width": 1280,
        "height": 800,
        "dpr": 1.0,
        "mobile": False
    }
]

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

        # Robust wait_for_ready tolerating service worker reload
        stable = 0
        for _ in range(80):
            try:
                ready = ws.eval_js(
                    "Boolean(window.__starfallBooted && window.__starfallWave1 && window.__starfallDebug && document.readyState === 'complete')"
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

        for vp in VIEWPORTS:
            print(f"Capturing {vp['name']} ({vp['width']}x{vp['height']})...")
            ws.call(
                "Emulation.setDeviceMetricsOverride",
                {
                    "width": vp["width"],
                    "height": vp["height"],
                    "deviceScaleFactor": vp["dpr"],
                    "mobile": vp["mobile"]
                }
            )
            ws.call("Emulation.setTouchEmulationEnabled", {"enabled": vp["mobile"]})
            ws.eval_js("""(() => {
                window.dispatchEvent(new Event('resize'));
                window.__starfallWave1.preparePlayState();
                window.__starfallWave1.setPlayerState({ x: 0, y: -0.68, settleCamera: true });
                window.__starfallWave1.stepSimulation(25, 0.016);
            })()""")
            time.sleep(0.4)

            # Capture screenshot
            shot_res = ws.call("Page.captureScreenshot", {"format": "jpeg", "quality": 90})
            img_bytes = base64.b64decode(shot_res["data"])

            out_file = OUT_DIR / f"{vp['name']}.jpg"
            out_file.write_bytes(img_bytes)
            brain_file = BRAIN_DIR / f"{vp['name']}.jpg"
            brain_file.write_bytes(img_bytes)
            print(f"Saved: {out_file} ({len(img_bytes)} bytes)")

        print("All after screenshots captured successfully!")
    finally:
        if ws:
            ws.close()
        chrome.terminate()
        try:
            chrome.wait(timeout=3)
        except Exception:
            chrome.kill()
        srv.terminate()
        try:
            srv.wait(timeout=3)
        except Exception:
            srv.kill()

if __name__ == "__main__":
    main()
