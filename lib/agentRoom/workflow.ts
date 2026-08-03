/**
 * FTC Agent Room — the finite workflow.
 *
 * Pure logic: no I/O, no provider calls, no persistence. Every rule that
 * decides whether the conversation may advance lives here so it can be tested
 * directly and so no route handler can invent a shortcut around it.
 *
 * The rules, restated:
 *   1. Isaac submits the task.
 *   2. Claude investigates.
 *   3. OpenAI reviews independently and returns exactly one verdict.
 *   4. Claude may respond to that review once.
 *   5. The workflow then stops for Isaac's decision.
 *   6. At most AGENT_ROOM_MAX_REVIEW_ROUNDS model-to-model review rounds.
 *   7. Nothing is implemented until Isaac explicitly approves.
 */

import { AGENT_ROOM_MAX_REVIEW_ROUNDS } from "./config";

export type AgentRoomStage =
  /** Task submitted (or more evidence requested); waiting for Claude to investigate. */
  | "awaiting_investigation"
  /** Claude has produced a diagnosis; waiting on Isaac. */
  | "investigation_ready"
  /** OpenAI has returned a verdict; waiting on Isaac. */
  | "review_ready"
  /** Claude has answered the review once; the workflow is parked for Isaac's decision. */
  | "rebuttal_ready"
  /** Terminal. */
  | "approved"
  | "rejected"
  | "stopped";

export type AgentRoomAction =
  | "start_investigation"
  | "send_to_openai"
  | "send_review_to_claude"
  | "approve_implementation"
  | "request_more_evidence"
  | "reject_diagnosis"
  | "stop";

export const AGENT_ROOM_TERMINAL_STAGES: readonly AgentRoomStage[] = [
  "approved",
  "rejected",
  "stopped",
];

export function isTerminalStage(stage: AgentRoomStage): boolean {
  return AGENT_ROOM_TERMINAL_STAGES.includes(stage);
}

/** Actions that cause a provider request. Everything else is a local decision. */
export const AGENT_ROOM_MODEL_ACTIONS: readonly AgentRoomAction[] = [
  "start_investigation",
  "send_to_openai",
  "send_review_to_claude",
];

export function isModelAction(action: AgentRoomAction): boolean {
  return AGENT_ROOM_MODEL_ACTIONS.includes(action);
}

export function actionProvider(
  action: AgentRoomAction,
): "anthropic" | "openai" | null {
  switch (action) {
    case "start_investigation":
    case "send_review_to_claude":
      return "anthropic";
    case "send_to_openai":
      return "openai";
    default:
      return null;
  }
}

export type WorkflowState = {
  stage: AgentRoomStage;
  /** Completed or in-flight model-to-model review rounds. */
  reviewRounds: number;
  /** Whether Claude has already answered the current review. One reply per review. */
  rebuttalUsedForCurrentRound: boolean;
};

export type ActionCheck =
  | { allowed: true; nextStage: AgentRoomStage }
  | { allowed: false; reason: string };

/**
 * The single gate. Route handlers must call this before doing anything, and
 * must not act when it returns `allowed: false`.
 */
export function checkAction(
  state: WorkflowState,
  action: AgentRoomAction,
): ActionCheck {
  if (isTerminalStage(state.stage)) {
    return {
      allowed: false,
      reason: `This session is ${state.stage.replace("_", " ")} and cannot be changed. Start a new session.`,
    };
  }

  // Stop is always available on a live session, and is never blocked by a lock,
  // a round count, or a pending decision.
  if (action === "stop") {
    return { allowed: true, nextStage: "stopped" };
  }

  switch (action) {
    case "start_investigation":
      if (state.stage !== "awaiting_investigation") {
        return {
          allowed: false,
          reason: "Claude has already investigated. Request more evidence to re-run the investigation.",
        };
      }
      return { allowed: true, nextStage: "investigation_ready" };

    case "send_to_openai":
      if (state.stage !== "investigation_ready" && state.stage !== "rebuttal_ready") {
        return {
          allowed: false,
          reason: "There is no Claude report waiting to be reviewed.",
        };
      }
      if (state.reviewRounds >= AGENT_ROOM_MAX_REVIEW_ROUNDS) {
        return {
          allowed: false,
          reason: `The review-round limit of ${AGENT_ROOM_MAX_REVIEW_ROUNDS} has been reached. Decide, request more evidence, or stop.`,
        };
      }
      return { allowed: true, nextStage: "review_ready" };

    case "send_review_to_claude":
      if (state.stage !== "review_ready") {
        return {
          allowed: false,
          reason: "There is no OpenAI review waiting for a response.",
        };
      }
      if (state.rebuttalUsedForCurrentRound) {
        return {
          allowed: false,
          reason: "Claude has already answered this review. One reply per review round.",
        };
      }
      return { allowed: true, nextStage: "rebuttal_ready" };

    case "approve_implementation":
      return { allowed: true, nextStage: "approved" };

    case "reject_diagnosis":
      return { allowed: true, nextStage: "rejected" };

    case "request_more_evidence":
      return { allowed: true, nextStage: "awaiting_investigation" };
  }
}

/**
 * Applies a permitted action. `checkAction` must have allowed it first;
 * this function assumes the guard already ran.
 */
export function applyAction(
  state: WorkflowState,
  action: AgentRoomAction,
  nextStage: AgentRoomStage,
): WorkflowState {
  switch (action) {
    case "send_to_openai":
      return {
        stage: nextStage,
        reviewRounds: state.reviewRounds + 1,
        rebuttalUsedForCurrentRound: false,
      };

    case "send_review_to_claude":
      return {
        stage: nextStage,
        reviewRounds: state.reviewRounds,
        rebuttalUsedForCurrentRound: true,
      };

    case "request_more_evidence":
      // A fresh investigation clears the pending-reply flag but deliberately
      // keeps the round count: requesting evidence must not reset the cap.
      return {
        stage: nextStage,
        reviewRounds: state.reviewRounds,
        rebuttalUsedForCurrentRound: false,
      };

    default:
      return {
        stage: nextStage,
        reviewRounds: state.reviewRounds,
        rebuttalUsedForCurrentRound: state.rebuttalUsedForCurrentRound,
      };
  }
}

export const ALL_AGENT_ROOM_ACTIONS: readonly AgentRoomAction[] = [
  "start_investigation",
  "send_to_openai",
  "send_review_to_claude",
  "approve_implementation",
  "request_more_evidence",
  "reject_diagnosis",
  "stop",
];

export function isAgentRoomAction(value: unknown): value is AgentRoomAction {
  return (
    typeof value === "string" &&
    (ALL_AGENT_ROOM_ACTIONS as readonly string[]).includes(value)
  );
}

/** Labels used by the UI so button copy and workflow rules cannot drift apart. */
export const AGENT_ROOM_ACTION_LABELS: Record<AgentRoomAction, string> = {
  start_investigation: "Start investigation",
  send_to_openai: "Send Claude's diagnosis to OpenAI",
  send_review_to_claude: "Send OpenAI's challenge back to Claude",
  approve_implementation: "Approve implementation",
  request_more_evidence: "Request more evidence",
  reject_diagnosis: "Reject diagnosis",
  stop: "Stop workflow",
};

export const AGENT_ROOM_STAGE_LABELS: Record<AgentRoomStage, string> = {
  awaiting_investigation: "Awaiting Claude investigation",
  investigation_ready: "Claude diagnosis ready — your call",
  review_ready: "OpenAI review ready — your call",
  rebuttal_ready: "Claude has replied — your decision",
  approved: "Approved for implementation",
  rejected: "Diagnosis rejected",
  stopped: "Stopped",
};
