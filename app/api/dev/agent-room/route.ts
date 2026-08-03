/**
 * FTC Agent Room — session collection.
 *
 * INTERNAL DEVELOPER TOOL. 404s unless FTC_AGENT_ROOM_ENABLED=true, and is
 * refused outright on Vercel (see lib/agentRoom/config.ts).
 */

import { NextResponse } from "next/server";
import { AGENT_ROOM_LIMITS } from "@/lib/agentRoom/config";
import {
  agentRoomDisabledResponse,
  badRequest,
  clampField,
  readField,
  readJsonBody,
} from "@/lib/agentRoom/apiGuard";
import { listSessions, newSessionId, saveSession } from "@/lib/agentRoom/sessionStore";
import type { AgentRoomSession } from "@/lib/agentRoom/types";
import { buildConfigView, buildSessionView } from "@/lib/agentRoom/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const disabled = agentRoomDisabledResponse();

  if (disabled) {
    return disabled;
  }

  return NextResponse.json({
    sessions: await listSessions(),
    config: buildConfigView(),
  });
}

export async function POST(request: Request) {
  const disabled = agentRoomDisabledResponse();

  if (disabled) {
    return disabled;
  }

  const body = await readJsonBody(request);

  if (!body.ok) {
    return body.response;
  }

  const title = clampField(readField(body.value, "title"), AGENT_ROOM_LIMITS.maxTitleChars);
  const description = clampField(
    readField(body.value, "description"),
    AGENT_ROOM_LIMITS.maxDescriptionChars,
  );
  const branch = clampField(readField(body.value, "branch"), AGENT_ROOM_LIMITS.maxBranchChars);
  const contextNotes = clampField(
    readField(body.value, "contextNotes"),
    AGENT_ROOM_LIMITS.maxNoteChars,
  );

  for (const field of [title, description, branch, contextNotes]) {
    if (!field.ok) {
      return badRequest(field.error);
    }
  }

  if (!title.ok || !title.value) {
    return badRequest("Give the task a title.");
  }

  if (!description.ok || !description.value) {
    return badRequest("Describe the bug or task.");
  }

  const now = new Date().toISOString();

  const session: AgentRoomSession = {
    id: newSessionId(),
    createdAt: now,
    updatedAt: now,
    title: title.value,
    description: description.value,
    branch: branch.ok ? branch.value : "",
    contextNotes: contextNotes.ok ? contextNotes.value : "",
    evidence: [],
    stage: "awaiting_investigation",
    reviewRounds: 0,
    rebuttalUsedForCurrentRound: false,
    builderPasses: 0,
    autoHops: 0,
    escalation: null,
    lastReviewVerdict: null,
    lastQaVerdict: null,
    lastReleaseVerdict: null,
    hasSummary: false,
    handoffApproval: "auto",
    transcript: [
      {
        id: newSessionId(),
        at: now,
        actor: "isaac",
        role: null,
        kind: "task",
        action: null,
        title: "Task submitted",
        body: description.value,
        investigation: null,
        review: null,
        rebuttal: null,
        builderPlan: null,
        qaPlan: null,
        releaseAssessment: null,
        summary: null,
        escalation: null,
        stageFrom: null,
        stageTo: "awaiting_investigation",
        usage: null,
        redactedRules: [],
        promptChars: null,
      },
    ],
    lastCallAt: null,
    totals: { inputTokens: 0, outputTokens: 0, estimatedUsd: 0 },
  };

  await saveSession(session);

  return NextResponse.json(buildSessionView(session), { status: 201 });
}
