import subprocess
import os
import sys
import time
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECEIPT_FILE = os.path.join(ROOT, "Structure", "journey_interaction_receipt.json")
EDGE_BIN = "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
URL = "http://localhost:8799/tools/interactive_player_journey_test.html"

def main():
    print("=" * 80)
    print("   SOVEREIGN HANGAR — INTEGRATED REAL PLAYER INTERACTION CAMPAIGN")
    print("   Browser: Microsoft Edge (Edg/156) under live Service Worker")
    print("   Target:  " + URL)
    print("=" * 80)

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
        "--window-size=1280,1024",
        URL
    ]

    print("\n[Edge Launch] Spawning headless Edge process...")
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    start_time = time.time()
    max_wait = 45  # seconds
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

    if not receipt:
        print(f"[FAIL] Timed out waiting for receipt after {max_wait}s.")
        sys.exit(1)

    print("\n" + "=" * 80)
    print(f"   JOURNEY EXECUTION RESULT: {receipt.get('verdict')}")
    print("=" * 80)

    steps = receipt.get("steps", [])
    passes = 0
    fails = 0
    for s in steps:
        t = s.get("type", "info").upper()
        step_id = s.get("step", "")
        desc = s.get("desc", "")
        print(f"[{t}] {step_id:12} — {desc}")
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
