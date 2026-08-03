/**
 * FTC Agent Room — transcript export.
 *
 * Pure formatting, shared by the server export endpoint and the browser's
 * "Copy full transcript" button, so both produce the same document.
 */

import { AGENT_ROOM_STAGE_LABELS } from "./workflow";
import type { AgentRoomSession, AgentRoomTurn } from "./types";

function heading(turn: AgentRoomTurn): string {
  const actor =
    turn.actor === "isaac" ? "Isaac" : turn.actor === "claude" ? "Claude" : "OpenAI";

  return `### ${actor} — ${turn.title}\n_${turn.at}_`;
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

function turnToMarkdown(turn: AgentRoomTurn): string {
  const parts = [heading(turn), ""];

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

  const usage = usageLine(turn);

  if (usage) {
    parts.push(usage);
  }

  return parts.join("\n");
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
    `- Branch / worktree: ${session.branch || "(not given)"}`,
    `- Created: ${session.createdAt}`,
    `- Updated: ${session.updatedAt}`,
    `- Totals: ${totals.inputTokens} input tokens, ${totals.outputTokens} output tokens, ${cost}`,
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
      header.push(
        `### ${item.kind}: ${item.label}`,
        "",
        "```",
        item.content,
        "```",
        "",
      );
    }
  }

  header.push("## Transcript", "");

  return [...header, ...session.transcript.map(turnToMarkdown)].join("\n");
}

export function sessionToJson(session: AgentRoomSession): string {
  return `${JSON.stringify(session, null, 2)}\n`;
}
