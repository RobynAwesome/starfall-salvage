"""Bounded KPGS progressive-update adapter for Starfall Salvage projections.

This module adapts the canonical Introduction-to-MCP stage law to the
Starfall KC sync gateway. It does not define canonical authority and it never
mutates kopano_vault. The receiving SQLite database is a non-authoritative
projection sink only.
"""

from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from dataclasses import dataclass
from typing import Any

KPGS_PROGRESSIVE_UPDATE_SOURCE = {
    "repository": "RobynAwesome/Introduction-to-MCP",
    "commit": "70f40324978ee8c3c1a8a77a29e6ac84c7f6bf3a",
    "contract": "kpgs.progressive-update.v1",
    "chain": "APU -> Progressive Update -> #NB -> bounded CRUD -> SWFUS",
}

STAGE_ORDER = (
    "telemetry",
    "classification",
    "routing",
    "protocolSelection",
    "invariantAudit",
    "pocFocCheck",
    "stateUpdate",
    "distribution",
)

ADMITTED_STATE_CLASSES = {"derived_projection", "non_authoritative"}
ADMITTED_APU = {"GREEN", "YELLOW", "RED", "UNSPECIFIED"}


def _stage(status: str, detail: str) -> dict[str, str]:
    return {"status": status, "detail": detail}


def _empty_receipt(update_id: str | None) -> dict[str, Any]:
    return {
        "schema": "starfall.kpgs.projection-receipt.v1",
        "updateId": update_id,
        "canonicalSource": deepcopy(KPGS_PROGRESSIVE_UPDATE_SOURCE),
        "canonical": False,
        "authorityEffect": "none",
        "transportGrantsAuthority": False,
        "outcome": "READY",
        "code": "KPGS_PREFLIGHT",
        "stages": {
            "telemetry": _stage("NOT_REACHED", "No governed batch admitted yet."),
            "classification": _stage("NOT_REACHED", "Classification not reached."),
            "routing": _stage("NOT_REACHED", "Routing not reached."),
            "protocolSelection": _stage("NOT_REACHED", "Protocol selection not reached."),
            "invariantAudit": _stage("NOT_REACHED", "Invariant audit not reached."),
            "pocFocCheck": _stage("NOT_REACHED", "POC/FOC check not reached."),
            "stateUpdate": _stage("NOT_REACHED", "Projection update not reached."),
            "distribution": _stage("NOT_REACHED", "Receiving sink commit not reached."),
        },
        "evidenceRefs": [],
        "payloadDigest": None,
        "receiptId": None,
        "replay": False,
    }


def _receipt_id(update_id: str, payload_digest: str) -> str:
    digest = hashlib.sha256(
        f"starfall-kpgs:{update_id}:{payload_digest}".encode("utf-8")
    ).hexdigest()
    return f"starfall_swfus_{digest[:24]}"


@dataclass(frozen=True)
class Preflight:
    admitted: bool
    http_status: int
    receipt: dict[str, Any]


def _stop(
    receipt: dict[str, Any],
    stage_name: str,
    status: str,
    code: str,
    detail: str,
    http_status: int,
) -> Preflight:
    receipt["stages"][stage_name] = _stage(status, detail)
    receipt["outcome"] = status
    receipt["code"] = code
    return Preflight(False, http_status, receipt)


def canonical_payload_digest(payload: Any) -> str:
    """Full server-computed SHA-256 over the bounded projection payload."""
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def preflight_projection(
    envelope: Any,
    *,
    idempotency_key: str | None,
    projection_payload: Any,
    record_count: int,
) -> Preflight:
    """Run a governed batch through the canonical pre-mutation stage order.

    Client-supplied evidence references are intentionally not trusted. The proof
    evidence emitted here is recomputed by this receiving server from the actual
    projection payload and transport identity.
    """
    if not isinstance(envelope, dict):
        return _stop(
            _empty_receipt(None),
            "telemetry",
            "REJECT",
            "INVALID_KPGS_ENVELOPE",
            "kpgs must be a JSON object once the governed lane is selected.",
            400,
        )

    raw_update_id = envelope.get("update_id")
    update_id = raw_update_id.strip() if isinstance(raw_update_id, str) else ""
    receipt = _empty_receipt(update_id or None)

    if not update_id or len(update_id) > 200:
        return _stop(
            receipt,
            "telemetry",
            "REJECT",
            "INVALID_UPDATE_ID",
            "Governed batches require a stable update_id of 1-200 characters.",
            400,
        )
    if not isinstance(idempotency_key, str) or not idempotency_key.strip():
        return _stop(
            receipt,
            "telemetry",
            "REJECT",
            "IDEMPOTENCY_KEY_REQUIRED",
            "Governed batches require X-Idempotency-Key before projection.",
            400,
        )

    payload_digest = canonical_payload_digest(projection_payload)
    receipt["payloadDigest"] = payload_digest
    receipt["receiptId"] = _receipt_id(update_id, payload_digest)
    receipt["stages"]["telemetry"] = _stage(
        "PASS", "Stable update identity, batch idempotency identity and payload digest admitted."
    )

    state_class = envelope.get("state_class")
    apu_state = envelope.get("apu_state")
    if state_class not in ADMITTED_STATE_CLASSES:
        return _stop(
            receipt,
            "classification",
            "REJECT",
            "INVALID_STATE_CLASS",
            "Starfall sync admits only derived_projection or non_authoritative state.",
            403,
        )
    if apu_state not in ADMITTED_APU:
        return _stop(
            receipt,
            "classification",
            "REJECT",
            "INVALID_APU_STATE",
            "apu_state must be GREEN, YELLOW, RED or UNSPECIFIED.",
            400,
        )
    receipt["stages"]["classification"] = _stage(
        "PASS", f"Projection state class admitted; APU={apu_state}."
    )

    # This adapter is mounted only on the Starfall KC sync receiving projection.
    receipt["stages"]["routing"] = _stage(
        "PASS", "Routed to Starfall KC sync scores/chat non-authoritative projection sink."
    )

    if (
        envelope.get("protocol") != KPGS_PROGRESSIVE_UPDATE_SOURCE["contract"]
        or envelope.get("canonical_source_sha")
        != KPGS_PROGRESSIVE_UPDATE_SOURCE["commit"]
    ):
        return _stop(
            receipt,
            "protocolSelection",
            "REJECT",
            "CANONICAL_PROTOCOL_MISMATCH",
            "Canonical protocol or pinned Introduction-to-MCP source SHA does not match.",
            409,
        )
    receipt["stages"]["protocolSelection"] = _stage(
        "PASS", "Pinned canonical progressive-update contract selected."
    )

    if envelope.get("crud_intent") != "CREATE":
        return _stop(
            receipt,
            "invariantAudit",
            "REJECT",
            "CRUD_SCOPE_MISMATCH",
            "The first Starfall projection pilot is bounded to CREATE.",
            400,
        )
    if envelope.get("boundary_marker") != "#NB":
        return _stop(
            receipt,
            "invariantAudit",
            "HOLD",
            "NB_BOUNDARY_REQUIRED",
            "The literal #NB boundary_marker is required before projection mutation.",
            422,
        )
    if envelope.get("authority_effect") != "none":
        return _stop(
            receipt,
            "invariantAudit",
            "REJECT",
            "AUTHORITY_EFFECT_FORBIDDEN",
            "The receiving projection cannot widen authority.",
            403,
        )
    receipt["stages"]["invariantAudit"] = _stage(
        "PASS", "CREATE is bounded, #NB is literal and authority remains none."
    )

    if apu_state == "RED" or envelope.get("foc_asserted") is True:
        return _stop(
            receipt,
            "pocFocCheck",
            "REJECT",
            "FOC_OR_APU_RED",
            "FOC or APU RED cannot cross the projection mutation membrane.",
            403,
        )
    if apu_state in {"YELLOW", "UNSPECIFIED"}:
        return _stop(
            receipt,
            "pocFocCheck",
            "HOLD",
            "APU_NOT_GREEN",
            "Governed projection CREATE requires APU GREEN.",
            422,
        )
    if record_count <= 0:
        return _stop(
            receipt,
            "pocFocCheck",
            "HOLD",
            "NO_PROJECTION_EVIDENCE",
            "An empty batch cannot prove a projection mutation.",
            422,
        )

    # Evidence is generated from facts this server can verify. Client-provided
    # poc_evidence_refs, if present, never replace these checks.
    receipt["evidenceRefs"] = [
        f"sha256:{payload_digest}",
        f"idempotency:{idempotency_key.strip()}",
        "projection://starfall/sqlite/scores-chat",
    ]
    receipt["stages"]["pocFocCheck"] = _stage(
        "PASS",
        "Server recomputed projection digest, transport idempotency and non-empty bounded records; FOC absent.",
    )
    receipt["stages"]["stateUpdate"] = _stage(
        "READY", "Bounded SQLite projection transaction is admitted."
    )
    receipt["outcome"] = "READY"
    receipt["code"] = "PROJECTION_READY"
    return Preflight(True, 200, receipt)


def mark_projection_applied(
    receipt: dict[str, Any], *, accepted: int, duplicates: int
) -> dict[str, Any]:
    applied = deepcopy(receipt)
    applied["outcome"] = "APPLIED"
    applied["code"] = "PROJECTION_COMMITTED"
    applied["stages"]["stateUpdate"] = _stage(
        "PASS",
        f"SQLite projection transaction committed: accepted={accepted}, duplicates={duplicates}.",
    )
    applied["stages"]["distribution"] = _stage(
        "PASS",
        "Receiving projection sink committed without changing kopano_vault authority.",
    )
    return applied


def mark_projection_hold(receipt: dict[str, Any], detail: str) -> dict[str, Any]:
    held = deepcopy(receipt)
    held["outcome"] = "HOLD"
    held["code"] = "PROJECTION_ROLLED_BACK"
    held["stages"]["stateUpdate"] = _stage("HOLD", detail)
    held["stages"]["distribution"] = _stage(
        "NOT_REACHED", "Projection transaction did not commit."
    )
    return held


def mark_replayed(receipt: dict[str, Any]) -> dict[str, Any]:
    replayed = deepcopy(receipt)
    replayed["replay"] = True
    replayed["code"] = "IDEMPOTENT_REPLAY"
    return replayed
