/**
 * FTC Agent Room — transcript export.
 *
 * Pure formatting, shared by the server export endpoint and the browser's
 * "Copy full transcript" button, so both produce the same document. The
 * session summary is lifted to the top: the person opening this file usually
 * wants the conclusion, not the thread.
 */

import { AGENT_ROLE_LABELS } from "./roles";
import { AGENT_ROOM_STAGE_LABELS } from "./workflow";
import type { AgentRoomSession, AgentRoomTurn, DecisionLogRecord } from "./types";

function actorName(turn: AgentRoomTurn): string {
  if (turn.actor === "isaac") {
    return "Isaac";
  }

  if (turn.actor === "system") {
    return "Agent Room";
  }

  const provider = turn.actor === "claude" ? "Claude" : "OpenAI";

  return turn.role ? `${provider} · ${AGENT_ROLE_LABELS[turn.role]}` : provider;
}

function list(label: string, items: string[]): string {
  if (!items.length) {
    return `**${label}:** none\n`;
  }

  return `**${label}:**\n${items.map((item) => `- ${item}`).join("\n")}\n`;
}

function usageLine(turn: AgentRoomTurn): string {
  if (!turn.usage) {
    return "";
  }

  const { model, inputTokens, outputTokens, estimatedUsd, durationMs } = turn.usage;
  const cost =
    estimatedUsd === null ? "cost estimate unavailable" : `~$${estimatedUsd.toFixed(4)}`;

  return `_${model} — ${inputTokens} in / ${outputTokens} out, ${cost}, ${(durationMs / 1000).toFixed(1)}s_\n`;
}

function statusLine(turn: AgentRoomTurn): string {
  if (!turn.stageFrom || !turn.stageTo || turn.stageFrom === turn.stageTo) {
    return "";
  }

  return `_Status: ${AGENT_ROOM_STAGE_LABELS[turn.stageFrom]} → ${AGENT_ROOM_STAGE_LABELS[turn.stageTo]}_\n`;
}

function turnToMarkdown(turn: AgentRoomTurn): string {
  const parts = [`### ${actorName(turn)} — ${turn.title}`, `_${turn.at}_`, ""];

  if (turn.body) {
    parts.push(turn.body, "");
  }

  if (turn.investigation) {
    const report = turn.investigation;
    parts.push(
      `**Summary:** ${report.summary}`,
      "",
      list("Confirmed facts", report.confirmedFacts),
      list("Unproven assumptions", report.unprovenAssumptions),
      list(
        "Evidence",
        report.evidence.map(
          (item) => `\`${item.file}\` — ${item.lineOrSymbol}: ${item.explanation}`,
        ),
      ),
      `**Proposed smallest fix:** ${report.proposedFix}`,
      "",
      `**Risk:** ${report.risk} · **Confidence:** ${report.confidence}`,
      "",
    );
  }

  if (turn.review) {
    const review = turn.review;
    parts.push(
      `**Verdict: ${review.verdict}**`,
      "",
      `**Summary:** ${review.summary}`,
      "",
      list("Supported claims", review.supportedClaims),
      list("Unsupported claims", review.unsupportedClaims),
      list("Contradictions", review.contradictions),
      list("Evidence required", review.requiredEvidence),
      `**Recommendation:** ${review.recommendation}`,
      "",
    );
  }

  if (turn.rebuttal) {
    const rebuttal = turn.rebuttal;
    parts.push(
      list("Accepted challenges", rebuttal.acceptedChallenges),
      list("Rejected challenges", rebuttal.rejectedChallenges),
      list(
        "New evidence",
        rebuttal.newEvidence.map(
          (item) => `\`${item.file}\` — ${item.lineOrSymbol}: ${item.explanation}`,
        ),
      ),
      `**Revised diagnosis:** ${rebuttal.revisedDiagnosis}`,
      "",
      `**Revised fix:** ${rebuttal.revisedFix}`,
      "",
      `**Remaining uncertainty:** ${rebuttal.remainingUncertainty}`,
      "",
    );
  }

  if (turn.builderPlan) {
    const plan = turn.builderPlan;
    parts.push(
      `**Summary:** ${plan.summary}`,
      "",
      `**Approach:** ${plan.approach}`,
      "",
      list("Reuses", plan.reuseNotes),
      list(
        "Files to change",
        plan.filesToChange.map(
          (item) => `\`${item.file}\` — ${item.change} (${item.reason})`,
        ),
      ),
      list("Steps", plan.steps),
      `**Test strategy:** ${plan.testStrategy}`,
      "",
      `**Rollback plan:** ${plan.rollbackPlan}`,
      "",
      `**Risk:** ${plan.risk}`,
      "",
    );
  }

  if (turn.qaPlan) {
    const plan = turn.qaPlan;
    parts.push(
      `**Verdict: ${plan.verdict}**`,
      "",
      `**Summary:** ${plan.summary}`,
      "",
      list(
        "Test cases",
        plan.testCases.map(
          (item) => `${item.id} [${item.area}] ${item.steps} → ${item.expected}`,
        ),
      ),
      list("Phone/desktop parity checks", plan.parityChecks),
      list("Regression risks", plan.regressionRisks),
      list("Gaps", plan.gaps),
    );
  }

  if (turn.releaseAssessment) {
    const assessment = turn.releaseAssessment;
    parts.push(
      `**Verdict: ${assessment.verdict}**`,
      "",
      `**Summary:** ${assessment.summary}`,
      "",
      list("Preflight", assessment.preflight),
      list("Blockers", assessment.blockers),
      `**Deployment notes:** ${assessment.deploymentNotes}`,
      "",
      `**Rollback plan:** ${assessment.rollbackPlan}`,
      "",
    );
  }

  if (turn.escalation?.required) {
    parts.push(
      `**Escalated to Isaac (${turn.escalation.type}):** ${turn.escalation.question}`,
      "",
      list("Options", turn.escalation.options),
    );
  }

  const status = statusLine(turn);

  if (status) {
    parts.push(status);
  }

  const usage = usageLine(turn);

  if (usage) {
    parts.push(usage);
  }

  return parts.join("\n");
}

function summarySection(session: AgentRoomSession): string[] {
  const summary = [...session.transcript].reverse().find((turn) => turn.summary)?.summary;

  if (!summary) {
    return [];
  }

  return [
    "## Session summary",
    "",
    "### Executive summary",
    "",
    summary.executiveSummary,
    "",
    "### Technical summary",
    "",
    summary.technicalSummary,
    "",
    list("Risks", summary.risks),
    list("Outstanding tasks", summary.outstandingTasks),
    `**Final recommendation:** ${summary.finalRecommendation}`,
    "",
    `**Root cause:** ${summary.rootCause}`,
    "",
    `**Evidence:** ${summary.evidenceSummary}`,
    "",
    list("Follow-up items", summary.followUpItems),
  ];
}

export function sessionToMarkdown(session: AgentRoomSession): string {
  const totals = session.totals;
  const cost =
    totals.estimatedUsd === null
      ? "cost estimate unavailable for one or more models"
      : `~$${totals.estimatedUsd.toFixed(4)}`;

  const header = [
    `# INTERNAL — FTC AGENT ROOM`,
    "",
    `**${session.title}**`,
    "",
    `- Session: \`${session.id}\``,
    `- Stage: ${AGENT_ROOM_STAGE_LABELS[session.stage]}`,
    `- Review rounds used: ${session.reviewRounds}`,
    `- Builder passes: ${session.builderPasses}`,
    `- Automatic agent turns: ${session.autoHops}`,
    `- Branch / worktree: ${session.branch || "(not given)"}`,
    `- Created: ${session.createdAt}`,
    `- Updated: ${session.updatedAt}`,
    `- Totals: ${totals.inputTokens} input tokens, ${totals.outputTokens} output tokens, ${cost}`,
    "",
    ...summarySection(session),
    "",
    "## Bug description",
    "",
    session.description || "(none)",
    "",
  ];

  if (session.contextNotes) {
    header.push("## Context notes", "", session.contextNotes, "");
  }

  if (session.evidence.length) {
    header.push("## Evidence supplied", "");

    for (const item of session.evidence) {
      header.push(`### ${item.kind}: ${item.label}`, "", "```", item.content, "```", "");
    }
  }

  header.push("## Timeline", "");

  return [...header, ...session.transcript.map(turnToMarkdown)].join("\n");
}

export function sessionToJson(session: AgentRoomSession): string {
  return `${JSON.stringify(session, null, 2)}\n`;
}

export function decisionRecordToMarkdown(record: DecisionLogRecord): string {
  return [
    `# Decision — ${record.issueTitle}`,
    "",
    `- Recorded: ${record.timestamp}`,
    `- Session: \`${record.sessionId}\``,
    `- Branch: ${record.branch || "(not given)"}`,
    `- Outcome stage: ${AGENT_ROOM_STAGE_LABELS[record.stage]}`,
    `- Agents: ${record.participatingAgents.join(", ") || "(none)"}`,
    "",
    `**Root cause:** ${record.rootCause}`,
    "",
    `**Evidence:** ${record.evidenceSummary}`,
    "",
    `**Final decision:** ${record.finalDecision}`,
    "",
    list("Implementation commits", record.implementationCommits),
    `**Verification performed:** ${record.verificationPerformed}`,
    "",
    `**Release outcome:** ${record.releaseOutcome || "(not recorded)"}`,
    "",
    list("Follow-up items", record.followUpItems),
  ].join("\n");
}

export function decisionLogToMarkdown(records: readonly DecisionLogRecord[]): string {
  return [
    "# INTERNAL — FTC AGENT ROOM DECISION LOG",
    "",
    `${records.length} record${records.length === 1 ? "" : "s"}.`,
    "",
    ...records.map(decisionRecordToMarkdown),
  ].join("\n\n");
}
