import json
import os
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECEIPT_FILE = os.path.join(ROOT, "Structure", "wave0_diagnostic_receipt.json")
EVIDENCE_DIR = os.path.join(ROOT, "Structure", "evidence", "wave0")
LINUX_CHROME_BIN = "/home/rkhol/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome"
EDGE_BIN = "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
BROWSER_BIN = LINUX_CHROME_BIN if os.path.exists(LINUX_CHROME_BIN) else EDGE_BIN
PORT = 8799
CAMPAIGN_URL = f"http://127.0.0.1:{PORT}/tools/test_wave0_in_browser.html"

def kill_headless_edge():
    if BROWSER_BIN == LINUX_CHROME_BIN:
        return
    try:
        subprocess.run(
            [
                "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe",
                "-NoProfile",
                "-Command",
                "Get-CimInstance Win32_Process -Filter \"Name='msedge.exe' AND CommandLine LIKE '%--headless%'\" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=8,
        )
    except Exception:
        pass

EXPECTED_SCREENSHOTS = [
    "wave0_mobile_portrait_reachability.png",
    "wave0_collision_phantom_hit_edge.png",
    "wave0_collision_z_lead_offset.png",
    "wave0_desktop_vertical_steer_bottom.png",
]


def ensure_server():
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/index.html", timeout=1.5) as resp:
            if resp.status == 200:
                return None
    except Exception:
        pass

    server_proc = subprocess.Popen(
        [sys.executable, os.path.join(ROOT, "tools", "serve_hangar.py"), str(PORT)],
        cwd=ROOT,
    )
    for _ in range(25):
        time.sleep(0.15)
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/index.html", timeout=1.5) as resp:
                if resp.status == 200:
                    return server_proc
        except Exception:
            pass
    return server_proc


def main():
    print("=" * 84)
    print("   STARFALL SALVAGE — WAVE 0 IN-BROWSER DIAGNOSTIC & VISUAL EVIDENCE CAMPAIGN")
    print("   Browser: Microsoft Edge (Headless WebGL) | Target: " + CAMPAIGN_URL)
    print("=" * 84)

    server_proc = ensure_server()
    try:
        if os.path.exists(RECEIPT_FILE):
            try:
                os.remove(RECEIPT_FILE)
            except Exception:
                pass

        kill_headless_edge()

        cmd = [
            BROWSER_BIN,
            "--headless=new",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--disable-backgrounding-occluded-windows",
            "--use-gl=angle",
            "--use-angle=swiftshader-webgl",
            "--enable-unsafe-swiftshader",
            "--enable-webgl",
            "--ignore-gpu-blocklist",
            "--force-device-scale-factor=1",
            "--window-size=1600,1000",
            CAMPAIGN_URL,
        ]
        env = os.environ.copy()
        chrome_lib_dir = "/home/rkhol/.cache/chrome-libs/root/usr/lib/x86_64-linux-gnu"
        if os.path.isdir(chrome_lib_dir):
            prev_ld = env.get("LD_LIBRARY_PATH", "")
            env["LD_LIBRARY_PATH"] = f"{chrome_lib_dir}:{prev_ld}" if prev_ld else chrome_lib_dir
        print(f"\n[Browser Launch: {os.path.basename(BROWSER_BIN)}] Executing Wave 0 multi-viewport, collision & screenshot campaign...")
        proc = subprocess.Popen(cmd, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        receipt = None
        start_time = time.time()
        try:
            while time.time() - start_time < 75:
                if os.path.exists(RECEIPT_FILE):
                    try:
                        with open(RECEIPT_FILE, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        if data.get("verdict") in ("PASS", "FAIL"):
                            receipt = data
                            break
                    except Exception:
                        pass
                time.sleep(0.4)
        finally:
            try:
                proc.kill()
            except Exception:
                pass
            kill_headless_edge()

        if not receipt:
            print("[FAIL] Timed out waiting for Wave 0 browser diagnostic receipt.")
            sys.exit(1)

        steps = receipt.get("steps", [])
        passes = 0
        fails = 0
        for s in steps:
            t = s.get("type", "info").upper()
            step_id = s.get("step", "")
            desc = s.get("desc", "")
            print(f"[{t}] {step_id:34} — {desc}")
            if t == "PASS":
                passes += 1
            elif t == "FAIL":
                fails += 1

        print("\n--- Verifying Captured Composite PNG Screenshots ---")
        for fname in EXPECTED_SCREENSHOTS:
            fpath = os.path.join(EVIDENCE_DIR, fname)
            if not os.path.exists(fpath) or os.path.getsize(fpath) < 4096:
                print(f"[FAIL] Missing or empty screenshot: {fpath}")
                fails += 1
            else:
                kb = os.path.getsize(fpath) / 1024.0
                print(f"[PASS] {fname:44} ({kb:.1f} KB)")

        print("\n" + "=" * 84)
        print(f"   WAVE 0 BROWSER CAMPAIGN VERDICT: {receipt.get('verdict')} ({passes} passed, {fails} failed)")
        print(f"   Receipt saved:     {RECEIPT_FILE}")
        print(f"   Screenshots saved: {EVIDENCE_DIR}")
        print("=" * 84)

        if receipt.get("verdict") != "PASS" or fails > 0:
            sys.exit(1)
    finally:
        if server_proc is not None:
            try:
                server_proc.terminate()
            except Exception:
                pass


if __name__ == "__main__":
    main()
