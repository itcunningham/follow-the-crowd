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
 *
 * The summary is also a provider call, so in manual mode it needs Isaac's
 * approval like any other. It is the *only* part of ending a session that
 * does: STOP still applies immediately and the Decision Log record is still
 * written, because neither touches a provider. Without an approval the summary
 * is simply not written, `hasSummary` stays false, and the "Write session
 * summary" control remains available for Isaac to approve later.
 */

import { manualApprovalSatisfied } from "./apiGuard";
import { buildDecisionRecord, saveDecisionRecord } from "./decisionLog";
import { appendTurn, executeAgentTurn, recordFailedTurn } from "./runner";
import type { AgentRoomSession } from "./types";

export async function finalizeSession(session: AgentRoomSession): Promise<void> {
  const mayCallProvider = manualApprovalSatisfied(
    session.handoffApproval,
    session.handoffApprovedAt,
  );

  if (!session.hasSummary && mayCallProvider) {
    const result = await executeAgentTurn(session, "summarizer", false, "generate_summary");

    if (result.ok) {
      result.turn.stageFrom = session.stage;
      result.turn.stageTo = session.stage;
      appendTurn(session, result.turn);
      session.lastCallAt = result.turn.at;
      session.hasSummary = true;
      // Spent by the call it authorised. A failed call leaves it banked, so a
      // provider outage does not cost Isaac an approval.
      session.handoffApprovedAt = null;
    } else {
      recordFailedTurn(session, result.turn);
    }
  }

  await saveDecisionRecord(buildDecisionRecord(session));
}
