/**
 * FTC Agent Room — advance the workflow by exactly one step.
 *
 * This is the only endpoint that talks to a model provider, and it never does
 * so on its own initiative: every provider call is one Isaac click, gated by
 * `checkAction`, a per-session execution lock, and a rate limit.
 *
 * Approving implementation records a decision and nothing else. No code is
 * written, staged, committed or run from here — implementation continues
 * through the normal Claude worktree workflow.
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { AGENT_ROOM_LIMITS } from "@/lib/agentRoom/config";
import {
  agentRoomDisabledResponse,
  badRequest,
  clampField,
  notFound,
  readField,
  readJsonBody,
} from "@/lib/agentRoom/apiGuard";
import { buildHandoff } from "@/lib/agentRoom/prompts";
import { runHandoff } from "@/lib/agentRoom/providers";
import {
  parseJsonSafely,
  validateClaudeInvestigation,
  validateClaudeRebuttal,
  validateOpenAiReview,
} from "@/lib/agentRoom/schemas";
import {
  acquireSessionLock,
  loadSession,
  millisecondsUntilNextCallAllowed,
  releaseSessionLock,
  saveSession,
} from "@/lib/agentRoom/sessionStore";
import type { AgentRoomSession, AgentRoomTurn } from "@/lib/agentRoom/types";
import { buildSessionView } from "@/lib/agentRoom/view";
import {
  AGENT_ROOM_ACTION_LABELS,
  applyAction,
  checkAction,
  isAgentRoomAction,
  isModelAction,
  isTerminalStage,
  type AgentRoomAction,
} from "@/lib/agentRoom/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appendTurn(session: AgentRoomSession, turn: AgentRoomTurn): void {
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

function emptyTurn(
  actor: AgentRoomTurn["actor"],
  kind: AgentRoomTurn["kind"],
  action: AgentRoomAction | null,
  title: string,
): AgentRoomTurn {
  return {
    id: randomUUID(),
    at: new Date().toISOString(),
    actor,
    kind,
    action,
    title,
    body: null,
    investigation: null,
    review: null,
    rebuttal: null,
    usage: null,
    redactedRules: [],
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const disabled = agentRoomDisabledResponse();

  if (disabled) {
    return disabled;
  }

  const { sessionId } = await context.params;
  const body = await readJsonBody(request);

  if (!body.ok) {
    return body.response;
  }

  const action = readField(body.value, "action");

  if (!isAgentRoomAction(action)) {
    return badRequest("Unknown action.");
  }

  const note = clampField(readField(body.value, "note"), AGENT_ROOM_LIMITS.maxNoteChars);

  if (!note.ok) {
    return badRequest(note.error);
  }

  const session = await loadSession(sessionId);

  if (!session) {
    return notFound();
  }

  const check = checkAction(
    {
      stage: session.stage,
      reviewRounds: session.reviewRounds,
      rebuttalUsedForCurrentRound: session.rebuttalUsedForCurrentRound,
    },
    action,
  );

  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 409 });
  }

  /* ---------------------------------------------------------------------- */
  /* Local decisions — no provider call, no repository change                */
  /* ---------------------------------------------------------------------- */

  if (!isModelAction(action)) {
    const turn = emptyTurn("isaac", "decision", action, AGENT_ROOM_ACTION_LABELS[action]);
    turn.body = note.value || null;

    appendTurn(session, turn);
    Object.assign(session, applyAction(session, action, check.nextStage));
    await saveSession(session);

    return NextResponse.json(buildSessionView(session));
  }

  /* ---------------------------------------------------------------------- */
  /* Provider calls — locked, rate limited, one at a time                     */
  /* ---------------------------------------------------------------------- */

  const waitMs = millisecondsUntilNextCallAllowed(session.lastCallAt);

  if (waitMs > 0) {
    return NextResponse.json(
      {
        error: `Give it another ${Math.ceil(waitMs / 1000)}s before the next provider call.`,
      },
      { status: 429 },
    );
  }

  if (!acquireSessionLock(sessionId)) {
    return NextResponse.json(
      { error: "This session already has a provider call running." },
      { status: 409 },
    );
  }

  try {
    const handoff = buildHandoff(session, action);

    if (!handoff) {
      return badRequest("There is nothing to send for that action.");
    }

    const result = await runHandoff(handoff);

    // Isaac may have hit STOP while this was in flight. Re-read from disk:
    // a terminal session wins, and the provider result is discarded.
    const current = await loadSession(sessionId);

    if (!current) {
      return notFound();
    }

    if (isTerminalStage(current.stage)) {
      return NextResponse.json({
        ...buildSessionView(current),
        notice:
          "The workflow was stopped while that request was in flight. The reply was discarded.",
      });
    }

    // Decisions are not lock-protected, so re-check against the state on disk:
    // if Isaac moved the workflow while this was in flight, the reply is stale.
    const recheck = checkAction(
      {
        stage: current.stage,
        reviewRounds: current.reviewRounds,
        rebuttalUsedForCurrentRound: current.rebuttalUsedForCurrentRound,
      },
      action,
    );

    if (!recheck.allowed) {
      return NextResponse.json({
        ...buildSessionView(current),
        notice: `The workflow moved on while that request was in flight, so the reply was discarded. ${recheck.reason}`,
      });
    }

    if (!result.ok) {
      const turn = emptyTurn(
        handoff.provider === "anthropic" ? "claude" : "openai",
        "error",
        action,
        "Provider error",
      );
      turn.body = result.error;
      turn.redactedRules = handoff.redactedRules;

      appendTurn(current, turn);
      current.lastCallAt = turn.at;
      await saveSession(current);

      return NextResponse.json(
        { ...buildSessionView(current), error: result.error },
        { status: 502 },
      );
    }

    const parsed = parseJsonSafely(result.text);
    const validated = parsed.ok
      ? action === "start_investigation"
        ? validateClaudeInvestigation(parsed.value)
        : action === "send_to_openai"
          ? validateOpenAiReview(parsed.value)
          : validateClaudeRebuttal(parsed.value)
      : parsed;

    if (!validated.ok) {
      // A malformed reply costs tokens and must be recorded, but it must never
      // advance the workflow — the stage is deliberately left where it was.
      const turn = emptyTurn(
        handoff.provider === "anthropic" ? "claude" : "openai",
        "error",
        action,
        "Malformed response",
      );
      turn.body = validated.error;
      turn.usage = result.usage;
      turn.redactedRules = handoff.redactedRules;

      appendTurn(current, turn);
      current.lastCallAt = turn.at;
      await saveSession(current);

      return NextResponse.json(
        { ...buildSessionView(current), error: validated.error },
        { status: 502 },
      );
    }

    const turn = emptyTurn(
      handoff.provider === "anthropic" ? "claude" : "openai",
      action === "start_investigation"
        ? "investigation"
        : action === "send_to_openai"
          ? "review"
          : "rebuttal",
      action,
      action === "start_investigation"
        ? "Diagnosis"
        : action === "send_to_openai"
          ? "Independent review"
          : "Response to review",
    );

    if (action === "start_investigation") {
      turn.investigation = validated.value as AgentRoomTurn["investigation"];
    } else if (action === "send_to_openai") {
      turn.review = validated.value as AgentRoomTurn["review"];
    } else {
      turn.rebuttal = validated.value as AgentRoomTurn["rebuttal"];
    }

    turn.usage = result.usage;
    turn.redactedRules = handoff.redactedRules;

    appendTurn(current, turn);
    current.lastCallAt = turn.at;
    Object.assign(current, applyAction(current, action, recheck.nextStage));
    await saveSession(current);

    return NextResponse.json(buildSessionView(current));
  } finally {
    releaseSessionLock(sessionId);
  }
}
