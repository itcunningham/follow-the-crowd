/**
 * FTC Agent Room — one session: read, edit the brief, delete.
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
import { deleteSession, loadSession, saveSession } from "@/lib/agentRoom/sessionStore";
import { buildSessionView } from "@/lib/agentRoom/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const disabled = agentRoomDisabledResponse();

  if (disabled) {
    return disabled;
  }

  const { sessionId } = await context.params;
  const session = await loadSession(sessionId);

  if (!session) {
    return notFound();
  }

  return NextResponse.json(buildSessionView(session));
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const disabled = agentRoomDisabledResponse();

  if (disabled) {
    return disabled;
  }

  const { sessionId } = await context.params;
  const session = await loadSession(sessionId);

  if (!session) {
    return notFound();
  }

  const body = await readJsonBody(request);

  if (!body.ok) {
    return body.response;
  }

  // The handoff-approval mode is a preference, not content, so it can be
  // changed at any point — including mid-run, to slow the agents down.
  const approval = readField(body.value, "handoffApproval");

  if (approval === "auto" || approval === "manual") {
    session.handoffApproval = approval;
    // Changing the mode never carries a stale approval across with it, so
    // switching into manual always starts by asking.
    session.handoffApprovedAt = null;
    session.updatedAt = new Date().toISOString();
    await saveSession(session);

    return NextResponse.json(buildSessionView(session));
  }

  // Isaac approving the next handoff in manual mode. Recorded on the session so
  // the execution endpoints can enforce it, and spent by the turn it allows.
  if (
    typeof body.value === "object" &&
    body.value !== null &&
    (body.value as Record<string, unknown>).approveNextHandoff === true
  ) {
    session.handoffApprovedAt = new Date().toISOString();
    session.updatedAt = session.handoffApprovedAt;
    await saveSession(session);

    return NextResponse.json(buildSessionView(session));
  }

  if (session.stage !== "awaiting_investigation") {
    return badRequest(
      "The brief can only be edited before the agents start. Request more evidence first.",
    );
  }

  const fields: Array<[keyof typeof session & string, number]> = [
    ["title", AGENT_ROOM_LIMITS.maxTitleChars],
    ["description", AGENT_ROOM_LIMITS.maxDescriptionChars],
    ["branch", AGENT_ROOM_LIMITS.maxBranchChars],
    ["contextNotes", AGENT_ROOM_LIMITS.maxNoteChars],
  ];

  for (const [key, max] of fields) {
    if (!(key in (body.value as Record<string, unknown>))) {
      continue;
    }

    const clamped = clampField(readField(body.value, key), max);

    if (!clamped.ok) {
      return badRequest(clamped.error);
    }

    if (key === "title" && !clamped.value) {
      return badRequest("Give the task a title.");
    }

    if (key === "description" && !clamped.value) {
      return badRequest("Describe the bug or task.");
    }

    session[key] = clamped.value as never;
  }

  session.updatedAt = new Date().toISOString();
  await saveSession(session);

  return NextResponse.json(buildSessionView(session));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  const disabled = agentRoomDisabledResponse();

  if (disabled) {
    return disabled;
  }

  const { sessionId } = await context.params;
  const removed = await deleteSession(sessionId);

  if (!removed) {
    return notFound();
  }

  return NextResponse.json({ deleted: true });
}
