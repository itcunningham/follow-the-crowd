/**
 * FTC Agent Room — advance the workflow by exactly one step.
 *
 * `advance` runs whichever agent the router names; every other action is a
 * local decision by Isaac. Nothing here writes code, runs a command, touches
 * git, executes SQL or deploys — approving implementation records a decision
 * and stops, and implementation continues through FTC's normal worktree
 * workflow.
 */

import { NextResponse } from "next/server";
import { AGENT_ROOM_LIMITS } from "@/lib/agentRoom/config";
import {
  agentRoomDisabledResponse,
  badRequest,
  clampField,
  notFound,
  readField,
  readJsonBody,
} from "@/lib/agentRoom/apiGuard";
import { finalizeSession } from "@/lib/agentRoom/finalize";
import {
  appendTurn,
  emptyTurn,
  executeAgentTurn,
  recordAgentTurn,
  recordFailedTurn,
  sessionState,
} from "@/lib/agentRoom/runner";
import {
  acquireSessionLock,
  loadSession,
  millisecondsUntilNextCallAllowed,
  releaseSessionLock,
  saveSession,
} from "@/lib/agentRoom/sessionStore";
import { buildSessionView } from "@/lib/agentRoom/view";
import {
  AGENT_ROOM_ACTION_LABELS,
  applyAction,
  checkAction,
  isAgentRoomAction,
  isModelAction,
  isTerminalStage,
  routeNext,
} from "@/lib/agentRoom/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const check = checkAction(sessionState(session), action);

  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 409 });
  }

  /* ---------------------------------------------------------------------- */
  /* Local decisions — no provider call, no repository change                */
  /* ---------------------------------------------------------------------- */

  if (!isModelAction(action)) {
    const isEscalationAnswer = action === "resolve_escalation";

    if (isEscalationAnswer && !note.value) {
      return badRequest("Write an answer for the agents before sending it.");
    }

    const turn = emptyTurn(
      "isaac",
      isEscalationAnswer ? "escalation_answer" : "decision",
      action,
      isEscalationAnswer
        ? (session.escalation?.question ?? "Escalation answered")
        : AGENT_ROOM_ACTION_LABELS[action],
    );

    turn.body = note.value || null;
    turn.stageFrom = session.stage;
    turn.stageTo = check.nextStage;

    appendTurn(session, turn);
    Object.assign(session, applyAction(sessionState(session), action, check.nextStage));

    // A session that has just ended gets its summary and its Decision Log
    // record written for it, rather than relying on anyone remembering.
    if (isTerminalStage(session.stage)) {
      await finalizeSession(session);
    }

    await saveSession(session);

    return NextResponse.json(buildSessionView(session));
  }

  /* ---------------------------------------------------------------------- */
  /* Agent turns — locked, rate limited, one at a time                       */
  /* ---------------------------------------------------------------------- */

  const waitMs = millisecondsUntilNextCallAllowed(session.lastCallAt);

  if (waitMs > 0) {
    return NextResponse.json(
      { error: `Give it another ${Math.ceil(waitMs / 1000)}s before the next agent turn.` },
      { status: 429 },
    );
  }

  if (!acquireSessionLock(sessionId)) {
    return NextResponse.json(
      { error: "This session already has an agent turn running." },
      { status: 409 },
    );
  }

  try {
    if (action === "generate_summary") {
      const result = await executeAgentTurn(session, "summarizer", false, action);
      const current = await loadSession(sessionId);

      if (!current) {
        return notFound();
      }

      if (!result.ok) {
        recordFailedTurn(current, result.turn);
        await saveSession(current);

        return NextResponse.json(
          { ...buildSessionView(current), error: result.error },
          { status: 502 },
        );
      }

      result.turn.stageFrom = current.stage;
      result.turn.stageTo = current.stage;
      appendTurn(current, result.turn);
      current.lastCallAt = result.turn.at;
      current.hasSummary = true;
      await saveSession(current);

      return NextResponse.json(buildSessionView(current));
    }

    const route = routeNext(sessionState(session));

    if (!route.role) {
      return NextResponse.json({ error: route.reason }, { status: 409 });
    }

    const isRebuttal = route.role === "investigator" && session.stage === "review_ready";
    const result = await executeAgentTurn(session, route.role, isRebuttal, action);

    // Isaac may have decided something while this was in flight. Re-read from
    // disk: a terminal or moved-on session wins and the reply is discarded.
    const current = await loadSession(sessionId);

    if (!current) {
      return notFound();
    }

    if (isTerminalStage(current.stage)) {
      return NextResponse.json({
        ...buildSessionView(current),
        notice:
          "The workflow was stopped while that turn was in flight. The reply was discarded.",
      });
    }

    const recheck = checkAction(sessionState(current), action);

    if (!recheck.allowed) {
      return NextResponse.json({
        ...buildSessionView(current),
        notice: `The workflow moved on while that turn was in flight, so the reply was discarded. ${recheck.reason}`,
      });
    }

    if (!result.ok) {
      recordFailedTurn(current, result.turn);
      await saveSession(current);

      return NextResponse.json(
        { ...buildSessionView(current), error: result.error },
        { status: 502 },
      );
    }

    recordAgentTurn(current, result.turn, action, recheck.nextStage, route.role);
    await saveSession(current);

    return NextResponse.json(buildSessionView(current));
  } finally {
    releaseSessionLock(sessionId);
  }
}
