/**
 * FTC Agent Room — the two Decision Log fields only Isaac can fill in.
 *
 * Which commits carried the fix and what happened at release are facts about
 * git and Production. Agent Room has neither, so it records them from Isaac
 * rather than inferring them. Follow-up items are editable for the same
 * reason: they change after the fact.
 */

import { NextResponse } from "next/server";
import { AGENT_ROOM_LIMITS } from "@/lib/agentRoom/config";
import {
  agentRoomDisabledResponse,
  badRequest,
  notFound,
  readField,
  readJsonBody,
} from "@/lib/agentRoom/apiGuard";
import {
  applyDecisionPatch,
  deleteDecisionRecord,
  loadDecisionRecord,
  saveDecisionRecord,
} from "@/lib/agentRoom/decisionLog";
import { redactSecrets } from "@/lib/agentRoom/redaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIST_ITEMS = 30;

/** Splits a textarea into trimmed, redacted, capped lines. */
function readLines(body: unknown, key: string): string[] | undefined {
  if (typeof body !== "object" || body === null || !(key in (body as object))) {
    return undefined;
  }

  return readField(body, key)
    .split("\n")
    .map((line) => redactSecrets(line.trim()).text)
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ decisionId: string }> },
) {
  const disabled = agentRoomDisabledResponse();

  if (disabled) {
    return disabled;
  }

  const { decisionId } = await context.params;
  const record = await loadDecisionRecord(decisionId);

  return record ? NextResponse.json({ record }) : notFound("Decision not found.");
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ decisionId: string }> },
) {
  const disabled = agentRoomDisabledResponse();

  if (disabled) {
    return disabled;
  }

  const { decisionId } = await context.params;
  const record = await loadDecisionRecord(decisionId);

  if (!record) {
    return notFound("Decision not found.");
  }

  const body = await readJsonBody(request);

  if (!body.ok) {
    return body.response;
  }

  const releaseOutcomeRaw =
    typeof body.value === "object" && body.value !== null && "releaseOutcome" in body.value
      ? readField(body.value, "releaseOutcome").trim()
      : undefined;

  if (releaseOutcomeRaw !== undefined && releaseOutcomeRaw.length > AGENT_ROOM_LIMITS.maxNoteChars) {
    return badRequest(
      `The release outcome is over the ${AGENT_ROOM_LIMITS.maxNoteChars} character limit.`,
    );
  }

  const updated = applyDecisionPatch(record, {
    implementationCommits: readLines(body.value, "implementationCommits"),
    followUpItems: readLines(body.value, "followUpItems"),
    releaseOutcome:
      releaseOutcomeRaw === undefined ? undefined : redactSecrets(releaseOutcomeRaw).text,
  });

  await saveDecisionRecord(updated);

  return NextResponse.json({ record: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ decisionId: string }> },
) {
  const disabled = agentRoomDisabledResponse();

  if (disabled) {
    return disabled;
  }

  const { decisionId } = await context.params;

  return (await deleteDecisionRecord(decisionId))
    ? NextResponse.json({ deleted: true })
    : notFound("Decision not found.");
}
