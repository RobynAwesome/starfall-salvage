"""
kc_sync_api.py — KC API Gateway
Endpoint: POST /api/v1/sync

Receives batches from kopano_vault sync_queue.
Deduplicates via X-Idempotency-Key header.
Commandment 9 (Offline-First): queue-draining, not real-time dependency.
Commandment 3  (Grounded Truth): every accepted record is projection evidence only.
Pillar 2       (Community): Cape Town AER — this endpoint must survive intermittent calls.

Run locally:
    uvicorn apps.api.kc_sync_api:app --reload --port 8766

Sub-protocol 8.2 (API Transport Boundary):
    This gateway is an incubation adapter, not KC authority.
    kopano_vault is the sovereign truth store. This endpoint is a flush lane only.

Canonical governed lane:
    Introduction-to-MCP@70f40324978ee8c3c1a8a77a29e6ac84c7f6bf3a
    APU -> Progressive Update -> #NB -> bounded CRUD -> SWFUS

The governed lane projects already-saved vault records into SQLite. It can never
promote SQLite, transport or a receipt into kopano_vault/constitutional truth.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# ─── Canonical KPGS progressive-update contract ──────────────────────────────

KPGS_CANONICAL_REPOSITORY = "RobynAwesome/Introduction-to-MCP"
KPGS_CANONICAL_COMMIT = "70f40324978ee8c3c1a8a77a29e6ac84c7f6bf3a"
KPGS_PROGRESSIVE_SCHEMA = "kpgs.progressive-update.v1"
KPGS_SWFUS_RECEIPT_SCHEMA = "kpgs.swfus.receipt.v1"
KPGS_BOUNDARY_MARKER = "#NB"
KPGS_STAGE_ORDER = (
    "TELEMETRY",
    "CLASSIFICATION",
    "ROUTING",
    "PROTOCOL_SELECTION",
    "INVARIANT_AUDIT",
    "POC_FOC_CHECK",
    "STATE_UPDATE",
    "DISTRIBUTION",
)
KPGS_PROJECTION_STATE_CLASSES = {"derived_projection", "non_authoritative"}

# ─── Config ──────────────────────────────────────────────────────────────────

DB_PATH: Path = Path(os.getenv("KC_SYNC_DB", ".data/kc_sync.db"))
RATE_LIMIT_WINDOW: int = 60          # seconds
RATE_LIMIT_MAX:    int = 120         # requests per window per origin
IDEMPOTENCY_TTL:   int = 7 * 24 * 3600  # 7 days — matches sync_queue.purge()

# ─── FastAPI app ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="KC Sync Gateway",
    description="Starfall Salvage — kopano_vault offline sync endpoint",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://starfallsalvage.kopanolabs.com",
        "http://127.0.0.1:8765",
        "http://localhost:8100",   # Ionic dev server
        "http://localhost:3000",   # Next.js dev
    ],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "X-Idempotency-Key", "X-Pilot-Id"],
)

# ─── Database ─────────────────────────────────────────────────────────────────

@contextmanager
def get_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Create tables on first boot."""
    with get_db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS idempotency_keys (
            key          TEXT PRIMARY KEY,
            payload_hash TEXT NOT NULL,
            status       TEXT NOT NULL DEFAULT 'accepted',
            created_at   REAL NOT NULL,
            response     TEXT
        );

        CREATE TABLE IF NOT EXISTS synced_scores (
            id              TEXT PRIMARY KEY,
            pilot_id        TEXT,
            callsign        TEXT,
            score           INTEGER NOT NULL DEFAULT 0,
            cores           INTEGER NOT NULL DEFAULT 0,
            time_alive      REAL    NOT NULL DEFAULT 0,
            wave            INTEGER NOT NULL DEFAULT 1,
            mode            TEXT    NOT NULL DEFAULT 'desktop',
            saved_at        TEXT    NOT NULL,
            idempotency_key TEXT    NOT NULL,
            synced_at       REAL    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS synced_chat (
            id              TEXT PRIMARY KEY,
            callsign        TEXT NOT NULL,
            pilot_id        TEXT,
            message         TEXT NOT NULL,
            ts              TEXT NOT NULL,
            idempotency_key TEXT NOT NULL,
            synced_at       REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS governed_sync_receipts (
            update_id            TEXT PRIMARY KEY,
            payload_hash         TEXT NOT NULL,
            canonical_source_sha TEXT NOT NULL,
            response             TEXT NOT NULL,
            created_at           REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rate_limit_log (
            origin       TEXT NOT NULL,
            window_start REAL NOT NULL,
            count        INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (origin, window_start)
        );
        """)


# ─── Rate limiting ────────────────────────────────────────────────────────────

def check_rate_limit(origin: str) -> None:
    """Raises 429 if origin exceeds RATE_LIMIT_MAX requests per window."""
    window = int(time.time() // RATE_LIMIT_WINDOW) * RATE_LIMIT_WINDOW
    with get_db() as conn:
        row = conn.execute(
            "SELECT count FROM rate_limit_log WHERE origin=? AND window_start=?",
            (origin, window),
        ).fetchone()
        count = (row["count"] if row else 0) + 1
        conn.execute(
            """INSERT INTO rate_limit_log (origin, window_start, count)
               VALUES (?,?,?)
               ON CONFLICT(origin, window_start) DO UPDATE SET count=excluded.count""",
            (origin, window, count),
        )
    if count > RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Slow down, pilot — sync rate limit reached.",
        )


# ─── Hash / idempotency helpers ───────────────────────────────────────────────

def canonical_json(data: Any) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), default=str)


def full_payload_hash(data: Any) -> str:
    return hashlib.sha256(canonical_json(data).encode()).hexdigest()


def payload_hash(data: Any) -> str:
    """Legacy 16-character digest retained for the existing header-idempotency table."""
    return full_payload_hash(data)[:16]


def check_idempotency(key: str, data: Any) -> tuple[bool, str | None]:
    """
    Returns (is_duplicate, cached_response_json).
    If duplicate with same payload → (True, cached_response).
    If key not seen        → (False, None).
    If key seen but hash mismatch → raises 422.
    """
    h = payload_hash(data)
    cutoff = time.time() - IDEMPOTENCY_TTL
    with get_db() as conn:
        conn.execute("DELETE FROM idempotency_keys WHERE created_at < ?", (cutoff,))
        row = conn.execute(
            "SELECT payload_hash, response FROM idempotency_keys WHERE key=?",
            (key,),
        ).fetchone()

    if row is None:
        return False, None
    if row["payload_hash"] != h:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Idempotency key reused with a different payload.",
        )
    return True, row["response"]


def record_idempotency(key: str, data: Any, response_json: str) -> None:
    """Legacy idempotency recording path. Governed writes record atomically in their transaction."""
    with get_db() as conn:
        conn.execute(
            """INSERT OR IGNORE INTO idempotency_keys
               (key, payload_hash, status, created_at, response)
               VALUES (?,?,?,?,?)""",
            (key, payload_hash(data), "accepted", time.time(), response_json),
        )


# ─── Payload / receipt models ─────────────────────────────────────────────────

class KpgsProgressiveEnvelope(BaseModel):
    update_id            : str = ""
    protocol             : str = ""
    canonical_source_sha : str = ""
    apu_state            : str = "UNSPECIFIED"
    boundary_marker      : str = ""
    crud_intent          : str = ""
    state_class          : str = ""
    authority_effect     : str = ""
    foc_asserted         : bool = False
    correlation_id       : str | None = None


class ScorePayload(BaseModel):
    id              : str
    pilot_id        : str | None = None
    callsign        : str        = "Unknown"
    score           : int        = 0
    cores           : int        = 0
    time_alive      : float      = 0.0
    wave            : int        = 1
    mode            : str        = "desktop"
    saved_at        : str
    idempotency_key : str


class ChatPayload(BaseModel):
    id              : str
    callsign        : str
    pilot_id        : str | None = None
    message         : str
    ts              : str
    idempotency_key : str


class SyncBatch(BaseModel):
    """Batch payload from kopano_vault sync_queue."""
    scores   : list[ScorePayload] = Field(default_factory=list)
    chat     : list[ChatPayload] = Field(default_factory=list)
    pilot_id : str | None = None
    client_ts: str | None = None
    kpgs     : KpgsProgressiveEnvelope | None = None


class KpgsStageReceipt(BaseModel):
    stage  : str
    status : str
    reason : str


class KpgsSwfusReceipt(BaseModel):
    schema                      : Literal["kpgs.swfus.receipt.v1"] = KPGS_SWFUS_RECEIPT_SCHEMA
    receipt_id                  : str
    update_id                   : str
    node_id                     : str
    operation                   : Literal["CREATE"] = "CREATE"
    disposition                 : Literal["APPLIED", "HELD", "REJECTED"]
    stages                      : list[KpgsStageReceipt]
    synchronized                : bool
    canonical_authority_changed : Literal[False] = False
    state_digest                : str | None = None
    evidence_refs               : list[str] = Field(default_factory=list)
    correlation_id              : str = ""
    boundary_marker             : str
    replayed                    : bool = False
    created_at                  : str


class SyncResult(BaseModel):
    accepted    : int = 0
    duplicates  : int = 0
    errors      : list[str] = Field(default_factory=list)
    kpgs_receipt: KpgsSwfusReceipt | None = None


class ProgressivePreflight(BaseModel):
    governed : bool
    admitted : bool = False
    http_status: int = 200
    receipt  : KpgsSwfusReceipt | None = None


# ─── KPGS progressive-update membrane ────────────────────────────────────────

def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def receipt_id(update_id: str, disposition: str, digest: str | None = None) -> str:
    seed = f"starfall-kc-sync:{update_id}:{disposition}:{digest or 'none'}"
    return "swfus_" + hashlib.sha256(seed.encode()).hexdigest()[:24]


def fresh_receipt(envelope: KpgsProgressiveEnvelope) -> KpgsSwfusReceipt:
    update_id = envelope.update_id.strip()
    return KpgsSwfusReceipt(
        receipt_id=receipt_id(update_id or "missing", "HELD"),
        update_id=update_id,
        node_id=f"starfall:kc-sync:{update_id or 'missing'}",
        disposition="HELD",
        stages=[
            KpgsStageReceipt(
                stage=stage_name,
                status="NOT_REACHED",
                reason="prior governance gate stopped progression",
            )
            for stage_name in KPGS_STAGE_ORDER
        ],
        synchronized=False,
        canonical_authority_changed=False,
        evidence_refs=[],
        correlation_id=(envelope.correlation_id or "").strip(),
        boundary_marker=envelope.boundary_marker,
        replayed=False,
        created_at=now_iso(),
    )


def set_stage(receipt: KpgsSwfusReceipt, stage_name: str, stage_status: str, reason: str) -> None:
    for stage_receipt in receipt.stages:
        if stage_receipt.stage == stage_name:
            stage_receipt.status = stage_status
            stage_receipt.reason = reason
            return
    raise ValueError(f"unknown KPGS stage: {stage_name}")


def stop_preflight(
    receipt: KpgsSwfusReceipt,
    stage_name: str,
    disposition: Literal["HELD", "REJECTED"],
    stage_status: Literal["HOLD", "REJECT"],
    reason: str,
    http_status: int,
) -> ProgressivePreflight:
    set_stage(receipt, stage_name, stage_status, reason)
    receipt.disposition = disposition
    receipt.synchronized = False
    receipt.receipt_id = receipt_id(receipt.update_id or "missing", disposition)
    return ProgressivePreflight(
        governed=True,
        admitted=False,
        http_status=http_status,
        receipt=receipt,
    )


def _ids_are_unique(values: list[str]) -> bool:
    return len(values) == len(set(values))


def _pilot_consistent(batch: SyncBatch, x_pilot_id: str | None) -> bool:
    expected = (x_pilot_id or batch.pilot_id or "").strip()
    if not expected:
        return True
    if batch.pilot_id and batch.pilot_id != expected:
        return False
    for score in batch.scores:
        if score.pilot_id and score.pilot_id != expected:
            return False
    for message in batch.chat:
        if message.pilot_id and message.pilot_id != expected:
            return False
    return True


def preflight_progressive_update(
    batch: SyncBatch,
    x_idempotency_key: str | None,
    x_pilot_id: str | None,
) -> ProgressivePreflight:
    """
    Apply the canonical eight-stage membrane before any score/chat projection write.

    Client self-assertion is not accepted as POC. The server derives evidence from
    the transport identity, validated Pydantic records, deterministic payload hash,
    target IDs and pilot consistency.
    """
    envelope = batch.kpgs
    if envelope is None:
        return ProgressivePreflight(governed=False)

    receipt = fresh_receipt(envelope)
    update_id = envelope.update_id.strip()

    # 1. TELEMETRY
    if not update_id or len(update_id) > 200:
        return stop_preflight(
            receipt,
            "TELEMETRY",
            "REJECTED",
            "REJECT",
            "governed sync requires a stable update_id of 1-200 characters",
            status.HTTP_400_BAD_REQUEST,
        )
    set_stage(receipt, "TELEMETRY", "PASS", "stable governed update identity admitted")

    # 2. CLASSIFICATION
    state_class = envelope.state_class.strip()
    authority_effect = envelope.authority_effect.strip()
    apu_state = envelope.apu_state.strip().upper() or "UNSPECIFIED"
    if state_class not in KPGS_PROJECTION_STATE_CLASSES:
        return stop_preflight(
            receipt,
            "CLASSIFICATION",
            "REJECTED",
            "REJECT",
            "KC sync admits only derived_projection or non_authoritative state",
            status.HTTP_403_FORBIDDEN,
        )
    if authority_effect != "none":
        return stop_preflight(
            receipt,
            "CLASSIFICATION",
            "REJECTED",
            "REJECT",
            "projection transport cannot grant authority",
            status.HTTP_403_FORBIDDEN,
        )
    if apu_state not in {"GREEN", "YELLOW", "RED", "UNSPECIFIED"}:
        return stop_preflight(
            receipt,
            "CLASSIFICATION",
            "REJECTED",
            "REJECT",
            "apu_state must be GREEN, YELLOW, RED or UNSPECIFIED",
            status.HTTP_400_BAD_REQUEST,
        )
    set_stage(receipt, "CLASSIFICATION", "PASS", f"projection state admitted; APU={apu_state}")

    # 3. ROUTING
    record_count = len(batch.scores) + len(batch.chat)
    if record_count == 0:
        return stop_preflight(
            receipt,
            "ROUTING",
            "HELD",
            "HOLD",
            "governed projection batch contains no score/chat targets",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    set_stage(receipt, "ROUTING", "PASS", f"/api/v1/sync -> SQLite score/chat projection ({record_count} targets)")

    # 4. PROTOCOL_SELECTION
    if (
        envelope.protocol != KPGS_PROGRESSIVE_SCHEMA
        or envelope.canonical_source_sha != KPGS_CANONICAL_COMMIT
    ):
        return stop_preflight(
            receipt,
            "PROTOCOL_SELECTION",
            "REJECTED",
            "REJECT",
            "canonical progressive-update protocol/source SHA mismatch",
            status.HTTP_409_CONFLICT,
        )
    set_stage(
        receipt,
        "PROTOCOL_SELECTION",
        "PASS",
        f"{KPGS_PROGRESSIVE_SCHEMA} pinned to {KPGS_CANONICAL_COMMIT}",
    )

    # 5. INVARIANT_AUDIT
    if envelope.crud_intent != "CREATE":
        return stop_preflight(
            receipt,
            "INVARIANT_AUDIT",
            "REJECTED",
            "REJECT",
            "first KC projection pilot is bounded to CRUD CREATE",
            status.HTTP_400_BAD_REQUEST,
        )
    if envelope.boundary_marker != KPGS_BOUNDARY_MARKER:
        return stop_preflight(
            receipt,
            "INVARIANT_AUDIT",
            "HELD",
            "HOLD",
            "literal #NB boundary marker is required before projection mutation",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    if apu_state == "RED":
        return stop_preflight(
            receipt,
            "INVARIANT_AUDIT",
            "REJECTED",
            "REJECT",
            "APU RED rejects projection mutation",
            status.HTTP_403_FORBIDDEN,
        )
    if apu_state != "GREEN":
        return stop_preflight(
            receipt,
            "INVARIANT_AUDIT",
            "HELD",
            "HOLD",
            "mutating projection requires APU GREEN; YELLOW/UNSPECIFIED remain HOLD",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    set_stage(
        receipt,
        "INVARIANT_AUDIT",
        "PASS",
        "literal #NB present; CREATE bounded; APU GREEN; authority remains none",
    )

    # 6. POC_FOC_CHECK
    if envelope.foc_asserted:
        return stop_preflight(
            receipt,
            "POC_FOC_CHECK",
            "REJECTED",
            "REJECT",
            "explicit FOC cannot cross the KC projection membrane",
            status.HTTP_403_FORBIDDEN,
        )
    if not x_idempotency_key or not x_idempotency_key.strip():
        return stop_preflight(
            receipt,
            "POC_FOC_CHECK",
            "HELD",
            "HOLD",
            "governed mutation requires the existing X-Idempotency-Key transport evidence",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    score_ids = [score.id for score in batch.scores]
    chat_ids = [message.id for message in batch.chat]
    if not _ids_are_unique(score_ids) or not _ids_are_unique(chat_ids):
        return stop_preflight(
            receipt,
            "POC_FOC_CHECK",
            "HELD",
            "HOLD",
            "duplicate target IDs inside one governed CREATE batch are ambiguous",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    if any(not item.idempotency_key.strip() for item in [*batch.scores, *batch.chat]):
        return stop_preflight(
            receipt,
            "POC_FOC_CHECK",
            "HELD",
            "HOLD",
            "every projected record requires its existing vault idempotency key",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    if not _pilot_consistent(batch, x_pilot_id):
        return stop_preflight(
            receipt,
            "POC_FOC_CHECK",
            "REJECTED",
            "REJECT",
            "pilot identity is inconsistent across header, batch and projected records",
            status.HTTP_409_CONFLICT,
        )

    digest = full_payload_hash(batch.model_dump(mode="json"))
    receipt.evidence_refs = [
        "runtime://kc-sync/pydantic-record-validation",
        "runtime://kc-sync/x-idempotency-key/present",
        f"runtime://kc-sync/payload-sha256/{digest}",
        f"runtime://kc-sync/projection-targets/{record_count}/validated",
    ]
    set_stage(
        receipt,
        "POC_FOC_CHECK",
        "PASS",
        "server-derived transport, schema, payload and target evidence admitted; no FOC asserted",
    )
    return ProgressivePreflight(
        governed=True,
        admitted=True,
        http_status=status.HTTP_200_OK,
        receipt=receipt,
    )


def governed_payload_digest(batch: SyncBatch) -> str:
    return full_payload_hash(batch.model_dump(mode="json"))


def lookup_governed_replay(update_id: str, digest: str) -> dict[str, Any] | None:
    """Return the original governed response for an exact update replay; conflict on changed content."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT payload_hash, response FROM governed_sync_receipts WHERE update_id=?",
            (update_id,),
        ).fetchone()
    if row is None:
        return None
    if row["payload_hash"] != digest:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Governed update_id reused with different projection content.",
        )
    cached = json.loads(row["response"])
    receipt = cached.get("kpgs_receipt")
    if isinstance(receipt, dict):
        receipt["replayed"] = True
    return cached


def projection_conflicts(conn: sqlite3.Connection, batch: SyncBatch) -> list[str]:
    """Fresh governed CREATE cannot silently adopt rows previously projected by another update."""
    conflicts: list[str] = []
    for score in batch.scores:
        if conn.execute("SELECT 1 FROM synced_scores WHERE id=?", (score.id,)).fetchone():
            conflicts.append(f"score:{score.id}")
    for message in batch.chat:
        if conn.execute("SELECT 1 FROM synced_chat WHERE id=?", (message.id,)).fetchone():
            conflicts.append(f"chat:{message.id}")
    return conflicts


def finalize_applied_receipt(
    receipt: KpgsSwfusReceipt,
    batch: SyncBatch,
    result: SyncResult,
) -> KpgsSwfusReceipt:
    digest_payload = {
        "update_id": receipt.update_id,
        "scores": [score.id for score in batch.scores],
        "chat": [message.id for message in batch.chat],
        "accepted": result.accepted,
        "duplicates": result.duplicates,
    }
    state_digest = full_payload_hash(digest_payload)
    set_stage(
        receipt,
        "STATE_UPDATE",
        "PASS",
        f"bounded SQLite CREATE projected {result.accepted} records",
    )
    set_stage(
        receipt,
        "DISTRIBUTION",
        "PASS",
        "receiving SQLite projection transaction admitted; transport grants no authority",
    )
    receipt.disposition = "APPLIED"
    receipt.synchronized = True
    receipt.canonical_authority_changed = False
    receipt.state_digest = state_digest
    receipt.receipt_id = receipt_id(receipt.update_id, "APPLIED", state_digest)
    receipt.replayed = False
    receipt.created_at = now_iso()
    return receipt


def held_projection_receipt(receipt: KpgsSwfusReceipt, conflicts: list[str]) -> KpgsSwfusReceipt:
    set_stage(
        receipt,
        "STATE_UPDATE",
        "HOLD",
        "fresh governed CREATE targets already exist without this update receipt: " + ", ".join(conflicts[:8]),
    )
    receipt.disposition = "HELD"
    receipt.synchronized = False
    receipt.receipt_id = receipt_id(receipt.update_id, "HELD", full_payload_hash(conflicts))
    return receipt


# ─── Projection writers ───────────────────────────────────────────────────────

def apply_projection_rows(conn: sqlite3.Connection, batch: SyncBatch, strict: bool) -> SyncResult:
    result = SyncResult()

    for score in batch.scores:
        try:
            existing = conn.execute(
                "SELECT id FROM synced_scores WHERE id=?", (score.id,)
            ).fetchone()
            if existing:
                result.duplicates += 1
                continue
            conn.execute(
                """INSERT INTO synced_scores
                   (id, pilot_id, callsign, score, cores, time_alive, wave,
                    mode, saved_at, idempotency_key, synced_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    score.id,
                    score.pilot_id,
                    score.callsign,
                    score.score,
                    score.cores,
                    score.time_alive,
                    score.wave,
                    score.mode,
                    score.saved_at,
                    score.idempotency_key,
                    time.time(),
                ),
            )
            result.accepted += 1
        except Exception as exc:
            if strict:
                raise
            result.errors.append(f"score {score.id}: {exc}")

    for message in batch.chat:
        try:
            existing = conn.execute(
                "SELECT id FROM synced_chat WHERE id=?", (message.id,)
            ).fetchone()
            if existing:
                result.duplicates += 1
                continue
            conn.execute(
                """INSERT INTO synced_chat
                   (id, callsign, pilot_id, message, ts, idempotency_key, synced_at)
                   VALUES (?,?,?,?,?,?,?)""",
                (
                    message.id,
                    message.callsign,
                    message.pilot_id,
                    message.message,
                    message.ts,
                    message.idempotency_key,
                    time.time(),
                ),
            )
            result.accepted += 1
        except Exception as exc:
            if strict:
                raise
            result.errors.append(f"chat {message.id}: {exc}")

    return result


def execute_governed_projection(
    batch: SyncBatch,
    x_idempotency_key: str,
    preflight_receipt: KpgsSwfusReceipt,
) -> tuple[SyncResult, int]:
    """
    Execute a fresh governed CREATE atomically with its replay receipt.

    The receipt is inserted in the same SQLite transaction as the projections.
    It is returned only after the context manager commits successfully; therefore
    DISTRIBUTION=PASS is never returned for a rolled-back transaction.
    """
    digest = governed_payload_digest(batch)
    replay = lookup_governed_replay(preflight_receipt.update_id, digest)
    if replay is not None:
        return SyncResult.model_validate(replay), status.HTTP_200_OK

    # Preserve the existing header-idempotency collision law. A cached transport
    # response without a governed update receipt cannot be upgraded into proof.
    duplicate_header, _cached = check_idempotency(
        x_idempotency_key,
        batch.model_dump(mode="json"),
    )
    if duplicate_header:
        held = preflight_receipt.model_copy(deep=True)
        set_stage(
            held,
            "STATE_UPDATE",
            "HOLD",
            "transport key already exists without a matching governed projection receipt",
        )
        held.disposition = "HELD"
        held.synchronized = False
        held.receipt_id = receipt_id(held.update_id, "HELD", digest)
        return SyncResult(kpgs_receipt=held), status.HTTP_409_CONFLICT

    try:
        with get_db() as conn:
            conflicts = projection_conflicts(conn, batch)
            if conflicts:
                held = held_projection_receipt(preflight_receipt.model_copy(deep=True), conflicts)
                return SyncResult(kpgs_receipt=held), status.HTTP_409_CONFLICT

            result = apply_projection_rows(conn, batch, strict=True)
            receipt = finalize_applied_receipt(
                preflight_receipt.model_copy(deep=True),
                batch,
                result,
            )
            result.kpgs_receipt = receipt
            response_json = result.model_dump_json(exclude_none=True)

            conn.execute(
                """INSERT INTO governed_sync_receipts
                   (update_id, payload_hash, canonical_source_sha, response, created_at)
                   VALUES (?,?,?,?,?)""",
                (
                    receipt.update_id,
                    digest,
                    KPGS_CANONICAL_COMMIT,
                    response_json,
                    time.time(),
                ),
            )
            conn.execute(
                """INSERT INTO idempotency_keys
                   (key, payload_hash, status, created_at, response)
                   VALUES (?,?,?,?,?)""",
                (
                    x_idempotency_key,
                    payload_hash(batch.model_dump(mode="json")),
                    "accepted",
                    time.time(),
                    response_json,
                ),
            )
        return result, status.HTTP_200_OK
    except sqlite3.IntegrityError:
        # Concurrent exact retry: only the transaction that persisted the governed
        # receipt wins. The loser may return replay only when the stored digest matches.
        replay = lookup_governed_replay(preflight_receipt.update_id, digest)
        if replay is not None:
            return SyncResult.model_validate(replay), status.HTTP_200_OK
        raise


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    init_db()


@app.get("/api/health")
async def health():
    """Health probe — mirrors starfall_server.py /api/health contract."""
    return {
        "ok": True,
        "service": "kc-sync-gateway",
        "time": now_iso(),
        "progressive_updates": {
            "canonical_repository": KPGS_CANONICAL_REPOSITORY,
            "canonical_commit": KPGS_CANONICAL_COMMIT,
            "schema": KPGS_PROGRESSIVE_SCHEMA,
            "receipt_schema": KPGS_SWFUS_RECEIPT_SCHEMA,
            "boundary_marker": KPGS_BOUNDARY_MARKER,
            "projection_authoritative": False,
            "transport_grants_authority": False,
            "sovereign_truth_store": "kopano_vault",
        },
    }


@app.post("/api/v1/sync", response_model=SyncResult, response_model_exclude_none=True)
async def sync_batch(
    request: Request,
    batch: SyncBatch,
    x_idempotency_key: str | None = Header(default=None),
    x_pilot_id: str | None = Header(default=None),
):
    """
    Drain endpoint for kopano_vault sync_queue.

    Legacy batches remain compatible and receive no fabricated governance receipt.
    Batches containing `kpgs` opt into the canonical progressive-update membrane.
    """
    origin = request.client.host if request.client else "unknown"
    check_rate_limit(origin)

    preflight = preflight_progressive_update(batch, x_idempotency_key, x_pilot_id)
    if preflight.governed:
        if not preflight.admitted or preflight.receipt is None:
            result = SyncResult(kpgs_receipt=preflight.receipt)
            return JSONResponse(
                status_code=preflight.http_status,
                content=result.model_dump(mode="json", exclude_none=True),
            )

        result, http_status = execute_governed_projection(
            batch,
            x_idempotency_key or "",
            preflight.receipt,
        )
        return JSONResponse(
            status_code=http_status,
            content=result.model_dump(mode="json", exclude_none=True),
        )

    # Legacy compatibility path — behavior intentionally retained.
    if x_idempotency_key:
        is_dup, cached = check_idempotency(x_idempotency_key, batch.model_dump(mode="json"))
        if is_dup:
            return Response(
                content=cached,
                media_type="application/json",
                status_code=status.HTTP_409_CONFLICT,
            )

    with get_db() as conn:
        result = apply_projection_rows(conn, batch, strict=False)

    if x_idempotency_key:
        record_idempotency(
            x_idempotency_key,
            batch.model_dump(mode="json"),
            result.model_dump_json(exclude_none=True),
        )

    return result


@app.get("/api/v1/leaderboard")
async def leaderboard(limit: int = 10):
    """Top N scores across all pilots."""
    if limit > 100:
        limit = 100
    with get_db() as conn:
        rows = conn.execute(
            """SELECT callsign, score, cores, time_alive, wave, mode, saved_at
               FROM synced_scores
               ORDER BY score DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
    return {"leaderboard": [dict(r) for r in rows]}


@app.get("/api/v1/chat")
async def chat_history(limit: int = 50):
    """Recent chat messages — mirrors /api/chat from starfall_server.py."""
    if limit > 200:
        limit = 200
    with get_db() as conn:
        rows = conn.execute(
            """SELECT id, callsign, message, ts
               FROM synced_chat
               ORDER BY ts DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
    return {"messages": [dict(r) for r in rows]}
