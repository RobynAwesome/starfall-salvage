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
EDGE_BIN = "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
WIN_TEMP_DIR_WSL = "/mnt/c/Users/rkhol/AppData/Local/Temp"
WIN_TEMP_DIR_WIN = r"C:\Users\rkhol\AppData\Local\Temp"
PORT = 8799
CAMPAIGN_URL = f"http://localhost:{PORT}/tools/test_wave0_in_browser.html"

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
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
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

        cmd = [
            EDGE_BIN,
            "--headless=new",
            "--no-first-run",
            "--no-default-browser-check",
            "--enable-webgl",
            "--ignore-gpu-blocklist",
            "--force-device-scale-factor=1",
            "--window-size=2640,1200",
            CAMPAIGN_URL,
        ]
        print("\n[Edge Launch] Executing Wave 0 multi-viewport, collision & screenshot campaign...")
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        receipt = None
        start_time = time.time()
        try:
            while time.time() - start_time < 45:
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
