/**
 * FTC Agent Room — prompt assembly.
 *
 * `buildHandoff` is the *only* place an outbound payload is constructed. The
 * UI calls it to show Isaac exactly what is about to be sent, and the route
 * handler calls it again to actually send it — same function, same result, so
 * the preview cannot drift from the request.
 *
 * What goes out: the task, the evidence Isaac attached, the previous
 * model-visible reports, and Isaac's answers to earlier escalations. Nothing
 * else. No repository walk, no environment, no cookies, no chain-of-thought.
 *
 * Each role is told, in the same words every time, when it may interrupt Isaac
 * and when it must settle the matter with the other agents instead.
 */

import {
  AGENT_ROOM_LIMITS,
  AGENT_ROOM_MAX_AUTO_HOPS,
  AGENT_ROOM_MAX_REVIEW_ROUNDS,
} from "./config";
import { redactSecrets } from "./redaction";
import {
  ESCALATION_CONTRACT,
  providerForRole,
  type AgentRole,
} from "./roles";
import {
  BUILDER_PLAN_SCHEMA,
  CLAUDE_INVESTIGATION_SCHEMA,
  CLAUDE_REBUTTAL_SCHEMA,
  OPENAI_REVIEW_SCHEMA,
  QA_PLAN_SCHEMA,
  RELEASE_ASSESSMENT_SCHEMA,
  SESSION_SUMMARY_SCHEMA,
} from "./schemas";
import type { AgentRoomSession, AgentRoomTurn } from "./types";

export type AgentRoomHandoff = {
  role: AgentRole;
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
  "You are one of several agents in a supervised engineering room for Follow The Crowd (FTC), a Next.js + Supabase application.",
  "Isaac is the supervisor. The agents in this room hand work to each other; Isaac is interrupted only when a decision is genuinely his.",
  "No agent in this room can edit, stage, commit, push, merge, deploy, run SQL, or run shell commands. Everything you produce is a plan or an assessment for a human to carry out through FTC's normal worktree workflow. Do not write code, and do not describe your reply as if you had changed anything.",
  "You can only see what is quoted below. If you need something that is not here, say what and why — do not assume it.",
  "Do not restate your reasoning process. Return only the structured fields asked for.",
].join(" ");

const ROLE_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  investigator: [
    SHARED_GROUND_RULES,
    "Your role is Investigator. Separate what the evidence proves from what you are assuming; an assumption listed as a confirmed fact is the worst outcome here.",
    "Cite exact files and line numbers or symbol names for every claim. Propose the smallest fix that addresses the proven cause, not a refactor.",
    ESCALATION_CONTRACT,
  ].join(" "),

  reviewer: [
    SHARED_GROUND_RULES,
    "Your role is independent Reviewer. You did not write this diagnosis and you are not here to agree with it.",
    "Read the original bug report first, then the report. Check every claim against the quoted evidence. Return exactly one verdict: AGREE, CHALLENGE or REJECT.",
    "AGREE means the evidence supports the diagnosis and the fix. CHALLENGE means the direction may be right but specific claims are unproven. REJECT means the diagnosis is not supported by the evidence.",
    "Prefer CHALLENGE over escalating: naming the unproven claim lets the Investigator answer you directly, which is faster than involving Isaac.",
    ESCALATION_CONTRACT,
  ].join(" "),

  builder: [
    SHARED_GROUND_RULES,
    "Your role is Builder. You write the implementation plan a human Builder will follow; you do not write the code.",
    "FTC has a pre-code decision ladder: does this need to exist at all, is it already in the codebase, does the standard library or the platform do it, is there an installed dependency, is it one line — and only then the minimum that works. Walk it and say in reuseNotes what you are reusing instead of adding.",
    "Keep the change as small as the proven cause allows. If two approaches are genuinely defensible, that is an implementation_choice escalation — present both rather than picking silently.",
    ESCALATION_CONTRACT,
  ].join(" "),

  qa: [
    SHARED_GROUND_RULES,
    "Your role is QA Reviewer. You did not write this plan. Produce the verification a human QA would run against it.",
    "FTC requires phone/desktop parity at 390px and 1280px — the same features, labels, permissions, states and outcomes, not merely a similar-looking layout. Every UI, loading or navigation change needs parity checks that test behaviour.",
    "Return exactly one verdict: READY, NEEDS_WORK or BLOCKED. NEEDS_WORK sends the plan back to the Builder with your gaps; use it rather than escalating when the Builder could fix the gap themselves.",
    ESCALATION_CONTRACT,
  ].join(" "),

  release: [
    SHARED_GROUND_RULES,
    "Your role is Release Agent. Assess whether this is ready to reach real users.",
    "FTC's recurring delivery trap: pushing a branch is not shipping. Vercel builds Production from `main` only, so a branch push produces a Preview no matter how complete the work is. Preflight checks should reflect that.",
    "Return exactly one verdict: READY, HOLD or SEND_BACK_TO_BUILDER. You assess; you never release. The release itself is always Isaac's decision, so do not raise a release_decision escalation just to say you are finished — say READY and stop.",
    ESCALATION_CONTRACT,
  ].join(" "),

  summarizer: [
    SHARED_GROUND_RULES,
    "Your role is to summarise the session for two audiences at once: someone who read none of the thread, and an engineer picking the work up tomorrow.",
    "Be specific. 'The bug was fixed' is useless; name the cause and the evidence. If something was never proved, say so in risks rather than smoothing it over.",
  ].join(" "),
};

function section(heading: string, body: string): string {
  const trimmed = body.trim();
  return trimmed ? `## ${heading}\n${trimmed}\n` : "";
}

function bulletList(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "(none)";
}

function latest(
  session: AgentRoomSession,
  kind: AgentRoomTurn["kind"],
): AgentRoomTurn | null {
  for (let index = session.transcript.length - 1; index >= 0; index -= 1) {
    const turn = session.transcript[index];

    if (turn.kind === kind) {
      return turn;
    }
  }

  return null;
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
              (item) => `### ${item.kind}: ${item.label}\n\`\`\`\n${item.content}\n\`\`\``,
            )
            .join("\n\n")
        : "(none supplied — say so if you need some)",
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

/** Isaac's answers to earlier escalations. Every agent sees these. */
function supervisorAnswersBlock(session: AgentRoomSession): string {
  const answers = session.transcript
    .filter((turn) => turn.kind === "escalation_answer" && turn.body)
    .map((turn) => `- ${turn.title}: ${turn.body}`);

  const requests = session.transcript
    .filter((turn) => turn.action === "request_more_evidence" && turn.body)
    .map((turn) => `- Asked for more evidence: ${turn.body}`);

  const all = [...answers, ...requests];

  return all.length ? section("Decisions Isaac has already made", all.join("\n")) : "";
}

function investigationBlock(session: AgentRoomSession): string {
  const turn = latest(session, "investigation");

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

function reviewBlock(session: AgentRoomSession): string {
  const turn = latest(session, "review");

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

function rebuttalBlock(session: AgentRoomSession): string {
  const turn = latest(session, "rebuttal");

  if (!turn?.rebuttal) {
    return "";
  }

  const rebuttal = turn.rebuttal;

  return [
    "Accepted challenges:",
    bulletList(rebuttal.acceptedChallenges),
    "",
    "Rejected challenges:",
    bulletList(rebuttal.rejectedChallenges),
    "",
    `Revised diagnosis: ${rebuttal.revisedDiagnosis}`,
    `Revised fix: ${rebuttal.revisedFix}`,
    `Remaining uncertainty: ${rebuttal.remainingUncertainty}`,
  ].join("\n");
}

function builderPlanBlock(session: AgentRoomSession): string {
  const turn = latest(session, "build_plan");

  if (!turn?.builderPlan) {
    return "(no implementation plan on record)";
  }

  const plan = turn.builderPlan;

  return [
    `Summary: ${plan.summary}`,
    `Approach: ${plan.approach}`,
    `Risk: ${plan.risk}`,
    "",
    "Reuses:",
    bulletList(plan.reuseNotes),
    "",
    "Files to change:",
    bulletList(
      plan.filesToChange.map((item) => `${item.file} — ${item.change} (${item.reason})`),
    ),
    "",
    "Steps:",
    bulletList(plan.steps),
    "",
    `Test strategy: ${plan.testStrategy}`,
    `Rollback plan: ${plan.rollbackPlan}`,
  ].join("\n");
}

function qaPlanBlock(session: AgentRoomSession): string {
  const turn = latest(session, "qa_plan");

  if (!turn?.qaPlan) {
    return "(no verification plan on record)";
  }

  const plan = turn.qaPlan;

  return [
    `Verdict: ${plan.verdict}`,
    `Summary: ${plan.summary}`,
    "",
    "Test cases:",
    bulletList(
      plan.testCases.map((item) => `${item.id} [${item.area}] ${item.steps} → ${item.expected}`),
    ),
    "",
    "Phone/desktop parity checks:",
    bulletList(plan.parityChecks),
    "",
    "Regression risks:",
    bulletList(plan.regressionRisks),
    "",
    "Gaps:",
    bulletList(plan.gaps),
  ].join("\n");
}

function releaseBlock(session: AgentRoomSession): string {
  const turn = latest(session, "release_review");

  if (!turn?.releaseAssessment) {
    return "";
  }

  const assessment = turn.releaseAssessment;

  return [
    `Verdict: ${assessment.verdict}`,
    `Summary: ${assessment.summary}`,
    "",
    "Preflight:",
    bulletList(assessment.preflight),
    "",
    "Blockers:",
    bulletList(assessment.blockers),
    "",
    `Deployment notes: ${assessment.deploymentNotes}`,
    `Rollback plan: ${assessment.rollbackPlan}`,
  ].join("\n");
}

function finish(
  role: AgentRole,
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
    role,
    provider: providerForRole(role),
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
 * Builds the payload for one agent turn. `isRebuttal` distinguishes the
 * Investigator's two jobs — the opening diagnosis and the single reply to a
 * review — because the same role plays both.
 */
export function buildHandoff(
  session: AgentRoomSession,
  role: AgentRole,
  isRebuttal = false,
): AgentRoomHandoff {
  const system = ROLE_SYSTEM_PROMPTS[role];
  const answers = supervisorAnswersBlock(session);

  switch (role) {
    case "investigator":
      if (isRebuttal) {
        return finish(
          role,
          system,
          [
            "# Original bug report from Isaac",
            taskBlock(session),
            answers,
            "",
            "# Your earlier report",
            investigationBlock(session),
            "",
            "# The independent review of it",
            reviewBlock(session),
            "",
            "Respond once, in the required structure.",
          ]
            .filter(Boolean)
            .join("\n"),
          CLAUDE_REBUTTAL_SCHEMA as unknown as Record<string, unknown>,
          "claude_rebuttal",
        );
      }

      return finish(
        role,
        system,
        [
          "# Task from Isaac",
          taskBlock(session),
          answers,
          "Investigate and return your diagnosis in the required structure.",
        ]
          .filter(Boolean)
          .join("\n"),
        CLAUDE_INVESTIGATION_SCHEMA as unknown as Record<string, unknown>,
        "claude_investigation",
      );

    case "reviewer":
      return finish(
        role,
        system,
        [
          "# Original bug report from Isaac",
          taskBlock(session),
          answers,
          "",
          "# The report, for independent review",
          investigationBlock(session),
          rebuttalBlock(session)
            ? `\n# The Investigator's reply to the previous review\n${rebuttalBlock(session)}`
            : "",
          "",
          `This is review round ${session.reviewRounds + 1} of at most ${AGENT_ROOM_MAX_REVIEW_ROUNDS}.`,
          "Return exactly one verdict.",
        ]
          .filter(Boolean)
          .join("\n"),
        OPENAI_REVIEW_SCHEMA as unknown as Record<string, unknown>,
        "openai_review",
      );

    case "builder":
      return finish(
        role,
        system,
        [
          "# Original bug report from Isaac",
          taskBlock(session),
          answers,
          "",
          "# The agreed diagnosis",
          investigationBlock(session),
          rebuttalBlock(session) ? `\n# The Investigator's reply to review\n${rebuttalBlock(session)}` : "",
          "",
          "# What the independent reviewer said",
          reviewBlock(session),
          latest(session, "qa_plan")
            ? `\n# QA sent this back. Their gaps:\n${qaPlanBlock(session)}`
            : "",
          releaseBlock(session)
            ? `\n# Release review sent this back:\n${releaseBlock(session)}`
            : "",
          "",
          "Produce the implementation plan in the required structure. Do not write code.",
        ]
          .filter(Boolean)
          .join("\n"),
        BUILDER_PLAN_SCHEMA as unknown as Record<string, unknown>,
        "builder_plan",
      );

    case "qa":
      return finish(
        role,
        system,
        [
          "# Original bug report from Isaac",
          taskBlock(session),
          answers,
          "",
          "# The diagnosis",
          investigationBlock(session),
          "",
          "# The implementation plan to verify",
          builderPlanBlock(session),
          "",
          "Produce the verification plan and return exactly one verdict.",
        ]
          .filter(Boolean)
          .join("\n"),
        QA_PLAN_SCHEMA as unknown as Record<string, unknown>,
        "qa_plan",
      );

    case "release":
      return finish(
        role,
        system,
        [
          "# Original bug report from Isaac",
          taskBlock(session),
          answers,
          "",
          "# The implementation plan",
          builderPlanBlock(session),
          "",
          "# The verification plan",
          qaPlanBlock(session),
          "",
          "Assess release readiness and return exactly one verdict.",
        ]
          .filter(Boolean)
          .join("\n"),
        RELEASE_ASSESSMENT_SCHEMA as unknown as Record<string, unknown>,
        "release_assessment",
      );

    case "summarizer":
      return finish(
        role,
        system,
        [
          "# Original bug report from Isaac",
          taskBlock(session),
          answers,
          "",
          "# Diagnosis",
          investigationBlock(session),
          "",
          "# Independent review",
          reviewBlock(session),
          rebuttalBlock(session) ? `\n# Investigator's reply\n${rebuttalBlock(session)}` : "",
          "",
          "# Implementation plan",
          builderPlanBlock(session),
          "",
          "# Verification plan",
          qaPlanBlock(session),
          releaseBlock(session) ? `\n# Release review\n${releaseBlock(session)}` : "",
          "",
          `The session ended at stage "${session.stage}" after ${session.autoHops} of ${AGENT_ROOM_MAX_AUTO_HOPS} automatic agent turns.`,
          "Summarise it in the required structure.",
        ]
          .filter(Boolean)
          .join("\n"),
        SESSION_SUMMARY_SCHEMA as unknown as Record<string, unknown>,
        "session_summary",
      );
  }
}
