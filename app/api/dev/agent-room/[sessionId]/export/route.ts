/**
 * FTC Agent Room — full transcript export as JSON or Markdown.
 */

import { NextResponse } from "next/server";
import { agentRoomDisabledResponse, badRequest, notFound } from "@/lib/agentRoom/apiGuard";
import { loadSession } from "@/lib/agentRoom/sessionStore";
import { sessionToJson, sessionToMarkdown } from "@/lib/agentRoom/transcript";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
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

  const format = new URL(request.url).searchParams.get("format") ?? "markdown";

  if (format !== "markdown" && format !== "json") {
    return badRequest("Format must be `markdown` or `json`.");
  }

  const isJson = format === "json";

  return new NextResponse(isJson ? sessionToJson(session) : sessionToMarkdown(session), {
    status: 200,
    headers: {
      "Content-Type": isJson
        ? "application/json; charset=utf-8"
        : "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="agent-room-${session.id}.${isJson ? "json" : "md"}"`,
    },
  });
}
