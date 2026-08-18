"""
kc_sync_api.py — KC API Gateway
Endpoint: POST /api/v1/sync

Receives batches from kopano_vault sync_queue.
Deduplicates via X-Idempotency-Key header.
Commandment 9 (Offline-First): queue-draining, not real-time dependency.
Commandment 3  (Grounded Truth): every accepted record confirmed with 200; duplicates return 409.
Pillar 2       (Community): Cape Town AER — this endpoint must survive intermittent calls.

Run locally:
    uvicorn apps.api.kc_sync_api:app --reload --port 8766

Sub-protocol 8.2 (API Transport Boundary):
    This gateway is an incubation adapter, not KC authority.
    kopano_vault is the sovereign truth store. This endpoint is a flush lane only.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from apps.api.kpgs_progressive import (
    KpgsProgressiveEnvelope,
    evaluate_projection_preflight,
    mark_projection_applied,
    mark_replay,
)

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
            key         TEXT PRIMARY KEY,
            payload_hash TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'accepted',
            created_at  REAL NOT NULL,
            response    TEXT
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

        CREATE TABLE IF NOT EXISTS rate_limit_log (
            origin      TEXT NOT NULL,
            window_start REAL NOT NULL,
            count       INTEGER NOT NULL DEFAULT 0,
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
            (origin, window)
        ).fetchone()
        count = (row["count"] if row else 0) + 1
        conn.execute(
            """INSERT INTO rate_limit_log (origin, window_start, count)
               VALUES (?,?,?)
               ON CONFLICT(origin, window_start) DO UPDATE SET count=excluded.count""",
            (origin, window, count)
        )
    if count > RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Slow down, pilot — sync rate limit reached.",
        )


# ─── Idempotency helpers ──────────────────────────────────────────────────────

def payload_hash(data: Any) -> str:
    return hashlib.sha256(
        json.dumps(data, sort_keys=True, default=str).encode()
    ).hexdigest()[:16]


def check_idempotency(key: str, data: Any) -> tuple[bool, str | None]:
    """
    Returns (is_duplicate, cached_response_json).
    If duplicate with same payload → (True, cached_response).
    If key not seen        → (False, None).
    If key seen but hash mismatch → raises 422 (idempotency key reused with different payload).
    """
    h = payload_hash(data)
    cutoff = time.time() - IDEMPOTENCY_TTL
    with get_db() as conn:
        # Clean expired keys
        conn.execute("DELETE FROM idempotency_keys WHERE created_at < ?", (cutoff,))
        row = conn.execute(
            "SELECT payload_hash, response FROM idempotency_keys WHERE key=?",
            (key,)
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
    with get_db() as conn:
        conn.execute(
            """INSERT OR IGNORE INTO idempotency_keys
               (key, payload_hash, status, created_at, response)
               VALUES (?,?,?,?,?)""",
            (key, payload_hash(data), "accepted", time.time(), response_json),
        )


# ─── Payload models ───────────────────────────────────────────────────────────

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
    """
    Batch payload from kopano_vault sync_queue.
    A single POST may contain multiple record types.

    `kpgs` is optional for backwards compatibility. Its presence selects the
    canonical progressive-update lane; absence keeps the original legacy path.
    """
    scores   : list[ScorePayload]  = Field(default_factory=list)
    chat     : list[ChatPayload]   = Field(default_factory=list)
    pilot_id : str | None          = None
    client_ts: str | None          = None  # ISO-8601 client timestamp for drift logging
    kpgs     : KpgsProgressiveEnvelope | None = None


class SyncResult(BaseModel):
    accepted  : int = 0
    duplicates: int = 0
    errors    : list[str] = Field(default_factory=list)


# ─── Governed response helpers ────────────────────────────────────────────────

def governed_response(
    result: SyncResult,
    receipt: dict[str, Any],
    *,
    status_code: int = status.HTTP_200_OK,
) -> Response:
    payload = {
        **result.model_dump(),
        "kpgs": {"receipt": receipt},
    }
    return Response(
        content=json.dumps(payload, separators=(",", ":"), sort_keys=True),
        media_type="application/json",
        status_code=status_code,
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    init_db()


@app.get("/api/health")
async def health():
    """Health probe — mirrors starfall_server.py /api/health contract."""
    return {"ok": True, "service": "kc-sync-gateway", "time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}


@app.post("/api/v1/sync")
async def sync_batch(
    request    : Request,
    batch      : SyncBatch,
    x_idempotency_key: str | None = Header(default=None),
    x_pilot_id       : str | None = Header(default=None),
):
    """
    Drain endpoint for kopano_vault sync_queue.

    Legacy batches keep the original accepted/duplicate/error response shape and
    duplicate 409 semantics. A batch containing `kpgs` selects the governed
    progressive-update lane and receives an eight-stage non-authoritative receipt.
    """
    origin = request.client.host if request.client else "unknown"
    check_rate_limit(origin)

    batch_dump = batch.model_dump()
    kpgs_receipt: dict[str, Any] | None = None

    # Canonical preflight happens before idempotency lookup or projection writes.
    # Pydantic has already validated the batch/envelope shape at this point.
    if batch.kpgs is not None:
        record_ids = [f"score:{item.id}" for item in batch.scores] + [
            f"chat:{item.id}" for item in batch.chat
        ]
        record_keys = [item.idempotency_key for item in batch.scores] + [
            item.idempotency_key for item in batch.chat
        ]
        admitted, http_status, kpgs_receipt = evaluate_projection_preflight(
            batch.kpgs,
            batch_idempotency_key=x_idempotency_key,
            record_ids=record_ids,
            record_idempotency_keys=record_keys,
        )
        if not admitted:
            return governed_response(
                SyncResult(),
                kpgs_receipt,
                status_code=http_status,
            )

    # Batch-level idempotency. Governed exact replay returns the cached governed
    # response as a 200 without rerunning SQLite mutation. Legacy behavior remains 409.
    if x_idempotency_key:
        is_dup, cached = check_idempotency(x_idempotency_key, batch_dump)
        if is_dup:
            if batch.kpgs is not None and cached:
                cached_payload = json.loads(cached)
                cached_receipt = cached_payload.get("kpgs", {}).get("receipt")
                if isinstance(cached_receipt, dict):
                    cached_payload["kpgs"]["receipt"] = mark_replay(cached_receipt)
                return Response(
                    content=json.dumps(cached_payload, separators=(",", ":"), sort_keys=True),
                    media_type="application/json",
                    status_code=status.HTTP_200_OK,
                )
            return Response(
                content=cached,
                media_type="application/json",
                status_code=status.HTTP_409_CONFLICT,
            )

    result = SyncResult()

    with get_db() as conn:
        # ── scores ────────────────────────────────────────────────────────────
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
                        score.id, score.pilot_id, score.callsign,
                        score.score, score.cores, score.time_alive, score.wave,
                        score.mode, score.saved_at, score.idempotency_key,
                        time.time(),
                    ),
                )
                result.accepted += 1
            except Exception as exc:
                result.errors.append(f"score {score.id}: {exc}")

        # ── chat messages ──────────────────────────────────────────────────────
        for msg in batch.chat:
            try:
                existing = conn.execute(
                    "SELECT id FROM synced_chat WHERE id=?", (msg.id,)
                ).fetchone()
                if existing:
                    result.duplicates += 1
                    continue
                conn.execute(
                    """INSERT INTO synced_chat
                       (id, callsign, pilot_id, message, ts, idempotency_key, synced_at)
                       VALUES (?,?,?,?,?,?,?)""",
                    (
                        msg.id, msg.callsign, msg.pilot_id,
                        msg.message, msg.ts, msg.idempotency_key,
                        time.time(),
                    ),
                )
                result.accepted += 1
            except Exception as exc:
                result.errors.append(f"chat {msg.id}: {exc}")

    # Build the exact response before caching it under the batch idempotency key.
    if batch.kpgs is not None and kpgs_receipt is not None:
        kpgs_receipt = mark_projection_applied(
            kpgs_receipt,
            accepted=result.accepted,
            duplicates=result.duplicates,
            errors=result.errors,
        )
        governed_payload = {
            **result.model_dump(),
            "kpgs": {"receipt": kpgs_receipt},
        }
        response_json = json.dumps(
            governed_payload,
            separators=(",", ":"),
            sort_keys=True,
        )
    else:
        response_json = result.model_dump_json()

    # Record batch idempotency key after processing.
    if x_idempotency_key:
        record_idempotency(
            x_idempotency_key,
            batch_dump,
            response_json,
        )

    if batch.kpgs is not None and kpgs_receipt is not None:
        return Response(
            content=response_json,
            media_type="application/json",
            status_code=status.HTTP_200_OK,
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
            (limit,)
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
            (limit,)
        ).fetchall()
    return {"messages": [dict(r) for r in rows]}
