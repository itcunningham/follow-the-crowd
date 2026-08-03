/**
 * FTC Agent Room — shared session shapes.
 *
 * Types only, no imports with side effects: the browser panel and the server
 * both read this file, so it must stay free of `node:fs` and provider SDKs.
 */

import type { AgentRoomAction, AgentRoomStage } from "./workflow";
import type { ClaudeInvestigation, ClaudeRebuttal, OpenAiReview } from "./schemas";

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
  | "decision"
  | "error";

export type AgentRoomTurn = {
  id: string;
  at: string;
  actor: "isaac" | "claude" | "openai";
  kind: AgentRoomTurnKind;
  action: AgentRoomAction | null;
  title: string;
  /** Plain-text body for decisions, errors and the opening task. */
  body: string | null;
  investigation: ClaudeInvestigation | null;
  review: OpenAiReview | null;
  rebuttal: ClaudeRebuttal | null;
  usage: AgentRoomUsage | null;
  /** Redaction rules that fired on the prompt for this turn. */
  redactedRules: string[];
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
  };
}
