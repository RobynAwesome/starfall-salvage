"""Static hot-path audit for updateGame + renderScene (C09 evidence)."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GAME_JS = ROOT / "src" / "game.js"


def extract_function_body(source: str, name: str) -> str:
    marker = f"function {name}("
    start = source.find(marker)
    if start < 0:
        return ""
    brace = source.find("{", start)
    if brace < 0:
        return ""
    depth = 0
    for i in range(brace, len(source)):
        ch = source[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return source[brace + 1 : i]
    return ""


def audit() -> dict[str, object]:
    text = GAME_JS.read_text(encoding="utf-8")
    proofs: dict[str, bool] = {}
    ug = extract_function_body(text, "updateGame")
    rs = extract_function_body(text, "renderScene")
    proofs["update_game_present"] = bool(ug)
    proofs["render_scene_present"] = bool(rs)
    proofs["no_new_in_update_game"] = "new " not in ug
    proofs["no_new_in_render_scene"] = "new " not in rs
    proofs["make_model_reuses_matrix"] = "Mat4.identity(modelMatrix)" in text
    proofs["particle_caps"] = "sparksMax" in text and "trailMax" in text
    proofs["no_three_dependency"] = "THREE." not in text
    passed = sum(1 for v in proofs.values() if v)
    total = len(proofs)
    pct = round(100 * passed / total) if total else 0
    return {"ok": pct == 100, "proofs": proofs, "score_pct": pct}


def main() -> int:
    report = audit()
    print(report)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
