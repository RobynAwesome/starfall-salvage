from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from fastapi import HTTPException

from apps.api import kc_sync_api
from apps.api.kpgs_progressive import (
    CANONICAL_SOURCE,
    STAGE_ORDER,
    KpgsProgressiveEnvelope,
    evaluate_projection_preflight,
    mark_projection_applied,
    mark_replay,
)


def envelope(**overrides):
    data = {
        "update_id": "batch-001",
        "domain": "starfallsalvage.kopanolabs.com",
        "lane": "kc-sync",
        "protocol": CANONICAL_SOURCE["contract"],
        "canonical_source_sha": CANONICAL_SOURCE["commit"],
        "apu_state": "GREEN",
        "boundary_marker": "#NB",
        "crud_intent": "CREATE",
        "state_class": "derived_projection",
        "authority_effect": "none",
        "foc_asserted": False,
    }
    data.update(overrides)
    return KpgsProgressiveEnvelope(**data)


def preflight(env=None, *, key="batch-001", ids=None, record_keys=None):
    return evaluate_projection_preflight(
        env or envelope(),
        batch_idempotency_key=key,
        record_ids=ids or ["score:score-1"],
        record_idempotency_keys=record_keys or ["score-record-1"],
    )


class ProgressiveProjectionTests(unittest.TestCase):
    def test_canonical_source_is_pinned(self):
        self.assertEqual(
            CANONICAL_SOURCE,
            {
                "repository": "RobynAwesome/Introduction-to-MCP",
                "commit": "70f40324978ee8c3c1a8a77a29e6ac84c7f6bf3a",
                "contract": "kpgs.progressive-update.v1",
                "chain": "APU -> Progressive Update -> #NB -> bounded CRUD -> SWFUS",
            },
        )

    def test_green_governed_batch_reaches_projection_ready(self):
        admitted, status_code, receipt = preflight()
        self.assertTrue(admitted)
        self.assertEqual(status_code, 200)
        self.assertEqual(receipt["code"], "PROJECTION_READY")
        self.assertEqual(list(receipt["stages"].keys()), list(STAGE_ORDER))
        self.assertEqual(receipt["stages"]["poc_foc_check"]["status"], "PASS")
        self.assertEqual(receipt["stages"]["state_update"]["status"], "READY")
        self.assertEqual(receipt["stages"]["distribution"]["status"], "NOT_REACHED")
        self.assertFalse(receipt["canonical"])
        self.assertEqual(receipt["authority_effect"], "none")
        self.assertFalse(receipt["transport_grants_authority"])
        self.assertEqual(
            receipt["evidence_refs"],
            [
                "runtime://pydantic/sync-batch-validated",
                "runtime://starfall/batch-idempotency/header-update-bound",
                "runtime://starfall/projection-record-identities/validated",
            ],
        )

    def test_batch_header_must_bind_to_update_id(self):
        admitted, status_code, receipt = preflight(key="different")
        self.assertFalse(admitted)
        self.assertEqual(status_code, 409)
        self.assertEqual(receipt["code"], "UPDATE_ID_MISMATCH")
        self.assertEqual(receipt["stages"]["state_update"]["status"], "NOT_REACHED")

    def test_red_rejects_and_yellow_holds_before_write(self):
        admitted, _, red = preflight(envelope(apu_state="RED"))
        self.assertFalse(admitted)
        self.assertEqual(red["code"], "APU_RED")
        self.assertEqual(red["outcome"], "REJECT")
        self.assertEqual(red["stages"]["state_update"]["status"], "NOT_REACHED")

        admitted, _, yellow = preflight(envelope(apu_state="YELLOW"))
        self.assertFalse(admitted)
        self.assertEqual(yellow["code"], "APU_NOT_GREEN")
        self.assertEqual(yellow["outcome"], "HOLD")
        self.assertEqual(yellow["stages"]["state_update"]["status"], "NOT_REACHED")

    def test_literal_nb_is_required(self):
        admitted, _, receipt = preflight(envelope(boundary_marker="NB"))
        self.assertFalse(admitted)
        self.assertEqual(receipt["code"], "NB_BOUNDARY_REQUIRED")
        self.assertEqual(receipt["outcome"], "HOLD")

    def test_authoritative_state_and_authority_effect_fail_closed(self):
        admitted, _, truth = preflight(envelope(state_class="constitutional_truth"))
        self.assertFalse(admitted)
        self.assertEqual(truth["code"], "AUTHORITATIVE_STATE_FORBIDDEN")

        admitted, _, authority = preflight(envelope(authority_effect="grant"))
        self.assertFalse(admitted)
        self.assertEqual(authority["code"], "AUTHORITY_EFFECT_FORBIDDEN")

    def test_foc_and_missing_projection_evidence_fail_before_write(self):
        admitted, _, foc = preflight(envelope(foc_asserted=True))
        self.assertFalse(admitted)
        self.assertEqual(foc["code"], "FOC_ASSERTED")

        admitted, _, empty = evaluate_projection_preflight(
            envelope(),
            batch_idempotency_key="batch-001",
            record_ids=[],
            record_idempotency_keys=[],
        )
        self.assertFalse(admitted)
        self.assertEqual(empty["code"], "EMPTY_PROJECTION_BATCH")

        admitted, _, no_record_key = preflight(record_keys=[""])
        self.assertFalse(admitted)
        self.assertEqual(no_record_key["code"], "RECORD_IDEMPOTENCY_REQUIRED")

    def test_duplicate_record_ids_hold_before_projection(self):
        admitted, _, receipt = preflight(
            ids=["score:same", "score:same"],
            record_keys=["one", "two"],
        )
        self.assertFalse(admitted)
        self.assertEqual(receipt["code"], "DUPLICATE_RECORD_IDS_IN_BATCH")
        self.assertEqual(receipt["stages"]["state_update"]["status"], "NOT_REACHED")

    def test_distribution_passes_only_after_complete_projection_commit(self):
        _, _, ready = preflight()
        applied = mark_projection_applied(
            ready,
            accepted=1,
            duplicates=0,
            errors=[],
        )
        self.assertEqual(applied["outcome"], "APPLIED")
        self.assertEqual(applied["stages"]["state_update"]["status"], "PASS")
        self.assertEqual(applied["stages"]["distribution"]["status"], "PASS")
        self.assertFalse(applied["canonical"])
        self.assertFalse(applied["transport_grants_authority"])

        partial = mark_projection_applied(
            ready,
            accepted=1,
            duplicates=0,
            errors=["chat c1: failed"],
        )
        self.assertEqual(partial["outcome"], "PARTIAL")
        self.assertEqual(partial["stages"]["distribution"]["status"], "HOLD")

    def test_replay_receipt_uses_cached_response_evidence(self):
        _, _, ready = preflight()
        applied = mark_projection_applied(ready, accepted=1, duplicates=0, errors=[])
        replay = mark_replay(applied)
        self.assertTrue(replay["replay"])
        self.assertEqual(replay["code"], "IDEMPOTENT_REPLAY")
        self.assertEqual(
            replay["evidence_refs"],
            [
                "runtime://starfall/batch-idempotency/exact-payload-match",
                "sqlite://idempotency_keys/cached-response",
            ],
        )


class ExistingIdempotencyTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.original_db_path = kc_sync_api.DB_PATH
        kc_sync_api.DB_PATH = Path(self.tempdir.name) / "kc_sync.db"
        kc_sync_api.init_db()

    def tearDown(self):
        kc_sync_api.DB_PATH = self.original_db_path
        self.tempdir.cleanup()

    def test_exact_payload_replays_and_changed_payload_conflicts(self):
        payload = {"scores": [{"id": "score-1"}], "kpgs": {"update_id": "batch-001"}}
        cached = '{"accepted":1,"duplicates":0,"errors":[]}'
        kc_sync_api.record_idempotency("batch-001", payload, cached)

        duplicate, response = kc_sync_api.check_idempotency("batch-001", payload)
        self.assertTrue(duplicate)
        self.assertEqual(response, cached)

        with self.assertRaises(HTTPException) as raised:
            kc_sync_api.check_idempotency(
                "batch-001",
                {"scores": [{"id": "different"}], "kpgs": {"update_id": "batch-001"}},
            )
        self.assertEqual(raised.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
