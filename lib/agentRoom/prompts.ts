/**
 * FTC Agent Room — prompt assembly.
 *
 * `buildHandoff` is the *only* place an outbound payload is constructed. The
 * UI calls it to show Isaac exactly what is about to be sent, and the route
 * handler calls it again to actually send it — same function, same result, so
 * the preview cannot drift from the request.
 *
 * What goes out: the task, the evidence Isaac attached, and the previous
 * model-visible reports. Nothing else. No repository walk, no environment, no
 * cookies, no chain-of-thought.
 */

import { AGENT_ROOM_LIMITS, AGENT_ROOM_MAX_REVIEW_ROUNDS } from "./config";
import { redactSecrets } from "./redaction";
import {
  CLAUDE_INVESTIGATION_SCHEMA,
  CLAUDE_REBUTTAL_SCHEMA,
  OPENAI_REVIEW_SCHEMA,
} from "./schemas";
import type { AgentRoomSession } from "./types";
import type { AgentRoomAction } from "./workflow";

export type AgentRoomHandoff = {
  provider: "anthropic" | "openai";
  system: string;
  user: string;
  schema: Record<string, unknown>;
  schemaName: string;
  /** Rules that fired while redacting this payload. */
  redactedRules: string[];
  /** Set when the payload had to be trimmed to the size limit. */
  truncated: boolean;
  /** Character count of system + user, for the "what will be sent" panel. */
  totalChars: number;
};

const TRUNCATION_MARKER =
  "\n\n[TRUNCATED BY FTC AGENT ROOM — the payload exceeded the configured size limit.]";

const SHARED_GROUND_RULES = [
  "You are one of three participants in a supervised debugging session for Follow The Crowd (FTC), a Next.js + Supabase application.",
  "Isaac is the supervisor and the only decision-maker. He alone approves implementation.",
  "You cannot edit, stage, commit, push, merge, deploy, run SQL, or run shell commands from this room. Do not describe your reply as if you had.",
  "You can only see what is quoted below. If you need something that is not here, say what and why — do not assume it.",
  "Do not restate your reasoning process. Return only the structured fields asked for.",
].join(" ");

const CLAUDE_INVESTIGATOR_SYSTEM = [
  SHARED_GROUND_RULES,
  "Your role is Investigator. Separate what the evidence proves from what you are assuming; an assumption listed as a confirmed fact is the worst outcome here.",
  "Cite exact files and line numbers or symbol names for every claim. Propose the smallest fix that addresses the proven cause, not a refactor.",
].join(" ");

const CLAUDE_RESPONDENT_SYSTEM = [
  SHARED_GROUND_RULES,
  "Your role is Investigator, answering an independent review of your own report. This is your one reply — the workflow stops for Isaac's decision afterwards.",
  "Concede the challenges that are right and say plainly why the rest are wrong. Defending a claim you cannot evidence is worse than withdrawing it.",
].join(" ");

const OPENAI_REVIEWER_SYSTEM = [
  SHARED_GROUND_RULES,
  "Your role is independent Reviewer. You did not write this diagnosis and you are not here to agree with it.",
  "Read the original bug report first, then the report. Check every claim against the quoted evidence. Return exactly one verdict: AGREE, CHALLENGE or REJECT.",
  "AGREE means the evidence supports the diagnosis and the fix. CHALLENGE means the direction may be right but specific claims are unproven. REJECT means the diagnosis is not supported by the evidence.",
].join(" ");

function section(heading: string, body: string): string {
  const trimmed = body.trim();
  return trimmed ? `## ${heading}\n${trimmed}\n` : "";
}

function bulletList(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "(none)";
}

function taskBlock(session: AgentRoomSession): string {
  return [
    section("Bug / task title", session.title),
    section("Bug description", session.description),
    session.branch ? section("Branch / worktree", session.branch) : "",
    session.contextNotes ? section("Supervisor context notes", session.contextNotes) : "",
    section(
      "Evidence supplied",
      session.evidence.length
        ? session.evidence
            .map(
              (item) =>
                `### ${item.kind}: ${item.label}\n\`\`\`\n${item.content}\n\`\`\``,
            )
            .join("\n\n")
        : "(none supplied — say so if you need some)",
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

function latestInvestigationBlock(session: AgentRoomSession): string {
  const turn = [...session.transcript]
    .reverse()
    .find((entry) => entry.kind === "investigation" && entry.investigation);

  if (!turn?.investigation) {
    return "(no investigation on record)";
  }

  const report = turn.investigation;

  return [
    `Summary: ${report.summary}`,
    `Risk: ${report.risk}`,
    `Confidence: ${report.confidence}`,
    "",
    "Confirmed facts:",
    bulletList(report.confirmedFacts),
    "",
    "Unproven assumptions:",
    bulletList(report.unprovenAssumptions),
    "",
    "Evidence:",
    bulletList(
      report.evidence.map(
        (item) => `${item.file} — ${item.lineOrSymbol}: ${item.explanation}`,
      ),
    ),
    "",
    `Proposed smallest fix: ${report.proposedFix}`,
  ].join("\n");
}

function latestReviewBlock(session: AgentRoomSession): string {
  const turn = [...session.transcript]
    .reverse()
    .find((entry) => entry.kind === "review" && entry.review);

  if (!turn?.review) {
    return "(no review on record)";
  }

  const review = turn.review;

  return [
    `Verdict: ${review.verdict}`,
    `Summary: ${review.summary}`,
    "",
    "Supported claims:",
    bulletList(review.supportedClaims),
    "",
    "Unsupported claims:",
    bulletList(review.unsupportedClaims),
    "",
    "Contradictions:",
    bulletList(review.contradictions),
    "",
    "Evidence the reviewer requires:",
    bulletList(review.requiredEvidence),
    "",
    `Recommendation: ${review.recommendation}`,
  ].join("\n");
}

/** Notes Isaac added when asking for more evidence, so a re-run knows why. */
function evidenceRequestBlock(session: AgentRoomSession): string {
  const requests = session.transcript
    .filter((entry) => entry.action === "request_more_evidence" && entry.body)
    .map((entry) => entry.body as string);

  return requests.length ? bulletList(requests) : "";
}

function finish(
  provider: "anthropic" | "openai",
  system: string,
  user: string,
  schema: Record<string, unknown>,
  schemaName: string,
): AgentRoomHandoff {
  const redactedSystem = redactSecrets(system);
  const redactedUser = redactSecrets(user);

  let finalUser = redactedUser.text;
  let truncated = false;
  const budget = AGENT_ROOM_LIMITS.maxPromptChars - redactedSystem.text.length;

  if (finalUser.length > budget) {
    finalUser = `${finalUser.slice(0, Math.max(0, budget - TRUNCATION_MARKER.length))}${TRUNCATION_MARKER}`;
    truncated = true;
  }

  const redactedRules = [
    ...new Set([...redactedSystem.redactedRules, ...redactedUser.redactedRules]),
  ];

  return {
    provider,
    system: redactedSystem.text,
    user: finalUser,
    schema,
    schemaName,
    redactedRules,
    truncated,
    totalChars: redactedSystem.text.length + finalUser.length,
  };
}

/**
 * Builds the payload for a model action. Returns null for actions that make no
 * provider call, which is the signal that no handoff approval is needed.
 */
export function buildHandoff(
  session: AgentRoomSession,
  action: AgentRoomAction,
): AgentRoomHandoff | null {
  switch (action) {
    case "start_investigation": {
      const request = evidenceRequestBlock(session);

      return finish(
        "anthropic",
        CLAUDE_INVESTIGATOR_SYSTEM,
        [
          "# Task from Isaac",
          taskBlock(session),
          request
            ? section("Isaac has asked for more evidence on these points", request)
            : "",
          "Investigate and return your diagnosis in the required structure.",
        ]
          .filter(Boolean)
          .join("\n"),
        CLAUDE_INVESTIGATION_SCHEMA as unknown as Record<string, unknown>,
        "claude_investigation",
      );
    }

    case "send_to_openai":
      return finish(
        "openai",
        OPENAI_REVIEWER_SYSTEM,
        [
          "# Original bug report from Isaac",
          taskBlock(session),
          "",
          "# Claude's report, for independent review",
          latestInvestigationBlock(session),
          "",
          `This is review round ${session.reviewRounds + 1} of at most ${AGENT_ROOM_MAX_REVIEW_ROUNDS}.`,
          "Return exactly one verdict.",
        ].join("\n"),
        OPENAI_REVIEW_SCHEMA as unknown as Record<string, unknown>,
        "openai_review",
      );

    case "send_review_to_claude":
      return finish(
        "anthropic",
        CLAUDE_RESPONDENT_SYSTEM,
        [
          "# Original bug report from Isaac",
          taskBlock(session),
          "",
          "# Your earlier report",
          latestInvestigationBlock(session),
          "",
          "# The independent review of it",
          latestReviewBlock(session),
          "",
          "Respond once, in the required structure.",
        ].join("\n"),
        CLAUDE_REBUTTAL_SCHEMA as unknown as Record<string, unknown>,
        "claude_rebuttal",
      );

    default:
      return null;
  }
}
