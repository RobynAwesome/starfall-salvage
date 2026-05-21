"""KC end-to-end reader for the Kopano Labs Main Brain (Schematics).

This is the second tier of the KC Student-Teacher Protocol. Where
`tools/kc_starfall_watch.py` audits the *sub-brain* (Starfall Salvage repo),
this scanner walks the *main brain* (`Schematics/` Obsidian vault) and
verifies cross-references — so KC is always grounded in BOTH halves of the
Kopano ecosystem at once.

Usage:
    python tools/kc_main_brain_scan.py --once --seed-kc

Outputs JSON to stdout (summary), appends a structured pass to
`Structure/KC Main Brain Log.jsonl`, and (with --seed-kc) writes a record
to the Main Brain context store at:
    Schematics/06-Reference/kopano-code-implementation/.kc/context_store.json
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SUB_BRAIN_ROOT = Path(__file__).resolve().parents[1]
STRUCTURE_DIR = SUB_BRAIN_ROOT / "Structure"
LOG_PATH = STRUCTURE_DIR / "KC Main Brain Log.jsonl"

DEFAULT_MAIN_BRAIN_ROOT = Path(
    r"C:\Users\rkhol\OneDrive\Documents\Anthropic\Introduction to MCP"
)
DEFAULT_SCHEMATICS = DEFAULT_MAIN_BRAIN_ROOT / "Schematics"
DEFAULT_KC_IMPL = DEFAULT_SCHEMATICS / "06-Reference" / "kopano-code-implementation"
DEFAULT_KC_STORE = DEFAULT_KC_IMPL / ".kc" / "context_store.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def list_md_files(folder: Path) -> list[Path]:
    if not folder.exists() or not folder.is_dir():
        return []
    return sorted(folder.glob("*.md"))


def read_text_safe(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def section_summary(folder: Path, label: str) -> dict[str, Any]:
    files = list_md_files(folder)
    return {
        "label": label,
        "path": str(folder.relative_to(DEFAULT_MAIN_BRAIN_ROOT))
        if folder.exists()
        else str(folder),
        "exists": folder.exists(),
        "md_file_count": len(files),
        "sample_titles": [p.stem for p in files[:5]],
    }


def check_comms_log(schematics: Path) -> dict[str, Any]:
    path = schematics / "04-Updates" / "comms-log.md"
    text = read_text_safe(path)
    starfall_count = text.lower().count("starfall salvage")
    has_live_entry = "starfall salvage live on production domain" in text.lower()
    has_kc_student_teacher = "kc student-teacher" in text.lower()
    return {
        "name": "comms_log_has_starfall_entries",
        "expected": "comms-log mentions Starfall Salvage at least once and includes the LIVE production entry",
        "ok": starfall_count > 0 and has_live_entry,
        "actual": {
            "starfall_mentions": starfall_count,
            "has_live_entry": has_live_entry,
            "has_kc_student_teacher": has_kc_student_teacher,
            "size_bytes": path.stat().st_size if path.exists() else 0,
        },
        "retry": "append a Starfall entry to Schematics/04-Updates/comms-log.md when shipping production work",
    }


def check_protocols_referenced(schematics: Path) -> dict[str, Any]:
    protocols_dir = schematics / "18-PROTOCOLS"
    required_doctrines = [
        "Lovable-Primary Build Doctrine.md",
        "Refusal Authority Protocol.md",
        "Accountability Doctrine.md",
        "KC Memory-Renter Doctrine.md",
        "12 Commandments - Purpose-Driven Doctrine.md",
    ]
    missing = [
        name
        for name in required_doctrines
        if not (protocols_dir / name).exists()
    ]
    return {
        "name": "protocols_referenced",
        "expected": "all 5 anchor doctrines exist in Schematics/18-PROTOCOLS",
        "ok": not missing,
        "actual": {
            "found": [n for n in required_doctrines if n not in missing],
            "missing": missing,
        },
        "retry": "restore missing doctrine docs in Schematics/18-PROTOCOLS",
    }


def check_kc_context_store(kc_store: Path) -> dict[str, Any]:
    if not kc_store.exists():
        return {
            "name": "kc_context_store_present",
            "expected": "KC context store exists with at least one record",
            "ok": False,
            "actual": "missing",
            "retry": "run python tools/kc_starfall_watch.py --once --seed-kc to seed",
        }
    try:
        payload = json.loads(read_text_safe(kc_store))
    except json.JSONDecodeError:
        return {
            "name": "kc_context_store_present",
            "expected": "KC context store parses as JSON",
            "ok": False,
            "actual": "invalid JSON",
            "retry": "repair the context store; run a fresh KC pass to recreate",
        }
    raw_records = payload.get("records") or payload.get("contexts") or []
    # KcStore persists `records` as a dict keyed by id; older formats may use a list.
    if isinstance(raw_records, dict):
        record_items = list(raw_records.items())
    elif isinstance(raw_records, list):
        record_items = [
            (r.get("id") if isinstance(r, dict) else None, r)
            for r in raw_records
        ]
    else:
        record_items = []
    starfall_records = [
        (rid, r)
        for rid, r in record_items
        if isinstance(r, dict) and "starfall" in str(r.get("title", "")).lower()
    ]
    return {
        "name": "kc_context_store_present",
        "expected": "context store has at least one Starfall record",
        "ok": len(starfall_records) > 0,
        "actual": {
            "total_records": len(record_items),
            "starfall_records": len(starfall_records),
            "latest_ids": [str(rid) for rid, _ in record_items[-5:]],
        },
        "retry": "run python tools/kc_starfall_watch.py --once --seed-kc to seed Starfall record",
    }


def check_sub_brain_alignment(schematics: Path) -> dict[str, Any]:
    """Confirm sub-brain (Starfall Salvage) and main brain agree on the live URL."""
    project_status = SUB_BRAIN_ROOT / "Structure" / "Project Status.md"
    sub_text = read_text_safe(project_status).lower()
    main_text = read_text_safe(schematics / "04-Updates" / "comms-log.md").lower()

    live_url = "starfallsalvage.kopanolabs.com"
    proofs = {
        "sub_brain_live_url": live_url in sub_text,
        "main_brain_live_url": live_url in main_text,
        "sub_brain_no_savage_typo": "https://starfallsavage.kopanolabs.com" not in sub_text,
        "main_brain_no_savage_typo": "https://starfallsavage.kopanolabs.com" not in main_text,
    }
    missing = [k for k, v in proofs.items() if not v]
    return {
        "name": "sub_brain_main_brain_alignment",
        "expected": "live URL appears in both brains, savage typo absent from both",
        "ok": not missing,
        "actual": proofs,
        "retry": "patch the listed brain to mention starfallsalvage.kopanolabs.com or remove the savage typo",
    }


def build_report(schematics: Path, kc_store: Path) -> dict[str, Any]:
    sections = [
        section_summary(schematics / "01-Mission", "01-Mission"),
        section_summary(schematics / "02-Strategy", "02-Strategy"),
        section_summary(schematics / "03-Architecture", "03-Architecture"),
        section_summary(schematics / "04-Updates", "04-Updates"),
        section_summary(schematics / "07-Sessions By Day", "07-Sessions By Day"),
        section_summary(schematics / "09-KOPANO PROGRESSION", "09-KOPANO PROGRESSION"),
        section_summary(schematics / "17-KC-JOURNAL", "17-KC-JOURNAL"),
        section_summary(schematics / "18-PROTOCOLS", "18-PROTOCOLS"),
    ]
    checks = [
        check_comms_log(schematics),
        check_protocols_referenced(schematics),
        check_kc_context_store(kc_store),
        check_sub_brain_alignment(schematics),
    ]
    failed = [c for c in checks if not c.get("ok")]
    return {
        "timestamp": utc_now(),
        "scope": "kopano_main_brain_end_to_end",
        "sub_brain_root": str(SUB_BRAIN_ROOT),
        "main_brain_root": str(schematics.parent),
        "schematics_path": str(schematics),
        "summary": {
            "sections_checked": len(sections),
            "total_md_files": sum(s["md_file_count"] for s in sections),
            "checks": len(checks),
            "failures": len(failed),
            "ok": not failed,
        },
        "sections": sections,
        "checks": checks,
    }


def append_report(report: dict[str, Any]) -> None:
    STRUCTURE_DIR.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(report, sort_keys=True) + "\n")


def load_kc_module(kc_impl: Path):
    module_path = kc_impl / "src" / "kc_mcp.py"
    spec = importlib.util.spec_from_file_location("kc_mcp", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load KC module from {module_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def teacher_review_lines(failed_checks: list[dict[str, Any]]) -> list[str]:
    if not failed_checks:
        return ["Save — bounded file evidence; no external claim beyond repo."]
    return [
        f"Watch — {check['name']}: {check['retry']} Actual: {check['actual']}"
        for check in failed_checks
    ]


def seed_kc(report: dict[str, Any], kc_impl: Path, kc_store: Path) -> str:
    module = load_kc_module(kc_impl)
    store = module.KcStore(kc_store)
    failed = [c for c in report["checks"] if not c.get("ok")]
    review_lines = teacher_review_lines(failed)
    record = store.create({
        "title": f"KC Main Brain end-to-end scan - {report['timestamp']}",
        "teacher_context": (
            "KC reads Schematics/ end-to-end and confirms sub-brain (Starfall Salvage) "
            "and main brain (Schematics) agree on doctrine, comms-log entries, and the "
            "Starfall production URL. KC does not chat; its opinion is the teacher_review "
            "ledger field, written as Save or Watch with bounded proof."
        ),
        "student_response": json.dumps(report["summary"], sort_keys=True),
    })
    store.update({
        "id": record.id,
        "teacher_review": "\n".join(review_lines),
        "status": "reviewed",
    })
    return record.id


def main() -> int:
    parser = argparse.ArgumentParser(description="KC end-to-end Main Brain scanner")
    parser.add_argument("--once", action="store_true", help="single scan and exit (default)")
    parser.add_argument("--seed-kc", action="store_true", help="seed result to KC context store")
    parser.add_argument("--schematics", type=Path, default=DEFAULT_SCHEMATICS)
    parser.add_argument("--kc-impl", type=Path, default=DEFAULT_KC_IMPL)
    parser.add_argument(
        "--kc-store",
        type=Path,
        default=Path(os.environ.get("KC_CONTEXT_STORE", DEFAULT_KC_STORE)),
    )
    args = parser.parse_args()

    report = build_report(args.schematics, args.kc_store)
    if args.seed_kc:
        try:
            report["kc_context_id"] = seed_kc(report, args.kc_impl, args.kc_store)
        except Exception as error:  # noqa: BLE001 watchdog log path
            report["kc_seed_error"] = str(error)

    append_report(report)
    print(json.dumps(report["summary"], sort_keys=True), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
