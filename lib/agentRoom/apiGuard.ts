/**
 * FTC Agent Room — shared route-handler guards.
 *
 * Every Agent Room endpoint starts with `agentRoomDisabledResponse()`. When
 * the tool is off, the API is indistinguishable from a route that does not
 * exist: a bare 404, no error body, no hint that a dev tool lives here.
 */

import { NextResponse } from "next/server";
import { AGENT_ROOM_LIMITS, isAgentRoomEnabled } from "./config";
import { redactSecrets } from "./redaction";

/** Returns a 404 when the Agent Room is disabled, otherwise null. */
export function agentRoomDisabledResponse(): NextResponse | null {
  if (isAgentRoomEnabled()) {
    return null;
  }

  return new NextResponse(null, { status: 404 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * The manual-mode gate, enforced server-side so it cannot be skipped by a
 * client that simply does not ask. In "manual" the agents may not run until
 * Isaac has recorded an approval for the next handoff; that approval is spent
 * by the turn it authorises, so each turn needs its own.
 *
 * Returns null in "auto", which leaves automatic mode exactly as it was.
 */
export const AGENT_ROOM_MANUAL_APPROVAL_REQUIRED =
  "Manual handoff approval is on. Review the next handoff and approve it before the agents continue.";

export function manualApprovalResponse(
  mode: "auto" | "manual",
  approvedAt: string | null,
): NextResponse | null {
  if (mode !== "manual" || approvedAt) {
    return null;
  }

  return NextResponse.json(
    { error: AGENT_ROOM_MANUAL_APPROVAL_REQUIRED },
    { status: 409 },
  );
}

export function notFound(message = "Session not found."): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export type BodyResult =
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse };

/**
 * Reads a JSON body with a hard size limit. The limit is enforced on the bytes
 * we actually received, so an oversized paste is refused before it can reach a
 * provider or the session file.
 */
export async function readJsonBody(request: Request): Promise<BodyResult> {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");

  if (Number.isFinite(declaredLength) && declaredLength > AGENT_ROOM_LIMITS.maxRequestBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `That request is larger than the ${Math.round(
            AGENT_ROOM_LIMITS.maxRequestBytes / 1024,
          )} KB limit.`,
        },
        { status: 413 },
      ),
    };
  }

  let raw: string;

  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: badRequest("Could not read the request body.") };
  }

  if (Buffer.byteLength(raw, "utf8") > AGENT_ROOM_LIMITS.maxRequestBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `That request is larger than the ${Math.round(
            AGENT_ROOM_LIMITS.maxRequestBytes / 1024,
          )} KB limit.`,
        },
        { status: 413 },
      ),
    };
  }

  if (!raw.trim()) {
    return { ok: true, value: {} };
  }

  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, response: badRequest("The request body was not valid JSON.") };
  }
}

export function readField(body: unknown, key: string): string {
  if (typeof body !== "object" || body === null) {
    return "";
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

/**
 * Trims, length-checks and redacts a supervisor-supplied text field.
 *
 * Redaction happens here, at ingest, rather than only on the way out to a
 * provider. A credential pasted into the bug description would otherwise sit
 * in the session file and be echoed straight back to the browser; redacting on
 * arrival means the raw value never reaches storage at all. Redaction is
 * idempotent, so applying it again downstream costs nothing.
 */
export function clampField(
  value: string,
  max: number,
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = value.trim();

  if (trimmed.length > max) {
    return { ok: false, error: `That field is over the ${max} character limit.` };
  }

  return { ok: true, value: redactSecrets(trimmed).text };
}
