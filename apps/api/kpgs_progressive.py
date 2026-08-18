"""Canonical KPGS progressive-update adapter for Starfall's projection sink.

This module adapts, but does not redefine, the canonical contract pinned at:
RobynAwesome/Introduction-to-MCP@70f40324978ee8c3c1a8a77a29e6ac84c7f6bf3a

Starfall's kc_sync_api remains a non-authoritative projection/flush lane.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

CANONICAL_SOURCE = {
    "repository": "RobynAwesome/Introduction-to-MCP",
    "commit": "70f40324978ee8c3c1a8a77a29e6ac84c7f6bf3a",
    "contract": "kpgs.progressive-update.v1",
    "chain": "APU -> Progressive Update -> #NB -> bounded CRUD -> SWFUS",
}

STAGE_ORDER = (
    "telemetry",
    "classification",
    "routing",
    "protocol_selection",
    "invariant_audit",
    "poc_foc_check",
    "state_update",
    "distribution",
)

ADMITTED_STATE_CLASSES = {"derived_projection", "non_authoritative"}


class KpgsProgressiveEnvelope(BaseModel):
    """Opt-in governed envelope carried by a Starfall sync batch."""

    model_config = ConfigDict(extra="forbid")

    update_id: str = Field(min_length=1, max_length=200)
    domain: str
    lane: str
    protocol: str
    canonical_source_sha: str
    apu_state: Literal["GREEN", "YELLOW", "RED"]
    boundary_marker: str
    crud_intent: str
    state_class: str
    authority_effect: str
    foc_asserted: bool = False


def _stage(status: str, detail: str) -> dict[str, str]:
    return {"status": status, "detail": detail}


def new_receipt(update_id: str | None) -> dict[str, Any]:
    return {
        "schema": "starfall.kpgs.progressive-projection-sync.v1",
        "update_id": update_id,
        "canonical_source": dict(CANONICAL_SOURCE),
        "canonical": False,
        "authority_effect": "none",
        "transport_grants_authority": False,
        "outcome": "READY",
        "code": "KPGS_PREFLIGHT",
        "stages": {
            stage: _stage("NOT_REACHED", f"{stage.replace('_', ' ').title()} not reached.")
            for stage in STAGE_ORDER
        },
        "evidence_refs": [],
        "projection_counts": {"accepted": 0, "duplicates": 0, "errors": 0},
        "replay": False,
    }


def _stop(
    receipt: dict[str, Any],
    stage_name: str,
    outcome: Literal["HOLD", "REJECT"],
    code: str,
    detail: str,
    http_status: int,
) -> tuple[bool, int, dict[str, Any]]:
    receipt["stages"][stage_name] = _stage(outcome, detail)
    receipt["outcome"] = outcome
    receipt["code"] = code
    return False, http_status, receipt


def evaluate_projection_preflight(
    envelope: KpgsProgressiveEnvelope,
    *,
    batch_idempotency_key: str | None,
    record_ids: list[str],
    record_idempotency_keys: list[str],
) -> tuple[bool, int, dict[str, Any]]:
    """Evaluate all canonical gates that must pass before SQLite projection writes.

    Client-supplied proof is intentionally absent from the envelope. The POC gate
    is based only on facts the receiving runtime can verify itself: a Pydantic-
    validated batch, header/update identity binding, bounded record identity and
    per-record idempotency keys.
    """

    receipt = new_receipt(envelope.update_id)

    if not batch_idempotency_key:
        return _stop(
            receipt,
            "telemetry",
            "HOLD",
            "IDEMPOTENCY_KEY_REQUIRED",
            "Governed projection requires X-Idempotency-Key before mutation.",
            422,
        )
    if batch_idempotency_key != envelope.update_id:
        return _stop(
            receipt,
            "telemetry",
            "REJECT",
            "UPDATE_ID_MISMATCH",
            "X-Idempotency-Key must equal kpgs.update_id for governed projection replay safety.",
            409,
        )
    receipt["stages"]["telemetry"] = _stage(
        "PASS", "Stable governed batch identity is bound to the idempotency header."
    )

    if envelope.state_class == "constitutional_truth":
        return _stop(
            receipt,
            "classification",
            "REJECT",
            "AUTHORITATIVE_STATE_FORBIDDEN",
            "Starfall's flush lane cannot project constitutional truth.",
            403,
        )
    if envelope.state_class not in ADMITTED_STATE_CLASSES:
        return _stop(
            receipt,
            "classification",
            "REJECT",
            "INVALID_STATE_CLASS",
            "state_class must be derived_projection or non_authoritative.",
            400,
        )
    if envelope.authority_effect != "none":
        return _stop(
            receipt,
            "classification",
            "REJECT",
            "AUTHORITY_EFFECT_FORBIDDEN",
            "Projection transport cannot grant KC authority.",
            403,
        )
    receipt["stages"]["classification"] = _stage(
        "PASS", f"Admitted non-authoritative state class: {envelope.state_class}."
    )

    if (
        envelope.domain != "starfallsalvage.kopanolabs.com"
        or envelope.lane != "kc-sync"
    ):
        return _stop(
            receipt,
            "routing",
            "REJECT",
            "ROUTING_SCOPE_MISMATCH",
            "Governed projection is scoped to starfallsalvage.kopanolabs.com / kc-sync.",
            403,
        )
    receipt["stages"]["routing"] = _stage(
        "PASS", "Routed to Starfall's bounded KC sync projection lane."
    )

    if (
        envelope.protocol != CANONICAL_SOURCE["contract"]
        or envelope.canonical_source_sha != CANONICAL_SOURCE["commit"]
    ):
        return _stop(
            receipt,
            "protocol_selection",
            "REJECT",
            "CANONICAL_PROTOCOL_MISMATCH",
            "Protocol or pinned Introduction-to-MCP source SHA does not match the canonical adapter contract.",
            409,
        )
    receipt["stages"]["protocol_selection"] = _stage(
        "PASS", "Pinned canonical kpgs.progressive-update.v1 selected."
    )

    if envelope.crud_intent != "CREATE":
        return _stop(
            receipt,
            "invariant_audit",
            "REJECT",
            "CRUD_SCOPE_MISMATCH",
            "Initial Starfall projection adapter is bounded to CREATE only.",
            400,
        )
    if envelope.boundary_marker != "#NB":
        return _stop(
            receipt,
            "invariant_audit",
            "HOLD",
            "NB_BOUNDARY_REQUIRED",
            "The literal #NB boundary marker is required before projection mutation.",
            422,
        )
    if envelope.apu_state == "RED":
        return _stop(
            receipt,
            "invariant_audit",
            "REJECT",
            "APU_RED",
            "APU RED rejects projection mutation before state update.",
            403,
        )
    if envelope.apu_state != "GREEN":
        return _stop(
            receipt,
            "invariant_audit",
            "HOLD",
            "APU_NOT_GREEN",
            "Projection mutation requires APU GREEN; YELLOW remains HOLD.",
            422,
        )
    receipt["stages"]["invariant_audit"] = _stage(
        "PASS", "Literal #NB present; CREATE bounded; APU GREEN; authority remains none."
    )

    if envelope.foc_asserted:
        return _stop(
            receipt,
            "poc_foc_check",
            "REJECT",
            "FOC_ASSERTED",
            "Explicit FOC cannot cross the projection mutation membrane.",
            403,
        )
    if not record_ids:
        return _stop(
            receipt,
            "poc_foc_check",
            "HOLD",
            "EMPTY_PROJECTION_BATCH",
            "Governed projection requires at least one score or chat record.",
            422,
        )
    if any(not value.strip() for value in record_ids):
        return _stop(
            receipt,
            "poc_foc_check",
            "REJECT",
            "INVALID_RECORD_ID",
            "Every projected record requires a non-empty stable record id.",
            400,
        )
    if len(record_ids) != len(set(record_ids)):
        return _stop(
            receipt,
            "poc_foc_check",
            "HOLD",
            "DUPLICATE_RECORD_IDS_IN_BATCH",
            "A governed batch cannot contain the same projection record id twice.",
            422,
        )
    if (
        len(record_idempotency_keys) != len(record_ids)
        or any(not value.strip() for value in record_idempotency_keys)
    ):
        return _stop(
            receipt,
            "poc_foc_check",
            "HOLD",
            "RECORD_IDEMPOTENCY_REQUIRED",
            "Every governed projection record requires its existing non-empty idempotency key.",
            422,
        )

    receipt["evidence_refs"] = [
        "runtime://pydantic/sync-batch-validated",
        "runtime://starfall/batch-idempotency/header-update-bound",
        "runtime://starfall/projection-record-identities/validated",
    ]
    receipt["stages"]["poc_foc_check"] = _stage(
        "PASS",
        "Receiving runtime validated bounded record identities and idempotency structure; no client POC assertion was trusted.",
    )
    receipt["stages"]["state_update"] = _stage(
        "READY", "Bounded SQLite projection CREATE is admitted to persistence."
    )
    receipt["outcome"] = "READY"
    receipt["code"] = "PROJECTION_READY"
    return True, 200, receipt


def mark_projection_applied(
    receipt: dict[str, Any],
    *,
    accepted: int,
    duplicates: int,
    errors: list[str],
) -> dict[str, Any]:
    result = deepcopy(receipt)
    result["projection_counts"] = {
        "accepted": accepted,
        "duplicates": duplicates,
        "errors": len(errors),
    }
    result["stages"]["state_update"] = _stage(
        "PASS",
        f"SQLite projection transaction completed: accepted={accepted}, duplicates={duplicates}, errors={len(errors)}.",
    )

    if errors:
        result["outcome"] = "PARTIAL"
        result["code"] = "PROJECTION_PARTIAL"
        result["stages"]["distribution"] = _stage(
            "HOLD",
            "Projection sink committed only the accepted subset; batch distribution remains incomplete.",
        )
    else:
        result["outcome"] = "APPLIED"
        result["code"] = "PROJECTION_APPLIED"
        result["stages"]["distribution"] = _stage(
            "PASS",
            "Receiving Starfall projection sink committed the bounded batch; transport remains non-authoritative and does not mutate kopano_vault truth.",
        )
    return result


def mark_replay(receipt: dict[str, Any]) -> dict[str, Any]:
    result = deepcopy(receipt)
    result["replay"] = True
    result["code"] = "IDEMPOTENT_REPLAY"
    result["evidence_refs"] = [
        "runtime://starfall/batch-idempotency/exact-payload-match",
        "sqlite://idempotency_keys/cached-response",
    ]
    return result
