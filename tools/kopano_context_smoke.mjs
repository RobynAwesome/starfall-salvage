/**
 * Smoke test for @kopano/context governance (no build step).
 * Run: node tools/kopano_context_smoke.mjs
 */
import {
  StateBroker,
  SwarmValidator,
  TriageLevel
} from "../packages/kopano-context/src/governance/index.ts";


const broker = new StateBroker();
broker.registerNode({
  nodeId: "starfall-mobile",
  threadId: "thread-1",
  memoryIsolated: true,
  lastCheckpoint: new Date().toISOString(),
  groundedTruthHash: "init"
});

const intent = {
  who: "Robyn",
  what: "Re-test mobile stress after HUD fix",
  where: "starfallsalvage.kopanolabs.com",
  why: "Work vector — ship truthful mobile gate without false PASS"
};

SwarmValidator.validateBeforeExecute(intent, "starfall-mobile");
const ctx = broker.createContext(intent, "starfall-mobile");
broker.checkpoint(ctx.contextId, { phase: "ready", score: 0 });
const payload = broker.brokerState(ctx.contextId, ["kc-watch", "mao-lane"]);

const ok =
  payload.offlineCapable === true &&
  payload.context.triageLevel === TriageLevel.GREEN &&
  broker.getTestimony().length >= 3;

console.log(
  JSON.stringify(
    {
      ok,
      contextId: ctx.contextId,
      triage: ctx.triageLevel,
      payloadHash: payload.payloadHash,
      testimonyEvents: broker.getTestimony().map((t) => t.event)
    },
    null,
    2
  )
);

if (!ok) {
  process.exit(1);
}
