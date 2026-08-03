/**
 * FTC Agent Room — the finite workflow and its router.
 *
 * Pure logic: no I/O, no provider calls, no persistence. Every rule that
 * decides whether the conversation may advance lives here so it can be tested
 * directly and so no route handler can invent a shortcut around it.
 *
 * The shape of the room:
 *
 *   Investigator -> Reviewer -> (Investigator once) -> Builder -> QA -> Release
 *                                                        ^          |
 *                                                        +----------+  (send back)
 *
 * The agents hand work to each other. Isaac is interrupted only when an agent
 * raises an escalation — a product decision, a genuine choice between valid
 * implementations, a release decision, or an unrecoverable blocker — or when
 * the workflow reaches the release gate, which is always his.
 *
 * Three budgets guarantee the conversation terminates: the review-round cap,
 * the builder-pass cap, and an overall ceiling on automatic hops.
 */

import {
  AGENT_ROOM_MAX_AUTO_HOPS,
  AGENT_ROOM_MAX_BUILDER_PASSES,
  AGENT_ROOM_MAX_REVIEW_ROUNDS,
} from "./config";
import type { AgentRole, Escalation } from "./roles";
import type { OpenAiVerdict, QaVerdict, ReleaseVerdict } from "./schemas";

export type AgentRoomStage =
  /** Task submitted (or more evidence requested); waiting for the Investigator. */
  | "awaiting_investigation"
  | "investigation_ready"
  | "review_ready"
  | "rebuttal_ready"
  | "build_plan_ready"
  | "qa_plan_ready"
  | "release_review_ready"
  /** An agent raised an escalation; the workflow is parked for Isaac. */
  | "awaiting_isaac"
  /** Terminal. */
  | "approved"
  | "rejected"
  | "stopped";

export type AgentRoomAction =
  /** Run whichever agent the router says is next. The only model-invoking action. */
  | "advance"
  /** Isaac answers an escalation; the agents carry on. */
  | "resolve_escalation"
  | "approve_implementation"
  | "request_more_evidence"
  | "reject_diagnosis"
  | "stop"
  /** Write the Executive/Technical summary. Fired automatically at the end. */
  | "generate_summary";

export const AGENT_ROOM_TERMINAL_STAGES: readonly AgentRoomStage[] = [
  "approved",
  "rejected",
  "stopped",
];

export function isTerminalStage(stage: AgentRoomStage): boolean {
  return AGENT_ROOM_TERMINAL_STAGES.includes(stage);
}

export const AGENT_ROOM_MODEL_ACTIONS: readonly AgentRoomAction[] = [
  "advance",
  "generate_summary",
];

export function isModelAction(action: AgentRoomAction): boolean {
  return AGENT_ROOM_MODEL_ACTIONS.includes(action);
}

export type WorkflowState = {
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
};

/* -------------------------------------------------------------------------- */
/* The router                                                                 */
/* -------------------------------------------------------------------------- */

export type RouteDecision = {
  /** The agent to run next, or null when only Isaac can move this forward. */
  role: AgentRole | null;
  /** Why — shown in the UI so the routing is never mysterious. */
  reason: string;
};

/**
 * The single routing rule. Everything that used to be a prompt to Isaac is
 * decided here instead.
 */
export function routeNext(state: WorkflowState): RouteDecision {
  if (isTerminalStage(state.stage)) {
    return { role: null, reason: `This session is ${stageWords(state.stage)}.` };
  }

  if (state.escalation?.required) {
    return {
      role: null,
      reason: "An agent has escalated to you. Answer it and the agents will carry on.",
    };
  }

  if (state.autoHops >= AGENT_ROOM_MAX_AUTO_HOPS) {
    return {
      role: null,
      reason: `The agents have used all ${AGENT_ROOM_MAX_AUTO_HOPS} automatic turns. Decide, ask for more evidence, or stop.`,
    };
  }

  switch (state.stage) {
    case "awaiting_investigation":
      return { role: "investigator", reason: "Nobody has investigated yet." };

    case "investigation_ready":
      return state.reviewRounds < AGENT_ROOM_MAX_REVIEW_ROUNDS
        ? { role: "reviewer", reason: "A diagnosis needs an independent review." }
        : {
            role: "builder",
            reason: "The review rounds are used up; taking the diagnosis to the Builder.",
          };

    case "review_ready":
      if (state.lastReviewVerdict === "AGREE") {
        return { role: "builder", reason: "The reviewer agreed; planning the fix." };
      }

      if (!state.rebuttalUsedForCurrentRound) {
        return {
          role: "investigator",
          reason: "The reviewer pushed back; the Investigator answers once.",
        };
      }

      return state.reviewRounds < AGENT_ROOM_MAX_REVIEW_ROUNDS
        ? { role: "reviewer", reason: "Sending the revised diagnosis back for a second review." }
        : {
            role: "builder",
            reason: "The review rounds are used up; taking the best diagnosis to the Builder.",
          };

    case "rebuttal_ready":
      return state.reviewRounds < AGENT_ROOM_MAX_REVIEW_ROUNDS
        ? { role: "reviewer", reason: "The Investigator has answered; back to the reviewer." }
        : { role: "builder", reason: "The review rounds are used up; planning the fix." };

    case "build_plan_ready":
      return { role: "qa", reason: "A plan needs a verification plan." };

    case "qa_plan_ready":
      if (state.lastQaVerdict === "NEEDS_WORK") {
        return state.builderPasses < AGENT_ROOM_MAX_BUILDER_PASSES
          ? { role: "builder", reason: "QA found gaps; the Builder revises the plan." }
          : {
              role: "release",
              reason: `The Builder has had all ${AGENT_ROOM_MAX_BUILDER_PASSES} passes; taking it to release review anyway.`,
            };
      }

      if (state.lastQaVerdict === "BLOCKED") {
        return {
          role: null,
          reason: "QA reported a blocker it cannot resolve. This one needs you.",
        };
      }

      return { role: "release", reason: "QA is satisfied; assessing release readiness." };

    case "release_review_ready":
      if (
        state.lastReleaseVerdict === "SEND_BACK_TO_BUILDER" &&
        state.builderPasses < AGENT_ROOM_MAX_BUILDER_PASSES
      ) {
        return { role: "builder", reason: "Release review sent this back to the Builder." };
      }

      // A release decision is always Isaac's, by definition. The agents have
      // taken it as far as they are allowed to.
      return {
        role: null,
        reason: "The agents are done. Releasing is your decision.",
      };

    case "awaiting_isaac":
      return { role: null, reason: "Waiting on your answer." };

    default:
      // Terminal stages are returned above; this keeps the function total so a
      // future stage cannot silently fall through to "an agent runs next".
      return { role: null, reason: `This session is ${stageWords(state.stage)}.` };
  }
}

/** The stage a role's reply lands the session in. */
export function stageAfterRole(
  role: AgentRole,
  currentStage: AgentRoomStage,
): AgentRoomStage {
  switch (role) {
    case "investigator":
      // The Investigator plays two parts: the first diagnosis, and the single
      // reply to a review. Which one it just played is decided by where it was.
      return currentStage === "review_ready" ? "rebuttal_ready" : "investigation_ready";
    case "reviewer":
      return "review_ready";
    case "builder":
      return "build_plan_ready";
    case "qa":
      return "qa_plan_ready";
    case "release":
      return "release_review_ready";
    case "summarizer":
      // Summarising never moves the workflow; it describes it.
      return currentStage;
  }
}

/* -------------------------------------------------------------------------- */
/* Action gating                                                              */
/* -------------------------------------------------------------------------- */

export type ActionCheck =
  | { allowed: true; nextStage: AgentRoomStage }
  | { allowed: false; reason: string };

function stageWords(stage: AgentRoomStage): string {
  return stage.replace(/_/g, " ");
}

/**
 * The single gate. Route handlers must call this before doing anything, and
 * must not act when it returns `allowed: false`.
 */
export function checkAction(
  state: WorkflowState,
  action: AgentRoomAction,
): ActionCheck {
  if (isTerminalStage(state.stage)) {
    // The summary is the one thing that may still be written after the end —
    // it is a description of what happened, not a change to it.
    if (action === "generate_summary" && !state.hasSummary) {
      return { allowed: true, nextStage: state.stage };
    }

    return {
      allowed: false,
      reason: `This session is ${stageWords(state.stage)} and cannot be changed. Start a new session.`,
    };
  }

  // Stop is always available on a live session, and is never blocked by a lock,
  // a budget, or a pending escalation.
  if (action === "stop") {
    return { allowed: true, nextStage: "stopped" };
  }

  switch (action) {
    case "advance": {
      if (state.escalation?.required) {
        return {
          allowed: false,
          reason: "Answer the open escalation first — the agents are waiting on you.",
        };
      }

      const route = routeNext(state);

      if (!route.role) {
        return { allowed: false, reason: route.reason };
      }

      return { allowed: true, nextStage: stageAfterRole(route.role, state.stage) };
    }

    case "resolve_escalation":
      if (!state.escalation?.required) {
        return { allowed: false, reason: "There is no open escalation." };
      }
      return { allowed: true, nextStage: previousStageForEscalation(state.stage) };

    case "generate_summary":
      if (state.hasSummary) {
        return { allowed: false, reason: "This session already has a summary." };
      }
      return { allowed: true, nextStage: state.stage };

    case "approve_implementation":
      return { allowed: true, nextStage: "approved" };

    case "reject_diagnosis":
      return { allowed: true, nextStage: "rejected" };

    case "request_more_evidence":
      return { allowed: true, nextStage: "awaiting_investigation" };
  }
}

/**
 * Resolving an escalation returns the session to the stage it was working in.
 * `awaiting_isaac` is only ever reached from an escalation raised alongside a
 * real reply, and that reply's own stage is stored on the session, so the
 * common case is that the stage never changed and this is the identity.
 */
function previousStageForEscalation(stage: AgentRoomStage): AgentRoomStage {
  return stage === "awaiting_isaac" ? "awaiting_investigation" : stage;
}

/**
 * Applies a permitted action. `checkAction` must have allowed it first;
 * this function assumes the guard already ran.
 */
export function applyAction(
  state: WorkflowState,
  action: AgentRoomAction,
  nextStage: AgentRoomStage,
  /** The role that just ran, for `advance`. */
  role: AgentRole | null = null,
): WorkflowState {
  const next: WorkflowState = { ...state, stage: nextStage };

  switch (action) {
    case "advance":
      next.autoHops = state.autoHops + 1;

      if (role === "reviewer") {
        next.reviewRounds = state.reviewRounds + 1;
        next.rebuttalUsedForCurrentRound = false;
      }

      if (role === "investigator" && state.stage === "review_ready") {
        next.rebuttalUsedForCurrentRound = true;
      }

      if (role === "builder") {
        next.builderPasses = state.builderPasses + 1;
      }

      return next;

    case "resolve_escalation":
      // The answer clears the escalation. Budgets are untouched: answering a
      // question must not buy the agents more turns.
      next.escalation = null;
      return next;

    case "request_more_evidence":
      // A fresh investigation clears the pending-reply flag but deliberately
      // keeps every count: asking for evidence must not reset a cap.
      next.rebuttalUsedForCurrentRound = false;
      next.escalation = null;
      return next;

    case "generate_summary":
      next.hasSummary = true;
      return next;

    default:
      return next;
  }
}

export const ALL_AGENT_ROOM_ACTIONS: readonly AgentRoomAction[] = [
  "advance",
  "resolve_escalation",
  "approve_implementation",
  "request_more_evidence",
  "reject_diagnosis",
  "stop",
  "generate_summary",
];

export function isAgentRoomAction(value: unknown): value is AgentRoomAction {
  return (
    typeof value === "string" &&
    (ALL_AGENT_ROOM_ACTIONS as readonly string[]).includes(value)
  );
}

/** Labels used by the UI so button copy and workflow rules cannot drift apart. */
export const AGENT_ROOM_ACTION_LABELS: Record<AgentRoomAction, string> = {
  advance: "Run next step",
  resolve_escalation: "Send answer",
  approve_implementation: "Approve implementation",
  request_more_evidence: "Request more evidence",
  reject_diagnosis: "Reject diagnosis",
  stop: "Stop workflow",
  generate_summary: "Write session summary",
};

export const AGENT_ROOM_STAGE_LABELS: Record<AgentRoomStage, string> = {
  awaiting_investigation: "Awaiting investigation",
  investigation_ready: "Diagnosis ready",
  review_ready: "Independent review ready",
  rebuttal_ready: "Investigator has replied",
  build_plan_ready: "Implementation plan ready",
  qa_plan_ready: "Verification plan ready",
  release_review_ready: "Release review ready — your decision",
  awaiting_isaac: "Waiting on you",
  approved: "Approved for implementation",
  rejected: "Diagnosis rejected",
  stopped: "Stopped",
};
