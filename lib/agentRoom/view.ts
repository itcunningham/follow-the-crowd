/**
 * FTC Agent Room — the payload the browser panel receives.
 *
 * Nothing here carries an API key. `anthropicKeyPresent` / `openaiKeyPresent`
 * are booleans derived server-side so the UI can say "no key configured"
 * without the key itself ever crossing the wire.
 */

import {
  AGENT_ROOM_LIMITS,
  AGENT_ROOM_MAX_REVIEW_ROUNDS,
  getAnthropicApiKey,
  getAnthropicModel,
  getOpenAiApiKey,
  getOpenAiModel,
} from "./config";
import { buildHandoff } from "./prompts";
import type { AgentRoomSession } from "./types";
import {
  ALL_AGENT_ROOM_ACTIONS,
  checkAction,
  isModelAction,
  type AgentRoomAction,
} from "./workflow";

export type AgentRoomActionView = {
  action: AgentRoomAction;
  allowed: boolean;
  reason: string | null;
  /** Present only for allowed provider calls — this is the approval checkpoint. */
  handoff: {
    provider: "anthropic" | "openai";
    model: string;
    totalChars: number;
    redactedRules: string[];
    truncated: boolean;
    system: string;
    user: string;
  } | null;
};

export type AgentRoomConfigView = {
  anthropicModel: string;
  openaiModel: string;
  anthropicKeyPresent: boolean;
  openaiKeyPresent: boolean;
  maxReviewRounds: number;
  maxPromptChars: number;
  maxRequestBytes: number;
};

export type AgentRoomSessionView = {
  session: AgentRoomSession;
  actions: AgentRoomActionView[];
  config: AgentRoomConfigView;
};

export function buildConfigView(): AgentRoomConfigView {
  return {
    anthropicModel: getAnthropicModel(),
    openaiModel: getOpenAiModel(),
    anthropicKeyPresent: getAnthropicApiKey() !== null,
    openaiKeyPresent: getOpenAiApiKey() !== null,
    maxReviewRounds: AGENT_ROOM_MAX_REVIEW_ROUNDS,
    maxPromptChars: AGENT_ROOM_LIMITS.maxPromptChars,
    maxRequestBytes: AGENT_ROOM_LIMITS.maxRequestBytes,
  };
}

export function buildSessionView(session: AgentRoomSession): AgentRoomSessionView {
  const state = {
    stage: session.stage,
    reviewRounds: session.reviewRounds,
    rebuttalUsedForCurrentRound: session.rebuttalUsedForCurrentRound,
  };

  const actions: AgentRoomActionView[] = ALL_AGENT_ROOM_ACTIONS.map((action) => {
    const check = checkAction(state, action);

    if (!check.allowed) {
      return { action, allowed: false, reason: check.reason, handoff: null };
    }

    if (!isModelAction(action)) {
      return { action, allowed: true, reason: null, handoff: null };
    }

    const handoff = buildHandoff(session, action);

    return {
      action,
      allowed: true,
      reason: null,
      handoff: handoff
        ? {
            provider: handoff.provider,
            model:
              handoff.provider === "anthropic" ? getAnthropicModel() : getOpenAiModel(),
            totalChars: handoff.totalChars,
            redactedRules: handoff.redactedRules,
            truncated: handoff.truncated,
            system: handoff.system,
            user: handoff.user,
          }
        : null,
    };
  });

  return { session, actions, config: buildConfigView() };
}
