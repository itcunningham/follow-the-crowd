/**
 * FTC Agent Room — internal developer tool.
 *
 * Not part of the FTC product. When FTC_AGENT_ROOM_ENABLED is not exactly
 * "true" — or when running on Vercel at all — this route 404s like any
 * address that does not exist. The gate is server-side: the client bundle for
 * this page is never reached, so nothing about the tool is discoverable.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAgentRoomEnabled } from "@/lib/agentRoom/config";
import AgentRoomClient from "./AgentRoomClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "INTERNAL — FTC Agent Room",
  robots: { index: false, follow: false },
};

export default function AgentRoomPage() {
  if (!isAgentRoomEnabled()) {
    notFound();
  }

  return <AgentRoomClient />;
}
