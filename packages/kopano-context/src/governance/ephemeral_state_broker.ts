import {
  ALL_COMMANDMENTS,
  Commandment,
  CommandmentBreachError,
  type IntentPayload,
  validateExecution
} from "./commandments_1_to_15.ts";

/** Jethro escalation protocol (C7). */
export const TriageLevel = {
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  RED: "RED"
} as const;

export type TriageLevel = (typeof TriageLevel)[keyof typeof TriageLevel];

/** Isolated execution context (C14). */
export interface NodeState {
  nodeId: string;
  threadId: string;
  memoryIsolated: boolean;
  lastCheckpoint: string;
  groundedTruthHash: string;
}

/** Temporary execution envelope (C13). */
export interface EphemeralContext {
  contextId: string;
  intent: IntentPayload;
  triageLevel: TriageLevel;
  originatingNode: string;
  createdAt: string;
  expiresAt: string;
  commandmentValidation: readonly Commandment[];
  stateSnapshot: Record<string, unknown>;
}

/** Cross-node state transmission envelope. */
export interface BrokerPayload {
  payloadId: string;
  sourceNode: NodeState;
  targetNodes: string[];
  context: EphemeralContext;
  payloadHash: string;
  offlineCapable: boolean;
}

export interface TestimonyEntry {
  event: string;
  friction: number;
  recordedAt: string;
}

const ECOSYSTEM_VECTORS = ["Personal", "Work", "Relational"] as const;

const TRIAGE_TTL_MS: Record<TriageLevel, number> = {
  [TriageLevel.GREEN]: 15 * 60 * 1000,
  [TriageLevel.YELLOW]: 60 * 60 * 1000,
  [TriageLevel.RED]: 4 * 60 * 60 * 1000
};

function stableHash(value: unknown): string {
  const raw = JSON.stringify(value);
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return `djb2-${(hash >>> 0).toString(16)}`;
}

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Central coordination for ephemeral state management. */
export class StateBroker {
  private readonly activeContexts = new Map<string, EphemeralContext>();
  private readonly nodeRegistry = new Map<string, NodeState>();
  private readonly testimonyLog: TestimonyEntry[] = [];

  registerNode(node: NodeState): void {
    this.nodeRegistry.set(node.nodeId, node);
    this.logTestimony("NODE_REGISTERED", 0.05);
  }

  createContext(intent: IntentPayload, nodeId: string): EphemeralContext {
    validateExecution(intent);

    const node = this.nodeRegistry.get(nodeId);
    if (!node) {
      throw new CommandmentBreachError(
        "COMMANDMENT 1",
        "Unregistered node attempted execution."
      );
    }

    const triageLevel = this.assessTriage(intent);
    const context: EphemeralContext = {
      contextId: generateId("ctx"),
      intent,
      triageLevel,
      originatingNode: nodeId,
      createdAt: new Date().toISOString(),
      expiresAt: this.calculateExpiry(triageLevel),
      commandmentValidation: ALL_COMMANDMENTS,
      stateSnapshot: {}
    };

    this.activeContexts.set(context.contextId, context);
    this.logTestimony("CONTEXT_CREATED", 0.15);
    return context;
  }

  brokerState(contextId: string, targetNodes: string[]): BrokerPayload {
    const context = this.activeContexts.get(contextId);
    if (!context) {
      throw new CommandmentBreachError(
        "COMMANDMENT 13",
        "Context lost. Halt execution."
      );
    }

    if (Date.now() > Date.parse(context.expiresAt)) {
      this.activeContexts.delete(contextId);
      throw new CommandmentBreachError(
        "COMMANDMENT 13",
        "Context expired. State preserved, execution halted."
      );
    }

    const sourceNode = this.nodeRegistry.get(context.originatingNode);
    if (!sourceNode) {
      throw new CommandmentBreachError(
        "COMMANDMENT 14",
        "Source node missing from registry."
      );
    }

    const payload: BrokerPayload = {
      payloadId: generateId("brk"),
      sourceNode,
      targetNodes,
      context,
      payloadHash: stableHash(context),
      offlineCapable: true
    };

    this.logTestimony("STATE_BROKERED", 0.2);
    return payload;
  }

  checkpoint(contextId: string, stateDelta: Record<string, unknown>): void {
    const context = this.activeContexts.get(contextId);
    if (!context) {
      return;
    }
    context.stateSnapshot = {
      ...context.stateSnapshot,
      ...stateDelta,
      _checkpointAt: new Date().toISOString()
    };
    const node = this.nodeRegistry.get(context.originatingNode);
    if (node) {
      node.lastCheckpoint = new Date().toISOString();
      node.groundedTruthHash = stableHash(context.stateSnapshot);
    }
    this.logTestimony("CHECKPOINT_SAVED", 0.1);
  }

  getTestimony(): readonly TestimonyEntry[] {
    return [...this.testimonyLog];
  }

  private assessTriage(intent: IntentPayload): TriageLevel {
    const riskScore = this.calculateRisk(intent);
    if (riskScore >= 0.75) {
      return TriageLevel.RED;
    }
    if (riskScore >= 0.4) {
      return TriageLevel.YELLOW;
    }
    return TriageLevel.GREEN;
  }

  private calculateRisk(intent: IntentPayload): number {
    const blob = `${intent.what} ${intent.why}`.toLowerCase();
    let score = 0.1;
    if (/\b(delete|wipe|force|override|root)\b/.test(blob)) {
      score += 0.45;
    }
    if (/\b(payment|zar|invoice|payout)\b/.test(blob)) {
      score += 0.25;
    }
    if (/\b(prod|production|deploy|ship)\b/.test(blob)) {
      score += 0.2;
    }
    if (intent.where.toLowerCase().includes("unknown")) {
      score += 0.15;
    }
    return Math.min(1, score);
  }

  private calculateExpiry(level: TriageLevel): string {
    return new Date(Date.now() + TRIAGE_TTL_MS[level]).toISOString();
  }

  private logTestimony(event: string, friction: number): void {
    this.testimonyLog.push({
      event,
      friction,
      recordedAt: new Date().toISOString()
    });
  }
}

/** Per-node static validation entrypoint — Identic AI calls this first (C1). */
export const SwarmValidator = {
  validateBeforeExecute(intent: IntentPayload, _nodeId: string): boolean {
    validateExecution(intent);

    const intentVectors =
      intent.why.match(/Personal|Work|Relational/g) ?? [];
    if (intentVectors.length === 0) {
      throw new CommandmentBreachError(
        "COMMANDMENT 9",
        "No ecosystem vector identified."
      );
    }

    const unknownVector = intentVectors.some(
      (v) => !ECOSYSTEM_VECTORS.includes(v as (typeof ECOSYSTEM_VECTORS)[number])
    );
    if (unknownVector) {
      throw new CommandmentBreachError(
        "COMMANDMENT 9",
        "Unrecognized ecosystem vector."
      );
    }

    return true;
  }
};
