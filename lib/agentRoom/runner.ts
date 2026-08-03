/**
 * FTC Agent Room — one agent turn.
 *
 * Shared by the single-step and run-to-decision endpoints so the careful part
 * — build payload, call provider, validate, record, apply — exists once. A
 * turn that fails or comes back malformed is recorded and the workflow stage
 * is deliberately left where it was.
 */

import { randomUUID } from "node:crypto";
import { estimateUsdCost } from "./config";
import { buildHandoff } from "./prompts";
import { runHandoff } from "./providers";
import type { AgentRole } from "./roles";
import {
  parseJsonSafely,
  validateBuilderPlan,
  validateClaudeInvestigation,
  validateClaudeRebuttal,
  validateOpenAiReview,
  validateQaPlan,
  validateReleaseAssessment,
  validateSessionSummary,
  type ValidationResult,
} from "./schemas";
import type { AgentRoomSession, AgentRoomTurn, AgentRoomTurnKind } from "./types";
import { applyAction, type AgentRoomAction, type AgentRoomStage } from "./workflow";

export function emptyTurn(
  actor: AgentRoomTurn["actor"],
  kind: AgentRoomTurnKind,
  action: AgentRoomAction | null,
  title: string,
  role: AgentRole | null = null,
): AgentRoomTurn {
  return {
    id: randomUUID(),
    at: new Date().toISOString(),
    actor,
    role,
    kind,
    action,
    title,
    body: null,
    investigation: null,
    review: null,
    rebuttal: null,
    builderPlan: null,
    qaPlan: null,
    releaseAssessment: null,
    summary: null,
    escalation: null,
    stageFrom: null,
    stageTo: null,
    usage: null,
    redactedRules: [],
    promptChars: null,
  };
}

export function appendTurn(session: AgentRoomSession, turn: AgentRoomTurn): void {
  session.transcript.push(turn);
  session.updatedAt = turn.at;

  if (!turn.usage) {
    return;
  }

  session.totals.inputTokens += turn.usage.inputTokens;
  session.totals.outputTokens += turn.usage.outputTokens;
  session.totals.estimatedUsd =
    session.totals.estimatedUsd === null || turn.usage.estimatedUsd === null
      ? null
      : session.totals.estimatedUsd + turn.usage.estimatedUsd;
}

/** The turn kind and title each role produces. */
function turnShapeFor(
  role: AgentRole,
  isRebuttal: boolean,
): { kind: AgentRoomTurnKind; title: string } {
  switch (role) {
    case "investigator":
      return isRebuttal
        ? { kind: "rebuttal", title: "Response to review" }
        : { kind: "investigation", title: "Diagnosis" };
    case "reviewer":
      return { kind: "review", title: "Independent review" };
    case "builder":
      return { kind: "build_plan", title: "Implementation plan" };
    case "qa":
      return { kind: "qa_plan", title: "Verification plan" };
    case "release":
      return { kind: "release_review", title: "Release readiness" };
    case "summarizer":
      return { kind: "summary", title: "Session summary" };
  }
}

function validateFor(
  role: AgentRole,
  isRebuttal: boolean,
  value: unknown,
): ValidationResult<unknown> {
  switch (role) {
    case "investigator":
      return isRebuttal ? validateClaudeRebuttal(value) : validateClaudeInvestigation(value);
    case "reviewer":
      return validateOpenAiReview(value);
    case "builder":
      return validateBuilderPlan(value);
    case "qa":
      return validateQaPlan(value);
    case "release":
      return validateReleaseAssessment(value);
    case "summarizer":
      return validateSessionSummary(value);
  }
}

/** Places a validated reply on the turn under the right field. */
function attachResult(
  turn: AgentRoomTurn,
  role: AgentRole,
  isRebuttal: boolean,
  value: unknown,
): void {
  switch (role) {
    case "investigator":
      if (isRebuttal) {
        turn.rebuttal = value as AgentRoomTurn["rebuttal"];
      } else {
        turn.investigation = value as AgentRoomTurn["investigation"];
      }
      break;
    case "reviewer":
      turn.review = value as AgentRoomTurn["review"];
      break;
    case "builder":
      turn.builderPlan = value as AgentRoomTurn["builderPlan"];
      break;
    case "qa":
      turn.qaPlan = value as AgentRoomTurn["qaPlan"];
      break;
    case "release":
      turn.releaseAssessment = value as AgentRoomTurn["releaseAssessment"];
      break;
    case "summarizer":
      turn.summary = value as AgentRoomTurn["summary"];
      break;
  }

  turn.escalation =
    turn.investigation?.escalation ??
    turn.review?.escalation ??
    turn.rebuttal?.escalation ??
    turn.builderPlan?.escalation ??
    turn.qaPlan?.escalation ??
    turn.releaseAssessment?.escalation ??
    null;
}

export type AgentTurnResult =
  | { ok: true; turn: AgentRoomTurn }
  | { ok: false; turn: AgentRoomTurn; error: string };

/**
 * Runs one agent. Builds the payload, calls the provider, validates the reply,
 * and returns a turn ready to be recorded — success or failure.
 */
export async function executeAgentTurn(
  session: AgentRoomSession,
  role: AgentRole,
  isRebuttal: boolean,
  action: AgentRoomAction,
): Promise<AgentTurnResult> {
  const handoff = buildHandoff(session, role, isRebuttal);
  const actor = handoff.provider === "anthropic" ? "claude" : "openai";
  const shape = turnShapeFor(role, isRebuttal);

  const result = await runHandoff(handoff);

  if (!result.ok) {
    const turn = emptyTurn(actor, "error", action, "Provider error", role);
    turn.body = result.error;
    turn.redactedRules = handoff.redactedRules;
    turn.promptChars = handoff.totalChars;

    return { ok: false, turn, error: result.error };
  }

  const parsed = parseJsonSafely(result.text);
  const validated = parsed.ok ? validateFor(role, isRebuttal, parsed.value) : parsed;

  if (!validated.ok) {
    const turn = emptyTurn(actor, "error", action, "Malformed response", role);
    turn.body = validated.error;
    turn.usage = result.usage;
    turn.redactedRules = handoff.redactedRules;
    turn.promptChars = handoff.totalChars;

    return { ok: false, turn, error: validated.error };
  }

  const turn = emptyTurn(actor, shape.kind, action, shape.title, role);
  attachResult(turn, role, isRebuttal, validated.value);
  turn.usage = result.usage;
  turn.redactedRules = handoff.redactedRules;
  turn.promptChars = handoff.totalChars;

  return { ok: true, turn };
}

/**
 * Records a successful agent turn against the session: the status transition,
 * the verdict the router reads next, and any escalation the agent raised.
 */
export function recordAgentTurn(
  session: AgentRoomSession,
  turn: AgentRoomTurn,
  action: AgentRoomAction,
  nextStage: AgentRoomStage,
  role: AgentRole,
): void {
  turn.stageFrom = session.stage;
  turn.stageTo = nextStage;

  appendTurn(session, turn);
  session.lastCallAt = turn.at;

  Object.assign(session, applyAction(sessionState(session), action, nextStage, role));

  if (turn.review) {
    session.lastReviewVerdict = turn.review.verdict;
  }

  if (turn.qaPlan) {
    session.lastQaVerdict = turn.qaPlan.verdict;
  }

  if (turn.releaseAssessment) {
    session.lastReleaseVerdict = turn.releaseAssessment.verdict;
  }

  // An escalation is the one thing an agent can do that stops the room.
  if (turn.escalation?.required) {
    session.escalation = turn.escalation;
  }
}

/** The workflow slice of a session, in the shape the pure functions expect. */
export function sessionState(session: AgentRoomSession) {
  return {
    stage: session.stage,
    reviewRounds: session.reviewRounds,
    rebuttalUsedForCurrentRound: session.rebuttalUsedForCurrentRound,
    builderPasses: session.builderPasses,
    autoHops: session.autoHops,
    escalation: session.escalation,
    lastReviewVerdict: session.lastReviewVerdict,
    lastQaVerdict: session.lastQaVerdict,
    lastReleaseVerdict: session.lastReleaseVerdict,
    hasSummary: session.hasSummary,
  };
}

/** Records a failed turn without moving the workflow on. */
export function recordFailedTurn(
  session: AgentRoomSession,
  turn: AgentRoomTurn,
): void {
  turn.stageFrom = session.stage;
  turn.stageTo = session.stage;
  appendTurn(session, turn);
  session.lastCallAt = turn.at;
}

/** Recomputes the running cost total after a manual edit. Kept for symmetry. */
export function recomputeTotals(session: AgentRoomSession): void {
  let input = 0;
  let output = 0;
  let usd: number | null = 0;

  for (const turn of session.transcript) {
    if (!turn.usage) {
      continue;
    }

    input += turn.usage.inputTokens;
    output += turn.usage.outputTokens;

    const perTurn =
      turn.usage.estimatedUsd ??
      estimateUsdCost(turn.usage.model, turn.usage.inputTokens, turn.usage.outputTokens);

    usd = usd === null || perTurn === null ? null : usd + perTurn;
  }

  session.totals = { inputTokens: input, outputTokens: output, estimatedUsd: usd };
}
