/**
 * FTC Agent Room — shared session shapes.
 *
 * Types only, no imports with side effects: the browser panel and the server
 * both read this file, so it must stay free of `node:fs` and provider SDKs.
 */

import type { AgentRoomAction, AgentRoomStage } from "./workflow";
import type { AgentRole, Escalation } from "./roles";
import type {
  BuilderPlan,
  ClaudeInvestigation,
  ClaudeRebuttal,
  OpenAiReview,
  OpenAiVerdict,
  QaPlan,
  QaVerdict,
  ReleaseAssessment,
  ReleaseVerdict,
  SessionSummary,
} from "./schemas";

export type AgentRoomProvider = "anthropic" | "openai";

export type AgentRoomEvidenceKind = "note" | "file" | "diff" | "search";

export type AgentRoomEvidence = {
  id: string;
  kind: AgentRoomEvidenceKind;
  /** Human label, e.g. `lib/dm/chatMessageGroupLayout.ts:1-80`. */
  label: string;
  /** Already redacted at the moment of capture. */
  content: string;
  createdAt: string;
  redactedRules: string[];
};

export type AgentRoomUsage = {
  provider: AgentRoomProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** Null when we have no rate for the model rather than a guessed figure. */
  estimatedUsd: number | null;
  durationMs: number;
};

export type AgentRoomTurnKind =
  | "task"
  | "investigation"
  | "review"
  | "rebuttal"
  | "build_plan"
  | "qa_plan"
  | "release_review"
  | "summary"
  | "escalation"
  | "escalation_answer"
  | "handoff"
  | "decision"
  | "error";

/**
 * One row in the timeline. Everything the room does — an agent speaking, a
 * status change, a handoff, Isaac deciding — is a turn, so the thread reads
 * chronologically with no side channel.
 */
export type AgentRoomTurn = {
  id: string;
  at: string;
  actor: "isaac" | "claude" | "openai" | "system";
  /** Null for Isaac and for pure status rows. */
  role: AgentRole | null;
  kind: AgentRoomTurnKind;
  action: AgentRoomAction | null;
  title: string;
  /** Plain-text body for decisions, handoffs, errors and the opening task. */
  body: string | null;

  investigation: ClaudeInvestigation | null;
  review: OpenAiReview | null;
  rebuttal: ClaudeRebuttal | null;
  builderPlan: BuilderPlan | null;
  qaPlan: QaPlan | null;
  releaseAssessment: ReleaseAssessment | null;
  summary: SessionSummary | null;
  escalation: Escalation | null;

  /** Status transition recorded on the turn that caused it. */
  stageFrom: AgentRoomStage | null;
  stageTo: AgentRoomStage | null;

  usage: AgentRoomUsage | null;
  /** Redaction rules that fired on the prompt for this turn. */
  redactedRules: string[];
  /** Size of the payload that produced this turn, for the audit trail. */
  promptChars: number | null;
};

export type AgentRoomSession = {
  id: string;
  createdAt: string;
  updatedAt: string;

  title: string;
  description: string;
  branch: string;
  contextNotes: string;
  evidence: AgentRoomEvidence[];

  stage: AgentRoomStage;
  reviewRounds: number;
  rebuttalUsedForCurrentRound: boolean;
  builderPasses: number;
  autoHops: number;
  escalation: Escalation | null;
  lastReviewVerdict: OpenAiVerdict | null;
  lastQaVerdict: QaVerdict | null;
  lastReleaseVerdict: ReleaseVerdict | null;
  hasSummary: boolean;

  /**
   * "auto" runs the agents straight through and only stops for an escalation
   * or a decision. "manual" restores the per-handoff approval prompt.
   */
  handoffApproval: "auto" | "manual";

  /**
   * Manual mode only: set when Isaac approves the next handoff, and cleared the
   * moment it is spent, so one approval buys exactly one agent turn. `advance`
   * is refused while this is null. A session file written before this field
   * existed parses as `undefined`, which is falsy — so the guard fails closed.
   */
  handoffApprovedAt: string | null;

  transcript: AgentRoomTurn[];

  /** Timestamp of the last provider call, for the per-session rate limit. */
  lastCallAt: string | null;

  totals: {
    inputTokens: number;
    outputTokens: number;
    /** Null when any model in the session has no known rate. */
    estimatedUsd: number | null;
  };
};

export type AgentRoomSessionSummary = {
  id: string;
  title: string;
  stage: AgentRoomStage;
  createdAt: string;
  updatedAt: string;
  needsIsaac: boolean;
};

export function toSessionSummary(
  session: AgentRoomSession,
): AgentRoomSessionSummary {
  return {
    id: session.id,
    title: session.title,
    stage: session.stage,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    needsIsaac: session.escalation?.required === true,
  };
}

/* -------------------------------------------------------------------------- */
/* Decision Log                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The durable record of a completed investigation. Written automatically from
 * the session summary; the two fields Agent Room genuinely cannot know —
 * which commits carried the fix, and what happened at release — are left for
 * Isaac to fill in rather than invented.
 */
export type DecisionLogRecord = {
  id: string;
  sessionId: string;
  timestamp: string;
  issueTitle: string;
  participatingAgents: AgentRole[];
  rootCause: string;
  evidenceSummary: string;
  finalDecision: string;
  /** Isaac-supplied. Agent Room has no git access and does not guess. */
  implementationCommits: string[];
  verificationPerformed: string;
  /** Isaac-supplied. */
  releaseOutcome: string;
  followUpItems: string[];
  /** Denormalised for search without loading every session. */
  branch: string;
  stage: AgentRoomStage;
};

export type DecisionLogPatch = {
  implementationCommits?: string[];
  releaseOutcome?: string;
  followUpItems?: string[];
};
