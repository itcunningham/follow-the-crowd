/**
 * FTC Agent Room — evidence attached to a session.
 *
 * Read-only with respect to the repository. `note` is text Isaac pastes
 * (build output, a stack trace, a screenshot description); `file`, `diff` and
 * `search` go through lib/agentRoom/repoAccess.ts, which cannot write, cannot
 * leave the repository root, and never opens a dot-file or an env file.
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
import { redactSecrets } from "@/lib/agentRoom/redaction";
import {
  readGitDiff,
  readRepoFileExcerpt,
  searchRepo,
  type RepoReadResult,
} from "@/lib/agentRoom/repoAccess";
import { loadSession, saveSession } from "@/lib/agentRoom/sessionStore";
import type { AgentRoomEvidenceKind } from "@/lib/agentRoom/types";
import { buildSessionView } from "@/lib/agentRoom/view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: readonly AgentRoomEvidenceKind[] = ["note", "file", "diff", "search"];

function readOptionalLine(body: unknown, key: string): number | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const value = (body as Record<string, unknown>)[key];

  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return null;
  }

  return value;
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
  const session = await loadSession(sessionId);

  if (!session) {
    return notFound();
  }

  if (session.evidence.length >= AGENT_ROOM_LIMITS.maxEvidenceItems) {
    return badRequest(
      `This session already holds the maximum of ${AGENT_ROOM_LIMITS.maxEvidenceItems} evidence items.`,
    );
  }

  const body = await readJsonBody(request);

  if (!body.ok) {
    return body.response;
  }

  const kind = readField(body.value, "kind") as AgentRoomEvidenceKind;

  if (!KINDS.includes(kind)) {
    return badRequest("Unknown evidence type.");
  }

  let result: RepoReadResult;

  if (kind === "note") {
    const label = clampField(readField(body.value, "label"), 200);
    const content = clampField(
      readField(body.value, "content"),
      AGENT_ROOM_LIMITS.maxEvidenceChars,
    );

    if (!label.ok) {
      return badRequest(label.error);
    }

    if (!content.ok) {
      return badRequest(content.error);
    }

    if (!content.value) {
      return badRequest("The note is empty.");
    }

    const redacted = redactSecrets(content.value);

    result = {
      ok: true,
      label: label.value || "note",
      content: redacted.text,
      redactedRules: redacted.redactedRules,
    };
  } else if (kind === "file") {
    result = await readRepoFileExcerpt(
      readField(body.value, "path"),
      readOptionalLine(body.value, "startLine"),
      readOptionalLine(body.value, "endLine"),
    );
  } else if (kind === "diff") {
    const path = readField(body.value, "path");
    result = await readGitDiff(path || null);
  } else {
    result = await searchRepo(readField(body.value, "query"));
  }

  if (!result.ok) {
    return badRequest(result.error);
  }

  if (result.content.length > AGENT_ROOM_LIMITS.maxEvidenceChars) {
    return badRequest(
      `That is ${result.content.length} characters, over the ${AGENT_ROOM_LIMITS.maxEvidenceChars} character evidence limit. Narrow the range.`,
    );
  }

  session.evidence.push({
    id: randomUUID(),
    kind,
    label: result.label,
    content: result.content,
    createdAt: new Date().toISOString(),
    redactedRules: result.redactedRules,
  });

  session.updatedAt = new Date().toISOString();
  await saveSession(session);

  return NextResponse.json(buildSessionView(session), { status: 201 });
}

export async function DELETE(
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

  const evidenceId = new URL(request.url).searchParams.get("evidenceId") ?? "";
  const before = session.evidence.length;

  session.evidence = session.evidence.filter((item) => item.id !== evidenceId);

  if (session.evidence.length === before) {
    return notFound("Evidence not found.");
  }

  session.updatedAt = new Date().toISOString();
  await saveSession(session);

  return NextResponse.json(buildSessionView(session));
}
