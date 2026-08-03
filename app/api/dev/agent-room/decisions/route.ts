/**
 * FTC Agent Room — the Decision Log.
 *
 * Read and search only. Records are written automatically when a session ends
 * (see lib/agentRoom/finalize.ts); there is no endpoint that creates one by
 * hand, so the log cannot drift from what actually happened in the room.
 *
 * A static `decisions` segment sits beside the dynamic `[sessionId]` one.
 * Next.js resolves static segments first, so this never shadows a session.
 */

import { NextResponse } from "next/server";
import { agentRoomDisabledResponse, badRequest } from "@/lib/agentRoom/apiGuard";
import { listDecisionRecords, searchDecisionRecords } from "@/lib/agentRoom/decisionLog";
import { decisionLogToMarkdown } from "@/lib/agentRoom/transcript";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const disabled = agentRoomDisabledResponse();

  if (disabled) {
    return disabled;
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const format = url.searchParams.get("format") ?? "json";

  if (format !== "json" && format !== "markdown") {
    return badRequest("Format must be `json` or `markdown`.");
  }

  if (query.length > 200) {
    return badRequest("That search is too long.");
  }

  const records = searchDecisionRecords(await listDecisionRecords(), query);

  if (format === "markdown") {
    return new NextResponse(decisionLogToMarkdown(records), {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="agent-room-decision-log.md"',
      },
    });
  }

  return NextResponse.json({ records, query });
}
