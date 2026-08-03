/**
 * FTC Agent Room — what happens when a session ends.
 *
 * Two things Isaac should never have to remember: writing the summary, and
 * writing the Decision Log record. Both happen automatically the moment a
 * session reaches a terminal stage.
 *
 * The summary is best-effort. If the provider is unreachable or the key is
 * missing, the failure is recorded as a turn and the Decision Log record is
 * still written — an audit trail with gaps beats no audit trail, and the
 * record says plainly which parts were never established.
 */

import { buildDecisionRecord, saveDecisionRecord } from "./decisionLog";
import { appendTurn, executeAgentTurn, recordFailedTurn } from "./runner";
import type { AgentRoomSession } from "./types";

export async function finalizeSession(session: AgentRoomSession): Promise<void> {
  if (!session.hasSummary) {
    const result = await executeAgentTurn(session, "summarizer", false, "generate_summary");

    if (result.ok) {
      result.turn.stageFrom = session.stage;
      result.turn.stageTo = session.stage;
      appendTurn(session, result.turn);
      session.lastCallAt = result.turn.at;
      session.hasSummary = true;
    } else {
      recordFailedTurn(session, result.turn);
    }
  }

  await saveDecisionRecord(buildDecisionRecord(session));
}
