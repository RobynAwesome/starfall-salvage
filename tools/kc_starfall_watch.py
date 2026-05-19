from __future__ import annotations

import argparse
import importlib.util
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
STRUCTURE_DIR = ROOT / "Structure"
LOG_PATH = STRUCTURE_DIR / "KC Review Log.jsonl"
DEFAULT_KC_ROOT = Path(
    r"C:\Users\rkhol\OneDrive\Documents\Anthropic\Introduction to MCP"
)
DEFAULT_KC_IMPL = (
    DEFAULT_KC_ROOT
    / "Schematics"
    / "06-Reference"
    / "kopano-code-implementation"
)
DEFAULT_KC_STORE = DEFAULT_KC_IMPL / ".kc" / "context_store.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def run_command(command: list[str], timeout: int = 25) -> dict[str, Any]:
    try:
        result = subprocess.run(
            command,
            cwd=ROOT,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return {
            "command": command,
            "ok": result.returncode == 0,
            "returncode": result.returncode,
            "stdout": result.stdout.strip()[-1200:],
            "stderr": result.stderr.strip()[-1200:],
        }
    except (OSError, subprocess.TimeoutExpired) as error:
        return {
            "command": command,
            "ok": False,
            "returncode": None,
            "stdout": "",
            "stderr": str(error),
        }


def check_required_files() -> dict[str, Any]:
    required = [
        "index.html",
        "styles.css",
        "src/game.js",
        "assets/kopano-labs-logo.png",
        "backend/starfall_server.py",
        "PROJECT_DOCUMENTATION.md",
        "README.md",
        "DEPLOYMENT.md",
        "CONTRIBUTING.md",
        "Structure/Starfall Salvage - Index.md",
        "Structure/KC Dev Lane.md",
        "Structure/KC Student-Teacher Curriculum.md",
    ]
    missing = [path for path in required if not (ROOT / path).exists()]
    return {
        "name": "required_files",
        "expected": "all branded, backend, docs, sub-brain, and curriculum files exist",
        "ok": not missing,
        "actual": "all files present" if not missing else f"missing: {', '.join(missing)}",
        "retry": "create or restore the missing files, then rerun the KC watch check",
    }


def _read_text(relative: str) -> str:
    path = ROOT / relative
    if not path.exists():
        return ""
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def check_kopano_upgrade_features() -> dict[str, Any]:
    """Student check: prove the 2026-05-05 Kopano Labs Upgrade actually shipped."""
    game_js = _read_text("src/game.js")
    index_html = _read_text("index.html")
    backend_py = _read_text("backend/starfall_server.py")
    contributing_md = _read_text("CONTRIBUTING.md")
    manifest_json = _read_text("manifest.webmanifest")
    pwa_boot_js = _read_text("src/pwa-boot.js")
    service_worker_js = _read_text("service-worker.js")
    orbital_case_study = _read_text(
        "Structure/2026-05-18 - Orbital Wreck Lane Visual Slice Case Study.md"
    )
    movement_case_study = _read_text(
        "Structure/2026-05-19 - Movement Control Fix Case Study.md"
    )
    current_build = "20260519-movement-control"

    proofs = {
        # Lesson 001 — Kopano Labs Upgrade
        "haptic_vibrate_present": "navigator.vibrate" in game_js,
        "haptic_damage_pattern": "[200, 100, 200]" in game_js,
        "haptic_gameover_pattern": "[400, 120, 400, 120, 600]" in game_js,
        "whatsapp_share_url": "api.whatsapp.com/send" in game_js,
        "whatsapp_share_domain_correct": "starfallsalvage.kopanolabs.com" in game_js
        and "starfallsavage.kopanolabs.com" not in game_js,
        "share_button_markup": 'id="shareWhatsappButton"' in index_html,
        "kasi_comm_markup": 'id="kasiComm"' in index_html,
        "kasi_comm_form_markup": 'id="kasiCommForm"' in index_html,
        "chat_table_schema": "chat_messages" in backend_py,
        "chat_get_route": '/api/chat' in backend_py and "handle_chat" in backend_py,
        "chat_rate_limit": "Slow down, pilot" in backend_py,
        "chat_polling_interval": "CHAT_POLL_INTERVAL_MS" in game_js,
        "open_graph_tags": 'property="og:title"' in index_html
        and 'property="og:image"' in index_html,
        "twitter_card_tags": 'name="twitter:card"' in index_html,
        "contributing_bounty_doctrine": "Sovereign Tech" in contributing_md
        and "bounty" in contributing_md.lower(),
        "contributing_local_rails": "Yoco" in contributing_md
        and "PayFast" in contributing_md
        and "EFT" in contributing_md,
        # Lesson 005 — Mobile Sovereignty (PWA Foundation)
        "pwa_manifest_file_present": '"name": "Starfall Salvage"' in manifest_json,
        "pwa_manifest_linked": 'rel="manifest"' in index_html,
        "pwa_apple_touch_icon": 'rel="apple-touch-icon"' in index_html,
        "pwa_manifest_theme_color": '"theme_color": "#07080e"' in manifest_json,
        "pwa_manifest_display_standalone": '"display": "standalone"' in manifest_json,
        "pwa_manifest_lang_za": '"lang": "en-ZA"' in manifest_json,
        # Lesson 006 — Comms, Social, Capture, Bounty Incentive (2026-05-06)
        "idea_button_markup": 'id="submitIdeaButton"' in index_html,
        "diagnostics_button_markup": 'id="exportDiagnosticsButton"' in index_html,
        "social_share_row_markup": 'id="shareRow"' in index_html
        and 'data-share="twitter"' in index_html
        and 'data-share="facebook"' in index_html
        and 'data-share="linkedin"' in index_html
        and 'data-share="copy"' in index_html,
        "bounty_email_constant": "rkholofelo@kopanolabs.com" in game_js,
        "event_log_storage": "EVENTS_STORAGE_KEY" in game_js
        and "logEvent" in game_js,
        "diagnostics_exporter": "exportDiagnostics" in game_js,
        "kasi_comm_offline_bounty_cta": "Sovereign Tech bounty" in game_js,
        "incentive_panel_markup": "kasi-comm-incentive" in index_html,
        "bounty_email_in_html": "rkholofelo@kopanolabs.com" in index_html,
        # Lesson 007 — Mobile Functionality (Touch Input)
        "touch_axis_state": "touchAxis" in game_js and "activeTouchId" in game_js,
        "touch_capable_detect": "isTouchCapable" in game_js,
        "touch_start_handler": 'canvas.addEventListener("touchstart"' in game_js,
        "touch_move_handler": 'canvas.addEventListener("touchmove"' in game_js,
        "touch_end_handler": 'canvas.addEventListener("touchend"' in game_js,
        "tap_to_start_or_dash": "wasTap" in game_js and "dashRequested = true" in game_js,
        "touch_axis_in_movement": "moveX += touchAxis.x" in game_js,
        "touch_action_none_css": "touch-action: none" in _read_text("styles.css"),
        "mobile_control_hint_html": "Mobile:" in index_html and "tap to start" in index_html,
        # Lesson 008 — Onboarding Pop-up
        "onboarding_modal_markup": 'id="onboardingModal"' in index_html
        and 'id="onboardingAck"' in index_html
        and 'id="onboardingContinueButton"' in index_html,
        "onboarding_storage_key": "ONBOARDING_STORAGE_KEY" in game_js,
        "onboarding_acknowledge_required": "isOnboardingDone" in game_js
        and "markOnboardingDone" in game_js,
        "onboarding_css_modal": ".onboarding-modal" in _read_text("styles.css")
        and ".onboarding-card" in _read_text("styles.css"),
        # Lesson 009 — Speed-Triggered Background Shift
        "danger_zone_threshold": "speedMultiplier >= 2" in game_js,
        "danger_color_lerp": "dangerLerp" in game_js,
        "danger_event_logged": '"danger_zone_entered"' in game_js,
        # Lesson 010 — Player Shooting
        "player_bullet_spawn": "spawnPlayerBullet" in game_js,
        "player_bullet_cooldown": "state.bulletCooldown" in game_js,
        "f_key_fire": '"f"' in game_js and "spawnPlayerBullet()" in game_js,
        "bullet_collides_debris": '"debris_destroyed"' in game_js,
        # Lesson 011 — Boss Spawn + Boss Shoot-Back
        "boss_type_spawn": '"type": "boss"' in game_js or 'type: "boss"' in game_js,
        "boss_hp_state": "object.hp" in game_js and "maxHp" in game_js,
        "boss_shoot_function": "spawnBossBullet" in game_js,
        "boss_renderer": 'object.type === "boss"' in game_js,
        "boss_destroyed_event": '"boss_destroyed"' in game_js,
        # Lesson 012 — Mobile FIRE Button
        "mobile_fire_button_markup": 'id="mobileFireButton"' in index_html,
        "mobile_fire_button_css": ".mobile-fire-button" in _read_text("styles.css"),
        "mobile_fire_button_handler": "mobileFireButton" in game_js
        and "spawnPlayerBullet()" in game_js,
        # Lesson 013 — Orbital Wreck Lane Visual Identity
        "orbital_build_marker": "20260515-orbital-wreck-lane" in orbital_case_study,
        "camera_bank_state": "cameraRoll" in game_js and "BANK_MAX" in game_js,
        "corridor_pose_transform": "corridorPose" in game_js
        and "corridorPoint" in game_js,
        "parallax_star_layers": "starLayers" in game_js and "createStarLayer" in game_js,
        "planet_nebula_backdrop": "nebulaTexture" in game_js
        and "planetTexture" in game_js,
        "salvage_dressing_world": "salvageDressing" in game_js
        and "renderSalvageDressing" in game_js,
        "cache_bust_aligned": current_build in index_html,
        "pwa_boot_aligned": current_build in pwa_boot_js,
        "pwa_cache_aligned": current_build in service_worker_js,
        "visual_slice_case_study": "Save / Kill / Watch" in orbital_case_study,
        # Lesson 014 — Movement Control Unstuck
        "movement_build_marker": current_build in game_js,
        "pointer_steer_support": "supportsPointerEvents" in game_js
        and 'hud.shell.addEventListener("pointerdown"' in game_js,
        "flight_deck_drag_copy": "Drag anywhere on the flight deck" in game_js
        and "Drag the flight deck" in index_html,
        "debug_movement_probe": "__starfallDebug" in game_js,
        "pointer_focus_guard": 'window.addEventListener("pointerdown", (event)' in game_js
        and "!isGameInputBlocked(event.target)" in game_js,
        "movement_case_study": "Save / Kill / Watch" in movement_case_study,
    }
    missing = [name for name, ok in proofs.items() if not ok]
    return {
        "name": "kopano_upgrade_audit",
        "expected": f"all {len(proofs)} curriculum proofs present in shipped files",
        "ok": not missing,
        "actual": "all proofs satisfied" if not missing else f"missing proofs: {', '.join(missing)}",
        "retry": (
            "patch the listed feature back into the source file. Refer to "
            "Structure/KC Student-Teacher Curriculum.md for the exact spec."
        ),
        "proofs": proofs,
    }


def check_git_clean_enough() -> dict[str, Any]:
    status = run_command(["git", "status", "--short"])
    dirty_lines = [line for line in status["stdout"].splitlines() if line.strip()]
    return {
        "name": "git_status",
        "expected": "only intentional Starfall changes appear before commit",
        "ok": status["ok"],
        "actual": status["stdout"] or status["stderr"] or "clean",
        "retry": "inspect every dirty path; stage only intentional Starfall files",
        "dirty_count": len(dirty_lines),
    }


def check_syntax() -> list[dict[str, Any]]:
    node = run_command(["node", "--check", "src/game.js"])
    python = run_command(["python", "-m", "py_compile", "backend/starfall_server.py"])
    return [
        {
            "name": "javascript_syntax",
            "expected": "src/game.js parses with node --check",
            "ok": node["ok"],
            "actual": node["stdout"] or node["stderr"] or "ok",
            "retry": "fix the JavaScript parser error before gameplay testing",
        },
        {
            "name": "backend_syntax",
            "expected": "backend/starfall_server.py compiles with py_compile",
            "ok": python["ok"],
            "actual": python["stdout"] or python["stderr"] or "ok",
            "retry": "fix the Python parser error before starting the local backend",
        },
    ]


def check_backend_health(url: str) -> dict[str, Any]:
    try:
        with urllib.request.urlopen(url, timeout=2.5) as response:
            body = response.read().decode("utf-8")
            payload = json.loads(body)
            ok = response.status == 200 and payload.get("ok") is True
            actual = payload
    except (OSError, urllib.error.URLError, json.JSONDecodeError) as error:
        ok = False
        actual = str(error)
    return {
        "name": "backend_health",
        "expected": f"{url} returns JSON with ok=true",
        "ok": ok,
        "actual": actual,
        "retry": "start python backend/starfall_server.py --port 8765 and rerun",
    }


def build_report(health_url: str) -> dict[str, Any]:
    checks: list[dict[str, Any]] = [check_required_files(), check_git_clean_enough()]
    checks.extend(check_syntax())
    checks.append(check_backend_health(health_url))
    checks.append(check_kopano_upgrade_features())
    failed = [check for check in checks if not check.get("ok")]
    return {
        "timestamp": utc_now(),
        "project": "Starfall Salvage",
        "root": str(ROOT),
        "kc_role": "strict_dev_qa_lane",
        "summary": {
            "ok": not failed,
            "checks": len(checks),
            "failures": len(failed),
        },
        "checks": checks,
    }


def append_report(report: dict[str, Any]) -> None:
    STRUCTURE_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as log_file:
        log_file.write(json.dumps(report, sort_keys=True) + "\n")


def load_kc_module(kc_impl: Path):
    module_path = kc_impl / "src" / "kc_mcp.py"
    spec = importlib.util.spec_from_file_location("kc_mcp", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load KC module from {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def seed_kc_context(report: dict[str, Any], kc_impl: Path, kc_store_path: Path) -> str:
    module = load_kc_module(kc_impl)
    store = module.KcStore(kc_store_path)
    failed_checks = [check for check in report["checks"] if not check.get("ok")]
    retry_lines = [
        f"- {check['name']}: {check['retry']} Actual: {check['actual']}"
        for check in failed_checks
    ] or ["- No failures in this pass. Keep rerunning after every code change."]
    record = store.create({
        "title": f"Starfall Salvage KC hard QA pass - {report['timestamp']}",
        "teacher_context": (
            "KC is the strict dev QA student. Teacher (Claude / Master Robyn) ships features. "
            "KC reads Structure/KC Student-Teacher Curriculum.md, audits the codebase against it, "
            "and refuses to mark work complete unless every proof is present. "
            "Expected behavior: fail incomplete work, state what broke, issue retry instructions, and log proof."
        ),
        "student_response": json.dumps(report["summary"], sort_keys=True),
    })
    store.update({
        "id": record.id,
        "teacher_review": "\n".join(retry_lines),
        "status": "reviewed",
    })
    return record.id


def main() -> int:
    parser = argparse.ArgumentParser(description="Starfall Salvage KC hard-QA watcher")
    parser.add_argument("--once", action="store_true", help="run one check pass and exit")
    parser.add_argument("--seed-kc", action="store_true", help="write the report to the KC context store")
    parser.add_argument("--interval", type=int, default=60)
    parser.add_argument("--health-url", default="http://127.0.0.1:8765/api/health")
    parser.add_argument("--kc-root", type=Path, default=DEFAULT_KC_ROOT)
    parser.add_argument("--kc-impl", type=Path, default=DEFAULT_KC_IMPL)
    parser.add_argument("--kc-store", type=Path, default=Path(os.environ.get("KC_CONTEXT_STORE", DEFAULT_KC_STORE)))
    args = parser.parse_args()

    while True:
        report = build_report(args.health_url)
        if args.seed_kc:
            try:
                report["kc_context_id"] = seed_kc_context(report, args.kc_impl, args.kc_store)
            except Exception as error:  # noqa: BLE001 - this is a watchdog log path.
                report["kc_seed_error"] = str(error)
        append_report(report)
        print(json.dumps(report["summary"], sort_keys=True), flush=True)
        if args.once:
            break
        time.sleep(max(10, args.interval))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
