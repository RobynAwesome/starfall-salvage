import subprocess
import os
import sys
import time
import json
from pathlib import Path

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECEIPT_FILE = os.path.join(ROOT, "Structure", "release_upgrade_receipt.json")
CHROME_BIN = "/home/rkhol/.cache/puppeteer/chrome/linux-156.0.8078.47/chrome-linux64/chrome"
EXTRA_LIB_DIR = "/home/rkhol/.cache/chrome-libs/root/usr/lib/x86_64-linux-gnu"
EDGE_BIN = "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
HTTP_PORT = 8799
URL = f"http://127.0.0.1:{HTTP_PORT}/tools/test_release_cache_upgrade.html"

def main():
    print("=" * 80)
    print("   STARFALL SALVAGE — STAGE 1 TO STAGE 2 RELEASE CACHE UPGRADE AUDIT")
    print("   Target:  " + URL)
    print("=" * 80)

    if os.path.exists(RECEIPT_FILE):
        try:
            os.remove(RECEIPT_FILE)
        except Exception:
            pass

    server_proc = None
    try:
        # Check if local server is already running
        import urllib.request
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{HTTP_PORT}/", timeout=1):
                pass
        except Exception:
            print(f"[Server] Starting background server on port {HTTP_PORT}...")
            server_proc = subprocess.Popen(
                [sys.executable, os.path.join(ROOT, "tools", "serve_hangar.py"), str(HTTP_PORT)],
                cwd=ROOT,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            time.sleep(1.0)

        env = os.environ.copy()
        if os.path.exists(CHROME_BIN):
            user_data_dir = f"/tmp/starfall_upgrade_{int(time.time())}"
            env["LD_LIBRARY_PATH"] = f"{EXTRA_LIB_DIR}:{env.get('LD_LIBRARY_PATH', '')}"
            cmd = [
                CHROME_BIN,
                "--headless=new",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--use-gl=angle",
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
                "--enable-webgl",
                "--ignore-gpu-blocklist",
                f"--user-data-dir={user_data_dir}",
                "--window-size=1280,1024",
                URL
            ]
            print(f"\n[Browser Launch] Spawning headless Linux Chrome with persistent storage ({user_data_dir})...")
        elif os.path.exists(EDGE_BIN):
            user_data_dir = f"C:\\Users\\rkhol\\AppData\\Local\\Temp\\starfall_upgrade_{int(time.time())}"
            cmd = [
                EDGE_BIN,
                "--headless=new",
                "--no-first-run",
                "--no-default-browser-check",
                "--enable-webgl",
                "--ignore-gpu-blocklist",
                f"--user-data-dir={user_data_dir}",
                "--window-size=1280,1024",
                URL
            ]
            print(f"\n[Browser Launch] Spawning headless Edge with persistent storage...")
        else:
            print("[FAIL] Neither Chrome nor Edge binary found on system.")
            sys.exit(1)

        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)

        start_time = time.time()
        max_wait = 90  # seconds
        receipt = None

        try:
            while time.time() - start_time < max_wait:
                if os.path.exists(RECEIPT_FILE):
                    try:
                        with open(RECEIPT_FILE, "r") as f:
                            data = json.load(f)
                        if data.get("verdict") in ("PASS", "FAIL"):
                            receipt = data
                            break
                    except Exception:
                        pass
                time.sleep(0.5)
        finally:
            try:
                proc.kill()
            except Exception:
                pass
    finally:
        if server_proc:
            try:
                server_proc.kill()
            except Exception:
                pass

    if not receipt:
        print(f"[FAIL] Timed out waiting for upgrade receipt after {max_wait}s.")
        sys.exit(1)

    print("\n" + "=" * 80)
    print(f"   UPGRADE EXECUTION RESULT: {receipt.get('verdict')}")
    print(f"   Old Build: {receipt.get('oldBuild')} ({receipt.get('oldCacheName')})")
    print(f"   New Build: {receipt.get('newBuild')} ({receipt.get('newCacheName')})")
    print("=" * 80)

    steps = receipt.get("steps", [])
    passes = 0
    fails = 0
    for s in steps:
        t = s.get("type", "info").upper()
        step_id = s.get("step", "")
        desc = s.get("desc", "")
        print(f"[{t}] {step_id:24} — {desc}")
        if t == "PASS":
            passes += 1
        elif t == "FAIL":
            fails += 1
        if s.get("details") and t in ("PASS", "FAIL"):
            print(f"       Details: {json.dumps(s.get('details'))}")

    print("-" * 80)
    print(f"Summary: {passes} passed, {fails} failed, total steps: {len(steps)}")
    print(f"Receipt recorded at: {RECEIPT_FILE}")
    print("=" * 80 + "\n")

    if receipt.get("verdict") == "PASS" and fails == 0:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
