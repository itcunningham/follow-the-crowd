"use client";

/**
 * FTC Agent Room — the conversation timeline.
 *
 * A chronological thread: who spoke, what they decided, what the status became
 * and when. Long agent replies collapse to their headline so a twelve-turn
 * session is still readable at 390px; the detail is one tap away.
 */

import { useState } from "react";
import {
  AGENT_ROLE_INITIALS,
  AGENT_ROLE_LABELS,
  ESCALATION_LABELS,
} from "@/lib/agentRoom/roles";
import type { AgentRoomTurn } from "@/lib/agentRoom/types";
import { AGENT_ROOM_STAGE_LABELS } from "@/lib/agentRoom/workflow";
import {
  Badge,
  Bullets,
  Field,
  RoleChip,
  accentFor,
  formatUsd,
  riskTone,
  toneForRole,
  verdictTone,
} from "./ui";

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

function initials(turn: AgentRoomTurn): string {
  if (turn.actor === "isaac") {
    return "IC";
  }

  return turn.role ? AGENT_ROLE_INITIALS[turn.role] : "AR";
}

/** One line that says what this turn amounted to, without opening it. */
function headline(turn: AgentRoomTurn): string {
  if (turn.investigation) {
    return turn.investigation.summary;
  }
  if (turn.review) {
    return turn.review.summary;
  }
  if (turn.rebuttal) {
    return turn.rebuttal.revisedDiagnosis;
  }
  if (turn.builderPlan) {
    return turn.builderPlan.summary;
  }
  if (turn.qaPlan) {
    return turn.qaPlan.summary;
  }
  if (turn.releaseAssessment) {
    return turn.releaseAssessment.summary;
  }
  if (turn.summary) {
    return turn.summary.executiveSummary;
  }

  return turn.body ?? "";
}

function verdictBadge(turn: AgentRoomTurn) {
  const verdict =
    turn.review?.verdict ?? turn.qaPlan?.verdict ?? turn.releaseAssessment?.verdict ?? null;

  return verdict ? <Badge text={verdict.replace(/_/g, " ")} tone={verdictTone(verdict)} /> : null;
}

function TurnDetail({ turn }: { turn: AgentRoomTurn }) {
  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--ftc-color-border-subtle)" }}>
      {turn.investigation ? (
        <>
          <Bullets label="Confirmed facts" items={turn.investigation.confirmedFacts} />
          <Bullets
            label="Unproven assumptions"
            items={turn.investigation.unprovenAssumptions}
          />
          <Bullets
            label="Evidence"
            items={turn.investigation.evidence.map(
              (item) => `${item.file} — ${item.lineOrSymbol}: ${item.explanation}`,
            )}
          />
          <Field label="Proposed smallest fix" value={turn.investigation.proposedFix} />
          <div className="flex flex-wrap gap-2">
            <Badge
              text={`Risk ${turn.investigation.risk}`}
              tone={riskTone(turn.investigation.risk)}
            />
            <Badge
              text={`Confidence ${turn.investigation.confidence}`}
              tone={turn.investigation.confidence === "low" ? "bad" : riskTone(turn.investigation.confidence) === "good" ? "warn" : "good"}
            />
          </div>
        </>
      ) : null}

      {turn.review ? (
        <>
          <Bullets label="Supported claims" items={turn.review.supportedClaims} />
          <Bullets label="Unsupported claims" items={turn.review.unsupportedClaims} />
          <Bullets label="Contradictions" items={turn.review.contradictions} />
          <Bullets label="Evidence required" items={turn.review.requiredEvidence} />
          <Field label="Recommendation" value={turn.review.recommendation} />
        </>
      ) : null}

      {turn.rebuttal ? (
        <>
          <Bullets label="Accepted challenges" items={turn.rebuttal.acceptedChallenges} />
          <Bullets label="Rejected challenges" items={turn.rebuttal.rejectedChallenges} />
          <Bullets
            label="New evidence"
            items={turn.rebuttal.newEvidence.map(
              (item) => `${item.file} — ${item.lineOrSymbol}: ${item.explanation}`,
            )}
          />
          <Field label="Revised fix" value={turn.rebuttal.revisedFix} />
          <Field label="Remaining uncertainty" value={turn.rebuttal.remainingUncertainty} />
        </>
      ) : null}

      {turn.builderPlan ? (
        <>
          <Field label="Approach" value={turn.builderPlan.approach} />
          <Bullets label="Reuses existing FTC code" items={turn.builderPlan.reuseNotes} />
          <Bullets
            label="Files to change"
            items={turn.builderPlan.filesToChange.map(
              (item) => `${item.file} — ${item.change} (${item.reason})`,
            )}
          />
          <Bullets label="Steps" items={turn.builderPlan.steps} />
          <Field label="Test strategy" value={turn.builderPlan.testStrategy} />
          <Field label="Rollback plan" value={turn.builderPlan.rollbackPlan} />
          <Badge text={`Risk ${turn.builderPlan.risk}`} tone={riskTone(turn.builderPlan.risk)} />
        </>
      ) : null}

      {turn.qaPlan ? (
        <>
          <Bullets
            label="Test cases"
            items={turn.qaPlan.testCases.map(
              (item) => `${item.id} [${item.area}] ${item.steps} → ${item.expected}`,
            )}
          />
          <Bullets label="Parity checks (390px / 1280px)" items={turn.qaPlan.parityChecks} />
          <Bullets label="Regression risks" items={turn.qaPlan.regressionRisks} />
          <Bullets label="Gaps" items={turn.qaPlan.gaps} />
        </>
      ) : null}

      {turn.releaseAssessment ? (
        <>
          <Bullets label="Preflight" items={turn.releaseAssessment.preflight} />
          <Bullets label="Blockers" items={turn.releaseAssessment.blockers} />
          <Field label="Deployment notes" value={turn.releaseAssessment.deploymentNotes} />
          <Field label="Rollback plan" value={turn.releaseAssessment.rollbackPlan} />
        </>
      ) : null}

      {turn.summary ? (
        <>
          <Field label="Technical summary" value={turn.summary.technicalSummary} />
          <Bullets label="Risks" items={turn.summary.risks} />
          <Bullets label="Outstanding tasks" items={turn.summary.outstandingTasks} />
          <Field label="Final recommendation" value={turn.summary.finalRecommendation} />
          <Field label="Root cause" value={turn.summary.rootCause} />
          <Bullets label="Follow-up items" items={turn.summary.followUpItems} />
        </>
      ) : null}

      {turn.usage ? (
        <p className="text-[11px] text-ftc-text-muted">
          {turn.usage.model} · {turn.usage.inputTokens} in / {turn.usage.outputTokens} out ·{" "}
          {formatUsd(turn.usage.estimatedUsd)} · {(turn.usage.durationMs / 1000).toFixed(1)}s
          {turn.promptChars ? ` · ${turn.promptChars.toLocaleString()} chars sent` : ""}
        </p>
      ) : null}

      {turn.redactedRules.length ? (
        <p className="mt-1 text-[11px]" style={{ color: "var(--ftc-color-warning)" }}>
          Redacted before sending: {turn.redactedRules.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function TurnRow({ turn, defaultOpen }: { turn: AgentRoomTurn; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const tone = toneForRole(turn.role, turn.actor);
  const hasDetail =
    Boolean(
      turn.investigation ||
        turn.review ||
        turn.rebuttal ||
        turn.builderPlan ||
        turn.qaPlan ||
        turn.releaseAssessment ||
        turn.summary,
    ) || Boolean(turn.usage);
  const line = headline(turn);
  const statusChanged = turn.stageFrom && turn.stageTo && turn.stageFrom !== turn.stageTo;

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <RoleChip initials={initials(turn)} tone={turn.kind === "error" ? "alert" : tone} />
        <span
          className="mt-1 w-px flex-1"
          style={{ background: "var(--ftc-color-border-subtle)" }}
          aria-hidden="true"
        />
      </div>

      <div className="min-w-0 flex-1 pb-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-sm font-semibold text-ftc-text">{actorName(turn)}</span>
          <span className="text-[11px] text-ftc-text-muted">
            {new Date(turn.at).toLocaleTimeString()}
          </span>
          {verdictBadge(turn)}
        </div>

        <p
          className="mt-0.5 text-[11px] uppercase tracking-[0.06em]"
          style={{
            color:
              turn.kind === "error" ? "var(--ftc-color-danger)" : "var(--ftc-color-text-muted)",
          }}
        >
          {turn.title}
        </p>

        {line ? (
          <p
            className="mt-1 whitespace-pre-wrap break-words text-sm"
            style={{
              color:
                turn.kind === "error"
                  ? "var(--ftc-color-danger)"
                  : "var(--ftc-color-text-primary)",
            }}
          >
            {line}
          </p>
        ) : null}

        {turn.escalation?.required ? (
          <p
            className="mt-2 rounded-ftc-sm border px-2 py-1 text-xs"
            style={{
              borderColor: accentFor("isaac"),
              color: "var(--ftc-color-warning)",
            }}
          >
            Escalated ({ESCALATION_LABELS[turn.escalation.type]}): {turn.escalation.question}
          </p>
        ) : null}

        {statusChanged ? (
          <p className="mt-1 text-[11px] text-ftc-text-muted">
            {AGENT_ROOM_STAGE_LABELS[turn.stageFrom!]} →{" "}
            <span className="text-ftc-text-secondary">
              {AGENT_ROOM_STAGE_LABELS[turn.stageTo!]}
            </span>
          </p>
        ) : null}

        {hasDetail ? (
          <>
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              className="mt-1 text-[11px] text-ftc-text-secondary underline"
            >
              {open ? "Hide detail" : "Show detail"}
            </button>
            {open ? <TurnDetail turn={turn} /> : null}
          </>
        ) : null}
      </div>
    </li>
  );
}

export default function Timeline({ turns }: { turns: AgentRoomTurn[] }) {
  return (
    <ol className="flex flex-col">
      {turns.map((turn, index) => (
        <TurnRow
          key={turn.id}
          turn={turn}
          // The newest turn and anything that failed open by default; the rest
          // stay collapsed so the thread reads as a thread.
          defaultOpen={index === turns.length - 1 || turn.kind === "error"}
        />
      ))}
    </ol>
  );
}
