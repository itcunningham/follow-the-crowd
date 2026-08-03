/**
 * FTC Agent Room — run the agents until a decision is genuinely Isaac's.
 *
 * This is the endpoint that replaces the click-per-handoff workflow. It loops
 * the router: Investigator → Reviewer → Builder → QA → Release, sending work
 * back where an agent asks for it, and stops the moment one of four things is
 * true — an agent escalates, the session reaches a terminal stage, the router
 * says only Isaac can move it forward, or a budget is exhausted.
 *
 * It cannot run away. Every hop is counted against the same auto-hop ceiling
 * the router enforces, the loop re-reads the session from disk between hops so
 * STOP always wins, and a failed or malformed reply ends the run rather than
 * being retried.
 */

import { NextResponse } from "next/server";
import {
  AGENT_ROOM_MANUAL_APPROVAL_REQUIRED,
  agentRoomDisabledResponse,
  notFound,
} from "@/lib/agentRoom/apiGuard";
import { finalizeSession } from "@/lib/agentRoom/finalize";
import {
  executeAgentTurn,
  recordAgentTurn,
  recordFailedTurn,
  sessionState,
} from "@/lib/agentRoom/runner";
import {
  acquireSessionLock,
  loadSession,
  releaseSessionLock,
  saveSession,
} from "@/lib/agentRoom/sessionStore";
import { buildSessionView } from "@/lib/agentRoom/view";
import { checkAction, isTerminalStage, routeNext } from "@/lib/agentRoom/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A second ceiling, independent of the workflow's own auto-hop budget. The
 * router should always terminate on its own; this makes "should" unnecessary.
 */
const MAX_HOPS_PER_REQUEST = 12;

export async function POST(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const disabled = agentRoomDisabledResponse();

  if (disabled) {
    return disabled;
  }

  const { sessionId } = await context.params;
  const initial = await loadSession(sessionId);

  if (!initial) {
    return notFound();
  }

  if (!acquireSessionLock(sessionId)) {
    return NextResponse.json(
      { error: "This session already has an agent turn running." },
      { status: 409 },
    );
  }

  try {
    let session = initial;
    let hops = 0;
    let notice = "";

    while (hops < MAX_HOPS_PER_REQUEST) {
      // Re-read every hop so a STOP or a decision made in another tab wins
      // immediately rather than after the run finishes.
      const current = await loadSession(sessionId);

      if (!current) {
        return notFound();
      }

      session = current;

      if (isTerminalStage(session.stage)) {
        notice = "The workflow stopped.";
        break;
      }

      const check = checkAction(sessionState(session), "advance");

      if (!check.allowed) {
        notice = check.reason;
        break;
      }

      // Manual mode: one recorded approval buys one hop. Checked inside the
      // loop against the session just re-read from disk, so a run cannot keep
      // going on an approval it already spent.
      if (session.handoffApproval === "manual" && !session.handoffApprovedAt) {
        notice = AGENT_ROOM_MANUAL_APPROVAL_REQUIRED;
        break;
      }

      const route = routeNext(sessionState(session));

      if (!route.role) {
        notice = route.reason;
        break;
      }

      const isRebuttal =
        route.role === "investigator" && session.stage === "review_ready";
      const result = await executeAgentTurn(session, route.role, isRebuttal, "advance");

      if (!result.ok) {
        recordFailedTurn(session, result.turn);
        await saveSession(session);

        return NextResponse.json(
          {
            ...buildSessionView(session),
            error: result.error,
            hops,
          },
          { status: 502 },
        );
      }

      recordAgentTurn(session, result.turn, "advance", check.nextStage, route.role);
      // Spend the approval. In manual mode the next iteration therefore stops
      // and asks again; in auto mode this is already null and stays null.
      session.handoffApprovedAt = null;
      await saveSession(session);
      hops += 1;

      if (session.escalation?.required) {
        notice = "An agent needs your decision.";
        break;
      }
    }

    if (!notice && hops >= MAX_HOPS_PER_REQUEST) {
      notice = "Paused after the maximum number of turns in one run. Run again to continue.";
    }

    if (isTerminalStage(session.stage) && !session.hasSummary) {
      await finalizeSession(session);
      await saveSession(session);
    }

    return NextResponse.json({ ...buildSessionView(session), notice, hops });
  } finally {
    releaseSessionLock(sessionId);
  }
}
