/**
 * FTC Agent Room — the payload the browser panel receives.
 *
 * Nothing here carries an API key. `anthropicKeyPresent` / `openaiKeyPresent`
 * are booleans derived server-side so the UI can say "no key configured"
 * without the key itself ever crossing the wire.
 */

import {
  AGENT_ROOM_LIMITS,
  AGENT_ROOM_MAX_AUTO_HOPS,
  AGENT_ROOM_MAX_BUILDER_PASSES,
  AGENT_ROOM_MAX_REVIEW_ROUNDS,
  getAnthropicApiKey,
  getAnthropicModel,
  getOpenAiApiKey,
  getOpenAiModel,
} from "./config";
import { buildHandoff } from "./prompts";
import {
  AGENT_ROLE_LABELS,
  providerForRole,
  type AgentRole,
} from "./roles";
import type { AgentRoomSession } from "./types";
import {
  ALL_AGENT_ROOM_ACTIONS,
  checkAction,
  routeNext,
  type AgentRoomAction,
} from "./workflow";

export type AgentRoomActionView = {
  action: AgentRoomAction;
  allowed: boolean;
  reason: string | null;
};

/** What the next agent turn will send, shown before it is sent. */
export type AgentRoomHandoffView = {
  role: AgentRole;
  roleLabel: string;
  provider: "anthropic" | "openai";
  model: string;
  totalChars: number;
  redactedRules: string[];
  truncated: boolean;
  system: string;
  user: string;
};

export type AgentRoomRouteView = {
  role: AgentRole | null;
  roleLabel: string | null;
  reason: string;
  handoff: AgentRoomHandoffView | null;
};

export type AgentRoomConfigView = {
  anthropicModel: string;
  openaiModel: string;
  anthropicKeyPresent: boolean;
  openaiKeyPresent: boolean;
  maxReviewRounds: number;
  maxBuilderPasses: number;
  maxAutoHops: number;
  maxPromptChars: number;
  maxRequestBytes: number;
  roleProviders: Record<AgentRole, "anthropic" | "openai">;
};

export type AgentRoomSessionView = {
  session: AgentRoomSession;
  actions: AgentRoomActionView[];
  route: AgentRoomRouteView;
  config: AgentRoomConfigView;
};

function modelFor(provider: "anthropic" | "openai"): string {
  return provider === "anthropic" ? getAnthropicModel() : getOpenAiModel();
}

export function buildConfigView(): AgentRoomConfigView {
  const roleProviders = {} as Record<AgentRole, "anthropic" | "openai">;

  for (const role of [
    "investigator",
    "reviewer",
    "builder",
    "qa",
    "release",
    "summarizer",
  ] as const) {
    roleProviders[role] = providerForRole(role);
  }

  return {
    anthropicModel: getAnthropicModel(),
    openaiModel: getOpenAiModel(),
    anthropicKeyPresent: getAnthropicApiKey() !== null,
    openaiKeyPresent: getOpenAiApiKey() !== null,
    maxReviewRounds: AGENT_ROOM_MAX_REVIEW_ROUNDS,
    maxBuilderPasses: AGENT_ROOM_MAX_BUILDER_PASSES,
    maxAutoHops: AGENT_ROOM_MAX_AUTO_HOPS,
    maxPromptChars: AGENT_ROOM_LIMITS.maxPromptChars,
    maxRequestBytes: AGENT_ROOM_LIMITS.maxRequestBytes,
    roleProviders,
  };
}

export function workflowStateOf(session: AgentRoomSession) {
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

export function buildSessionView(session: AgentRoomSession): AgentRoomSessionView {
  const state = workflowStateOf(session);
  const route = routeNext(state);

  const actions: AgentRoomActionView[] = ALL_AGENT_ROOM_ACTIONS.map((action) => {
    const check = checkAction(state, action);

    return check.allowed
      ? { action, allowed: true, reason: null }
      : { action, allowed: false, reason: check.reason };
  });

  let handoff: AgentRoomHandoffView | null = null;

  if (route.role) {
    const isRebuttal = route.role === "investigator" && session.stage === "review_ready";
    const built = buildHandoff(session, route.role, isRebuttal);

    handoff = {
      role: built.role,
      roleLabel: AGENT_ROLE_LABELS[built.role],
      provider: built.provider,
      model: modelFor(built.provider),
      totalChars: built.totalChars,
      redactedRules: built.redactedRules,
      truncated: built.truncated,
      system: built.system,
      user: built.user,
    };
  }

  return {
    session,
    actions,
    route: {
      role: route.role,
      roleLabel: route.role ? AGENT_ROLE_LABELS[route.role] : null,
      reason: route.reason,
      handoff,
    },
    config: buildConfigView(),
  };
}
