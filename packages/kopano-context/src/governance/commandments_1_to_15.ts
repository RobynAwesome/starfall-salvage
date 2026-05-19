/**
 * Immutable Law — baseline enumeration for Kopano Context governance.
 * Policy is law; workers are processors (C1).
 */

export const Commandment = {
  C1_HIERARCHY_OF_SUBMISSION:
    "God -> Architect -> MAO. Policy is Law. Workers are processors.",
  C2_TRUTH_BRIDGE:
    "Verified data residency within SA borders. No hallucinated stats.",
  C3_GROUNDED_TRUTH:
    "Strict adherence to the verified DB. Pavement reality over cloud assumptions.",
  C4_MEXICAN_SHORTHAND:
    "Execute the 4 W's: Who, What, Where, Why. Identify the middleman.",
  C5_FIVE_PILLARS:
    "Alignment, Community, Infrastructure, Apprenticeship, Service.",
  C6_RIGHTEOUS_WAGE:
    "Deterministic valuation via Laplace transforms. Protect the ZAR.",
  C7_JETHRO_TRIAGE:
    "Escalate via Green (Auto), Yellow (Admin), and Red (Robyn).",
  C8_WWJD_FIREWALL:
    "Intent-based Zero Trust. Filter the 'Why' before any bit touches the metal.",
  C9_IN_LIFE_DAEMON:
    "Acknowledge the Three-Vector ecosystem constraints (Personal, Work, Relational).",
  C10_SOVEREIGN_STANDARD:
    "Refusal of Walled Garden labels. Build Classics, not Aesthetic Apps.",
  C11_NEHEMIAH_GATE: "Secure API border control. Keep the Hand on the Sword.",
  C12_OFFLINE_FIRST:
    "Membrane 1.2. Architecture must hold even during load shedding.",
  C13_AGENTIC_SELF_CORRECTION:
    "Halt execution on boundary breach. Save state. Do not drop context.",
  C14_MPS_ALLOCATION:
    "Multithreaded execution across isolated nodes. Code switch without root corruption.",
  C15_TESTIMONY: "Log the Grounded Truth. Do not mask the 20% friction."
} as const;

export type Commandment = (typeof Commandment)[keyof typeof Commandment];

export const ALL_COMMANDMENTS: readonly Commandment[] = Object.values(Commandment);

export interface IntentPayload {
  who: string;
  what: string;
  where: string;
  why: string;
}

export class CommandmentBreachError extends Error {
  readonly commandment: string;

  constructor(commandment: string, detail: string) {
    super(`[${commandment} BREACH]: ${detail}`);
    this.name = "CommandmentBreachError";
    this.commandment = commandment;
  }
}

export const validateExecution = (intent: IntentPayload): boolean => {
  const missing = (["who", "what", "where", "why"] as const).filter(
    (key) => !String(intent[key] ?? "").trim()
  );
  if (missing.length > 0) {
    throw new CommandmentBreachError(
      "COMMANDMENT 4",
      `Incomplete Mexican Shorthand (${missing.join(", ")}).`
    );
  }
  return true;
};
