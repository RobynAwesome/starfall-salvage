"""Machine-readable session continuity for Kopano sub-brains.

Writes Structure/SESSION_STATE.json so a new Cursor session can reload context
without relying on lossy chat summarization.

Usage:
  python tools/session_handoff.py show
  python tools/session_handoff.py close --track STARFALL --commit 863cbfa --build 20260514-guest-cta-a
  python tools/session_handoff.py validate
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / "Structure" / "SESSION_STATE.json"
ALLOWED_TRACKS = {"STARFALL", "ARENA_FIXTURES", "KC", "MULTI"}


def utc_now() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def read_state() -> dict[str, Any]:
    if not STATE_PATH.exists():
        return {"schema_version": 1}
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def write_state(payload: dict[str, Any]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def git_head() -> str:
    try:
        out = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        )
        return out.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def validate_state(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    track = payload.get("active_track")
    if track not in ALLOWED_TRACKS:
        errors.append(f"active_track must be one of {sorted(ALLOWED_TRACKS)}")
    if not payload.get("deploy_url"):
        errors.append("deploy_url is required")
    if payload.get("active_track") == "STARFALL" and "starfallsavage" in str(payload.get("deploy_url", "")):
        errors.append("deploy_url uses savage typo; must be starfallsalvage.kopanolabs.com")
    if not payload.get("session_derivative"):
        errors.append("session_derivative is empty — new sessions will lack narrative context")
    return errors


def cmd_show() -> int:
    if not STATE_PATH.exists():
        print(json.dumps({"error": "SESSION_STATE.json missing", "path": str(STATE_PATH)}))
        return 1
    sys.stdout.buffer.write(STATE_PATH.read_bytes())
    return 0


def cmd_close(args: argparse.Namespace) -> int:
    prior = read_state()
    payload = {
        "schema_version": 1,
        "updated_at": utc_now(),
        "active_track": args.track,
        "blocked_tracks": [t.strip() for t in args.block.split(",") if t.strip()],
        "repo": args.repo or prior.get("repo", "Kopano-Labs/starfall-salvage"),
        "branch": args.branch or prior.get("branch", "main"),
        "commit": args.commit or git_head(),
        "build_tag": args.build or prior.get("build_tag", ""),
        "prior_build_tag": prior.get("build_tag"),
        "deploy_url": args.deploy_url or prior.get("deploy_url", "https://starfallsalvage.kopanolabs.com"),
        "package_id": prior.get("package_id", "com.kopanolabs.starfall.salvage"),
        "twa_status": args.twa_status or prior.get("twa_status", "parked"),
        "next_target": args.next_target or "",
        "doctrine_locks": prior.get("doctrine_locks", []),
        "human_gates": prior.get("human_gates", []),
        "incidents": prior.get("incidents", []),
        "session_derivative": args.derivative or prior.get("session_derivative", ""),
        "kc_seed_command": "python tools/kc_main_brain_scan.py --once --seed-kc",
        "tierzero_urls": prior.get("tierzero_urls", []),
        "acceptance_gates": [g.strip() for g in args.gates.split("|") if g.strip()],
    }
    errors = validate_state(payload)
    if errors:
        print(json.dumps({"ok": False, "errors": errors}, indent=2), file=sys.stderr)
        return 2
    write_state(payload)
    print(json.dumps({"ok": True, "path": str(STATE_PATH), "commit": payload["commit"]}, indent=2))
    return 0


def cmd_validate() -> int:
    payload = read_state()
    errors = validate_state(payload)
    print(json.dumps({"ok": not errors, "errors": errors, "track": payload.get("active_track")}, indent=2))
    return 0 if not errors else 2


def main() -> int:
    parser = argparse.ArgumentParser(description="Kopano session continuity handoff")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("show", help="print SESSION_STATE.json")

    close = sub.add_parser("close", help="write session end state")
    close.add_argument("--track", default="STARFALL", choices=sorted(ALLOWED_TRACKS))
    close.add_argument("--block", default="ARENA_FIXTURES", help="comma-separated blocked tracks")
    close.add_argument("--commit", default="")
    close.add_argument("--build", default="")
    close.add_argument("--branch", default="main")
    close.add_argument("--repo", default="")
    close.add_argument("--deploy-url", default="")
    close.add_argument("--twa-status", default="")
    close.add_argument("--next-target", default="")
    close.add_argument("--derivative", default="")
    close.add_argument("--gates", default="", help="pipe-separated acceptance gates")

    sub.add_parser("validate", help="validate SESSION_STATE.json")

    args = parser.parse_args()
    if args.command == "show":
        return cmd_show()
    if args.command == "close":
        return cmd_close(args)
    if args.command == "validate":
        return cmd_validate()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
