/**
 * FTC Agent Room — the agents in the room.
 *
 * Every role here is a *conversational* role. They investigate, review, plan
 * and assess; none of them edits code, runs a command, touches git, executes
 * SQL, or deploys. A Builder in this room produces an implementation plan for
 * a human to carry out through the normal worktree workflow — it does not
 * build. That boundary is the whole point of the tool and is enforced by the
 * fact that no role is ever handed a tool (see prompts.ts and providers.ts).
 *
 * Provider assignment lives in one table so a role can be moved between
 * providers without touching a prompt or a route.
 */

export type AgentRole =
  | "investigator"
  | "reviewer"
  | "builder"
  | "qa"
  | "release"
  | "summarizer";

export type AgentProvider = "anthropic" | "openai";

export const ALL_AGENT_ROLES: readonly AgentRole[] = [
  "investigator",
  "reviewer",
  "builder",
  "qa",
  "release",
  "summarizer",
];

/**
 * Roles alternate between providers on purpose. The Reviewer must not be the
 * same model that wrote the report it is reviewing, and QA must not be the
 * same model that wrote the plan it is testing — an independent challenge from
 * the same model is not independent.
 */
const ROLE_PROVIDERS: Record<AgentRole, AgentProvider> = {
  investigator: "anthropic",
  reviewer: "openai",
  builder: "anthropic",
  qa: "openai",
  release: "anthropic",
  summarizer: "anthropic",
};

export function providerForRole(role: AgentRole): AgentProvider {
  return ROLE_PROVIDERS[role];
}

export const AGENT_ROLE_LABELS: Record<AgentRole, string> = {
  investigator: "Investigator",
  reviewer: "Independent Reviewer",
  builder: "Builder",
  qa: "QA Reviewer",
  release: "Release Agent",
  summarizer: "Session Summary",
};

/** Two-letter marker used by the timeline so rows are scannable at 390px. */
export const AGENT_ROLE_INITIALS: Record<AgentRole, string> = {
  investigator: "IN",
  reviewer: "RV",
  builder: "BL",
  qa: "QA",
  release: "RL",
  summarizer: "SU",
};

export function isAgentRole(value: unknown): value is AgentRole {
  return typeof value === "string" && (ALL_AGENT_ROLES as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* Escalation — the only thing that interrupts Isaac                          */
/* -------------------------------------------------------------------------- */

export type EscalationType =
  | "none"
  | "product_decision"
  | "implementation_choice"
  | "release_decision"
  | "blocker";

export const ESCALATION_TYPES: readonly EscalationType[] = [
  "none",
  "product_decision",
  "implementation_choice",
  "release_decision",
  "blocker",
];

export const ESCALATION_LABELS: Record<EscalationType, string> = {
  none: "No escalation",
  product_decision: "Product decision",
  implementation_choice: "Multiple valid implementations",
  release_decision: "Release decision",
  blocker: "Unrecoverable blocker",
};

export type Escalation = {
  required: boolean;
  type: EscalationType;
  question: string;
  options: string[];
};

export function isEscalationType(value: unknown): value is EscalationType {
  return (
    typeof value === "string" && (ESCALATION_TYPES as readonly string[]).includes(value)
  );
}

/**
 * The four conditions, written once and quoted verbatim into every role's
 * system prompt. If an agent cannot map its problem onto one of these, it must
 * settle the matter with the other agents rather than stopping the workflow.
 */
export const ESCALATION_CONTRACT = [
  "Escalate to Isaac ONLY when one of these is true:",
  "(1) product_decision — the answer depends on what FTC should do for its users, not on what the code does.",
  "(2) implementation_choice — two or more approaches are genuinely defensible and the choice is a judgement call, not a correctness question.",
  "(3) release_decision — something is about to reach real users.",
  "(4) blocker — you cannot proceed and no other agent in this room can unblock you.",
  "Everything else you resolve with the other agents. Missing evidence is not a blocker if another agent can supply it; disagreement is not a blocker if the evidence can settle it; uncertainty is not a blocker, it is something you state plainly and carry forward.",
  "When you do escalate, ask one specific question and list the concrete options. Do not escalate to ask permission to continue.",
].join(" ");
