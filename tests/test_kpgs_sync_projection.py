from __future__ import annotations

import asyncio
import json
import tempfile
import unittest
from pathlib import Path

from fastapi import Request
from fastapi.responses import JSONResponse, Response

from apps.api import kc_sync_api as api
from apps.api.kpgs_progressive import (
    KPGS_PROGRESSIVE_UPDATE_SOURCE,
    STAGE_ORDER,
    mark_projection_applied,
    preflight_projection,
)


def envelope(**overrides):
    value = {
        "update_id": "starfall-sync-001",
        "protocol": KPGS_PROGRESSIVE_UPDATE_SOURCE["contract"],
        "canonical_source_sha": KPGS_PROGRESSIVE_UPDATE_SOURCE["commit"],
        "apu_state": "GREEN",
        "boundary_marker": "#NB",
        "crud_intent": "CREATE",
        "state_class": "derived_projection",
        "authority_effect": "none",
        "foc_asserted": False,
    }
    value.update(overrides)
    return value


def projection_payload():
    return {
        "scores": [
            {
                "id": "score-1",
                "pilot_id": "pilot-1",
                "callsign": "KC",
                "score": 42,
                "cores": 2,
                "time_alive": 9.5,
                "wave": 3,
                "mode": "desktop",
                "saved_at": "2026-08-19T00:00:00Z",
                "idempotency_key": "record-score-1",
            }
        ],
        "chat": [],
        "pilot_id": "pilot-1",
        "client_ts": "2026-08-19T00:00:00Z",
    }


class ProgressiveReceiptTests(unittest.TestCase):
    def test_canonical_source_and_stage_order_are_pinned(self):
        self.assertEqual(
            KPGS_PROGRESSIVE_UPDATE_SOURCE["commit"],
            "70f40324978ee8c3c1a8a77a29e6ac84c7f6bf3a",
        )
        self.assertEqual(
            STAGE_ORDER,
            (
                "telemetry",
                "classification",
                "routing",
                "protocolSelection",
                "invariantAudit",
                "pocFocCheck",
                "stateUpdate",
                "distribution",
            ),
        )

    def test_red_yellow_nb_foc_and_authority_fail_before_projection(self):
        cases = [
            (envelope(apu_state="RED"), "pocFocCheck", "REJECT"),
            (envelope(apu_state="YELLOW"), "pocFocCheck", "HOLD"),
            (envelope(boundary_marker="NB"), "invariantAudit", "HOLD"),
            (envelope(foc_asserted=True), "pocFocCheck", "REJECT"),
            (envelope(authority_effect="grant"), "invariantAudit", "REJECT"),
        ]
        for candidate, failed_stage, status in cases:
            with self.subTest(candidate=candidate):
                result = preflight_projection(
                    candidate,
                    idempotency_key="batch-1",
                    projection_payload=projection_payload(),
                    record_count=1,
                )
                self.assertFalse(result.admitted)
                self.assertEqual(result.receipt["stages"][failed_stage]["status"], status)
                self.assertEqual(result.receipt["stages"]["stateUpdate"]["status"], "NOT_REACHED")
                self.assertEqual(result.receipt["stages"]["distribution"]["status"], "NOT_REACHED")

    def test_client_evidence_cannot_replace_server_evidence(self):
        result = preflight_projection(
            envelope(poc_evidence_refs=["client://trust-me"]),
            idempotency_key="batch-1",
            projection_payload=projection_payload(),
            record_count=1,
        )
        self.assertTrue(result.admitted)
        self.assertNotIn("client://trust-me", result.receipt["evidenceRefs"])
        self.assertTrue(result.receipt["evidenceRefs"][0].startswith("sha256:"))
        self.assertEqual(result.receipt["stages"]["stateUpdate"]["status"], "READY")
        self.assertEqual(result.receipt["stages"]["distribution"]["status"], "NOT_REACHED")

    def test_receiving_sink_passes_distribution_only_after_applied_marker(self):
        preflight = preflight_projection(
            envelope(),
            idempotency_key="batch-1",
            projection_payload=projection_payload(),
            record_count=1,
        )
        self.assertEqual(preflight.receipt["stages"]["distribution"]["status"], "NOT_REACHED")
        applied = mark_projection_applied(preflight.receipt, accepted=1, duplicates=0)
        self.assertEqual(applied["stages"]["stateUpdate"]["status"], "PASS")
        self.assertEqual(applied["stages"]["distribution"]["status"], "PASS")
        self.assertFalse(applied["canonical"])
        self.assertEqual(applied["authorityEffect"], "none")
        self.assertFalse(applied["transportGrantsAuthority"])


class SyncRouteTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        api.DB_PATH = Path(self.tmp.name) / "kc_sync_test.db"
        api.init_db()

    def tearDown(self):
        self.tmp.cleanup()

    @staticmethod
    def request() -> Request:
        return Request(
            {
                "type": "http",
                "http_version": "1.1",
                "method": "POST",
                "scheme": "http",
                "path": "/api/v1/sync",
                "raw_path": b"/api/v1/sync",
                "query_string": b"",
                "headers": [],
                "client": ("127.0.0.1", 12345),
                "server": ("test", 80),
            }
        )

    @staticmethod
    def batch(*, governed=True, score=42):
        kwargs = {
            "scores": [
                api.ScorePayload(
                    id="score-1",
                    pilot_id="pilot-1",
                    callsign="KC",
                    score=score,
                    cores=2,
                    time_alive=9.5,
                    wave=3,
                    mode="desktop",
                    saved_at="2026-08-19T00:00:00Z",
                    idempotency_key="record-score-1",
                )
            ],
            "pilot_id": "pilot-1",
            "client_ts": "2026-08-19T00:00:00Z",
        }
        if governed:
            kwargs["kpgs"] = envelope()
        return api.SyncBatch(**kwargs)

    def count_scores(self):
        with api.get_db() as conn:
            return conn.execute("SELECT COUNT(*) AS n FROM synced_scores").fetchone()["n"]

    def test_legacy_lane_keeps_409_duplicate_behavior(self):
        batch = self.batch(governed=False)
        first = asyncio.run(
            api.sync_batch(self.request(), batch, x_idempotency_key="legacy-batch", x_pilot_id=None)
        )
        self.assertEqual(first.accepted, 1)
        duplicate = asyncio.run(
            api.sync_batch(self.request(), batch, x_idempotency_key="legacy-batch", x_pilot_id=None)
        )
        self.assertIsInstance(duplicate, Response)
        self.assertEqual(duplicate.status_code, 409)
        self.assertEqual(self.count_scores(), 1)

    def test_red_governed_batch_never_reaches_projection_write(self):
        batch = self.batch(governed=True)
        batch.kpgs = envelope(apu_state="RED")
        response = asyncio.run(
            api.sync_batch(self.request(), batch, x_idempotency_key="red-batch", x_pilot_id=None)
        )
        self.assertIsInstance(response, JSONResponse)
        self.assertEqual(response.status_code, 403)
        body = json.loads(response.body)
        self.assertEqual(body["kpgs_receipt"]["stages"]["pocFocCheck"]["status"], "REJECT")
        self.assertEqual(self.count_scores(), 0)

    def test_governed_commit_replay_and_collision_are_deterministic(self):
        batch = self.batch(governed=True)
        first = asyncio.run(
            api.sync_batch(self.request(), batch, x_idempotency_key="governed-batch", x_pilot_id=None)
        )
        self.assertEqual(first.accepted, 1)
        self.assertEqual(first.kpgs_receipt["stages"]["distribution"]["status"], "PASS")
        self.assertEqual(self.count_scores(), 1)

        replay = asyncio.run(
            api.sync_batch(self.request(), batch, x_idempotency_key="governed-batch", x_pilot_id=None)
        )
        self.assertIsInstance(replay, JSONResponse)
        self.assertEqual(replay.status_code, 200)
        replay_body = json.loads(replay.body)
        self.assertTrue(replay_body["kpgs_receipt"]["replay"])
        self.assertEqual(self.count_scores(), 1)

        changed = self.batch(governed=True, score=99)
        collision = asyncio.run(
            api.sync_batch(self.request(), changed, x_idempotency_key="governed-batch", x_pilot_id=None)
        )
        self.assertIsInstance(collision, JSONResponse)
        self.assertEqual(collision.status_code, 422)
        collision_body = json.loads(collision.body)
        self.assertEqual(collision_body["kpgs_receipt"]["stages"]["stateUpdate"]["status"], "HOLD")
        self.assertEqual(self.count_scores(), 1)


if __name__ == "__main__":
    unittest.main()
