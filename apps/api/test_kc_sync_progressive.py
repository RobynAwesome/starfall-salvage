from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from fastapi import HTTPException

from apps.api import kc_sync_api as api


class KcSyncProgressiveUpdateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        api.DB_PATH = Path(self.tmp.name) / "kc_sync_test.db"
        api.init_db()

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def batch(self, **overrides) -> api.SyncBatch:
        envelope = {
            "update_id": "sync-update-001",
            "protocol": api.KPGS_PROGRESSIVE_SCHEMA,
            "canonical_source_sha": api.KPGS_CANONICAL_COMMIT,
            "apu_state": "GREEN",
            "boundary_marker": "#NB",
            "crud_intent": "CREATE",
            "state_class": "derived_projection",
            "authority_effect": "none",
            "foc_asserted": False,
            "correlation_id": "pilot-test",
        }
        envelope.update(overrides)
        return api.SyncBatch(
            scores=[
                api.ScorePayload(
                    id="score-001",
                    pilot_id="pilot-001",
                    callsign="TESTER",
                    score=4200,
                    cores=7,
                    time_alive=91.2,
                    wave=4,
                    mode="desktop",
                    saved_at="2026-08-19T00:00:00Z",
                    idempotency_key="vault-score-001",
                )
            ],
            pilot_id="pilot-001",
            client_ts="2026-08-19T00:00:01Z",
            kpgs=api.KpgsProgressiveEnvelope(**envelope),
        )

    def row_count(self, table: str) -> int:
        self.assertIn(table, {"synced_scores", "synced_chat", "governed_sync_receipts"})
        with api.get_db() as conn:
            return int(conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0])

    def stage(self, receipt: api.KpgsSwfusReceipt, name: str) -> api.KpgsStageReceipt:
        return next(item for item in receipt.stages if item.stage == name)

    def test_legacy_batch_does_not_fabricate_governance(self) -> None:
        legacy = api.SyncBatch(
            scores=[self.batch().scores[0]],
            pilot_id="pilot-001",
        )
        decision = api.preflight_progressive_update(legacy, "legacy-key", "pilot-001")
        self.assertFalse(decision.governed)
        self.assertIsNone(decision.receipt)

    def test_source_pin_and_stage_order_are_machine_exact(self) -> None:
        self.assertEqual(
            api.KPGS_CANONICAL_COMMIT,
            "70f40324978ee8c3c1a8a77a29e6ac84c7f6bf3a",
        )
        self.assertEqual(api.KPGS_PROGRESSIVE_SCHEMA, "kpgs.progressive-update.v1")
        self.assertEqual(api.KPGS_BOUNDARY_MARKER, "#NB")
        decision = api.preflight_progressive_update(
            self.batch(), "transport-001", "pilot-001"
        )
        self.assertTrue(decision.admitted)
        self.assertIsNotNone(decision.receipt)
        assert decision.receipt is not None
        self.assertEqual(
            [item.stage for item in decision.receipt.stages],
            list(api.KPGS_STAGE_ORDER),
        )
        self.assertEqual(self.stage(decision.receipt, "STATE_UPDATE").status, "NOT_REACHED")
        self.assertEqual(self.stage(decision.receipt, "DISTRIBUTION").status, "NOT_REACHED")

    def test_red_rejects_before_projection(self) -> None:
        decision = api.preflight_progressive_update(
            self.batch(apu_state="RED"), "transport-red", "pilot-001"
        )
        self.assertFalse(decision.admitted)
        assert decision.receipt is not None
        self.assertEqual(decision.receipt.disposition, "REJECTED")
        self.assertEqual(self.stage(decision.receipt, "INVARIANT_AUDIT").status, "REJECT")
        self.assertEqual(self.stage(decision.receipt, "STATE_UPDATE").status, "NOT_REACHED")
        self.assertEqual(self.row_count("synced_scores"), 0)

    def test_yellow_and_missing_nb_hold_before_projection(self) -> None:
        yellow = api.preflight_progressive_update(
            self.batch(apu_state="YELLOW"), "transport-yellow", "pilot-001"
        )
        self.assertFalse(yellow.admitted)
        assert yellow.receipt is not None
        self.assertEqual(yellow.receipt.disposition, "HELD")
        self.assertEqual(self.stage(yellow.receipt, "STATE_UPDATE").status, "NOT_REACHED")

        missing_nb = api.preflight_progressive_update(
            self.batch(boundary_marker="NB"), "transport-nb", "pilot-001"
        )
        self.assertFalse(missing_nb.admitted)
        assert missing_nb.receipt is not None
        self.assertEqual(missing_nb.receipt.boundary_marker, "NB")
        self.assertEqual(self.stage(missing_nb.receipt, "INVARIANT_AUDIT").status, "HOLD")
        self.assertEqual(self.row_count("synced_scores"), 0)

    def test_authority_and_foc_fail_closed(self) -> None:
        authority = api.preflight_progressive_update(
            self.batch(authority_effect="grant"), "transport-authority", "pilot-001"
        )
        self.assertFalse(authority.admitted)
        assert authority.receipt is not None
        self.assertEqual(self.stage(authority.receipt, "CLASSIFICATION").status, "REJECT")

        truth = api.preflight_progressive_update(
            self.batch(state_class="constitutional_truth"), "transport-truth", "pilot-001"
        )
        self.assertFalse(truth.admitted)
        assert truth.receipt is not None
        self.assertEqual(self.stage(truth.receipt, "CLASSIFICATION").status, "REJECT")

        foc = api.preflight_progressive_update(
            self.batch(foc_asserted=True), "transport-foc", "pilot-001"
        )
        self.assertFalse(foc.admitted)
        assert foc.receipt is not None
        self.assertEqual(self.stage(foc.receipt, "POC_FOC_CHECK").status, "REJECT")
        self.assertEqual(self.row_count("synced_scores"), 0)

    def test_server_evidence_is_derived_not_client_asserted(self) -> None:
        held = api.preflight_progressive_update(self.batch(), None, "pilot-001")
        self.assertFalse(held.admitted)
        assert held.receipt is not None
        self.assertEqual(self.stage(held.receipt, "POC_FOC_CHECK").status, "HOLD")
        self.assertEqual(held.receipt.evidence_refs, [])

        passed = api.preflight_progressive_update(
            self.batch(), "transport-proof", "pilot-001"
        )
        self.assertTrue(passed.admitted)
        assert passed.receipt is not None
        self.assertTrue(
            any(ref.startswith("runtime://kc-sync/payload-sha256/") for ref in passed.receipt.evidence_refs)
        )
        self.assertIn(
            "runtime://kc-sync/x-idempotency-key/present",
            passed.receipt.evidence_refs,
        )

    def test_governed_create_commits_projection_and_distribution_receipt(self) -> None:
        batch = self.batch()
        decision = api.preflight_progressive_update(
            batch, "transport-create", "pilot-001"
        )
        self.assertTrue(decision.admitted)
        assert decision.receipt is not None

        result, http_status = api.execute_governed_projection(
            batch, "transport-create", decision.receipt
        )
        self.assertEqual(http_status, 200)
        self.assertEqual(result.accepted, 1)
        self.assertEqual(result.duplicates, 0)
        self.assertEqual(result.errors, [])
        self.assertIsNotNone(result.kpgs_receipt)
        receipt = result.kpgs_receipt
        assert receipt is not None
        self.assertEqual(receipt.schema, "kpgs.swfus.receipt.v1")
        self.assertEqual(receipt.disposition, "APPLIED")
        self.assertTrue(receipt.synchronized)
        self.assertFalse(receipt.canonical_authority_changed)
        self.assertFalse(receipt.replayed)
        self.assertEqual(receipt.boundary_marker, "#NB")
        self.assertEqual(self.stage(receipt, "STATE_UPDATE").status, "PASS")
        self.assertEqual(self.stage(receipt, "DISTRIBUTION").status, "PASS")
        self.assertIsNotNone(receipt.state_digest)
        self.assertEqual(self.row_count("synced_scores"), 1)
        self.assertEqual(self.row_count("governed_sync_receipts"), 1)

    def test_exact_replay_returns_original_receipt_without_second_mutation(self) -> None:
        batch = self.batch()
        first = api.preflight_progressive_update(
            batch, "transport-replay", "pilot-001"
        )
        assert first.receipt is not None
        created, _ = api.execute_governed_projection(
            batch, "transport-replay", first.receipt
        )
        original_receipt_id = created.kpgs_receipt.receipt_id  # type: ignore[union-attr]

        again = api.preflight_progressive_update(
            batch, "transport-replay", "pilot-001"
        )
        assert again.receipt is not None
        replayed, http_status = api.execute_governed_projection(
            batch, "transport-replay", again.receipt
        )
        self.assertEqual(http_status, 200)
        assert replayed.kpgs_receipt is not None
        self.assertTrue(replayed.kpgs_receipt.replayed)
        self.assertEqual(replayed.kpgs_receipt.receipt_id, original_receipt_id)
        self.assertEqual(self.row_count("synced_scores"), 1)
        self.assertEqual(self.row_count("governed_sync_receipts"), 1)

    def test_same_update_id_with_changed_payload_conflicts(self) -> None:
        batch = self.batch()
        first = api.preflight_progressive_update(
            batch, "transport-collision", "pilot-001"
        )
        assert first.receipt is not None
        api.execute_governed_projection(batch, "transport-collision", first.receipt)

        changed = self.batch()
        changed.scores[0].score = 9999
        changed_preflight = api.preflight_progressive_update(
            changed, "transport-collision-2", "pilot-001"
        )
        assert changed_preflight.receipt is not None
        with self.assertRaises(HTTPException) as raised:
            api.execute_governed_projection(
                changed, "transport-collision-2", changed_preflight.receipt
            )
        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(self.row_count("synced_scores"), 1)

    def test_fresh_governed_create_holds_if_projection_was_already_written(self) -> None:
        batch = self.batch()
        with api.get_db() as conn:
            legacy_result = api.apply_projection_rows(conn, batch, strict=False)
        self.assertEqual(legacy_result.accepted, 1)

        decision = api.preflight_progressive_update(
            batch, "transport-preexisting", "pilot-001"
        )
        assert decision.receipt is not None
        result, http_status = api.execute_governed_projection(
            batch, "transport-preexisting", decision.receipt
        )
        self.assertEqual(http_status, 409)
        assert result.kpgs_receipt is not None
        self.assertEqual(result.kpgs_receipt.disposition, "HELD")
        self.assertFalse(result.kpgs_receipt.synchronized)
        self.assertEqual(self.stage(result.kpgs_receipt, "STATE_UPDATE").status, "HOLD")
        self.assertEqual(self.stage(result.kpgs_receipt, "DISTRIBUTION").status, "NOT_REACHED")
        self.assertEqual(self.row_count("governed_sync_receipts"), 0)


if __name__ == "__main__":
    unittest.main()
