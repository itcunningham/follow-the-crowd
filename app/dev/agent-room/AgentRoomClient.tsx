"use client";

/**
 * FTC Agent Room — the supervisor's panel.
 *
 * Isaac watches every message and controls every step. No provider request
 * leaves this page without him first seeing the exact payload and confirming
 * it, and the red STOP button is available on any live session.
 *
 * Layout is single-column at 390px and two-column from `lg`; every control and
 * every panel is present at both widths.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { sessionToMarkdown } from "@/lib/agentRoom/transcript";
import type {
  AgentRoomSessionSummary,
  AgentRoomTurn,
} from "@/lib/agentRoom/types";
import type {
  AgentRoomActionView,
  AgentRoomConfigView,
  AgentRoomSessionView,
} from "@/lib/agentRoom/view";
import {
  AGENT_ROOM_ACTION_LABELS,
  AGENT_ROOM_STAGE_LABELS,
  type AgentRoomAction,
} from "@/lib/agentRoom/workflow";

const API = "/api/dev/agent-room";

type ApiPayload = AgentRoomSessionView & { error?: string; notice?: string };

/* -------------------------------------------------------------------------- */
/* Small presentational pieces                                                */
/* -------------------------------------------------------------------------- */

function Card({
  title,
  children,
  tone = "default",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "default" | "claude" | "openai" | "isaac";
}) {
  const accent =
    tone === "claude"
      ? "var(--ftc-color-primary)"
      : tone === "openai"
        ? "var(--ftc-color-success)"
        : tone === "isaac"
          ? "var(--ftc-color-warning)"
          : "var(--ftc-color-border-strong)";

  return (
    <section
      className="rounded-ftc-lg border bg-ftc-surface p-4"
      style={{ borderColor: "var(--ftc-color-border-subtle)", borderLeft: `3px solid ${accent}` }}
    >
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ftc-text-section-label">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Bullets({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ftc-text-muted">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-ftc-text-muted">None</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ftc-text">
          {items.map((item, index) => (
            <li key={`${label}-${index}`} className="break-words">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ftc-text-muted">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ftc-text">{value}</p>
    </div>
  );
}

function Badge({ text, tone }: { text: string; tone: "good" | "warn" | "bad" | "neutral" }) {
  const colour =
    tone === "good"
      ? "var(--ftc-color-success)"
      : tone === "warn"
        ? "var(--ftc-color-warning)"
        : tone === "bad"
          ? "var(--ftc-color-danger)"
          : "var(--ftc-color-text-secondary)";

  return (
    <span
      className="inline-flex items-center rounded-ftc-sm px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
      style={{ color: colour, border: `1px solid ${colour}` }}
    >
      {text}
    </span>
  );
}

function formatUsd(value: number | null): string {
  return value === null ? "cost estimate unavailable" : `~$${value.toFixed(4)}`;
}

function TurnView({ turn }: { turn: AgentRoomTurn }) {
  const tone =
    turn.actor === "claude" ? "claude" : turn.actor === "openai" ? "openai" : "isaac";
  const actor = turn.actor === "isaac" ? "Isaac" : turn.actor === "claude" ? "Claude" : "OpenAI";

  return (
    <Card title={`${actor} — ${turn.title}`} tone={tone}>
      <p className="mb-3 text-[11px] text-ftc-text-muted">
        {new Date(turn.at).toLocaleString()}
        {turn.usage
          ? ` · ${turn.usage.model} · ${turn.usage.inputTokens} in / ${turn.usage.outputTokens} out · ${formatUsd(
              turn.usage.estimatedUsd,
            )} · ${(turn.usage.durationMs / 1000).toFixed(1)}s`
          : ""}
      </p>

      {turn.body ? (
        <p
          className="mb-3 whitespace-pre-wrap break-words text-sm"
          style={{
            color:
              turn.kind === "error" ? "var(--ftc-color-danger)" : "var(--ftc-color-text-primary)",
          }}
        >
          {turn.body}
        </p>
      ) : null}

      {turn.investigation ? (
        <>
          <Field label="Summary" value={turn.investigation.summary} />
          <Bullets label="Confirmed facts" items={turn.investigation.confirmedFacts} />
          <Bullets label="Unproven assumptions" items={turn.investigation.unprovenAssumptions} />
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
              tone={turn.investigation.risk === "high" ? "bad" : turn.investigation.risk === "medium" ? "warn" : "good"}
            />
            <Badge
              text={`Confidence ${turn.investigation.confidence}`}
              tone={
                turn.investigation.confidence === "high"
                  ? "good"
                  : turn.investigation.confidence === "medium"
                    ? "warn"
                    : "bad"
              }
            />
          </div>
        </>
      ) : null}

      {turn.review ? (
        <>
          <div className="mb-3">
            <Badge
              text={turn.review.verdict}
              tone={
                turn.review.verdict === "AGREE"
                  ? "good"
                  : turn.review.verdict === "CHALLENGE"
                    ? "warn"
                    : "bad"
              }
            />
          </div>
          <Field label="Summary" value={turn.review.summary} />
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
          <Field label="Revised diagnosis" value={turn.rebuttal.revisedDiagnosis} />
          <Field label="Revised fix" value={turn.rebuttal.revisedFix} />
          <Field label="Remaining uncertainty" value={turn.rebuttal.remainingUncertainty} />
        </>
      ) : null}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Main panel                                                                 */
/* -------------------------------------------------------------------------- */

export default function AgentRoomClient() {
  const [sessions, setSessions] = useState<AgentRoomSessionSummary[]>([]);
  const [config, setConfig] = useState<AgentRoomConfigView | null>(null);
  const [view, setView] = useState<AgentRoomSessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [runningAction, setRunningAction] = useState<AgentRoomAction | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [pendingHandoff, setPendingHandoff] = useState<AgentRoomActionView | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [newContext, setNewContext] = useState("");

  const [evidenceKind, setEvidenceKind] = useState<"note" | "file" | "diff" | "search">("note");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [evidencePath, setEvidencePath] = useState("");
  const [evidenceStart, setEvidenceStart] = useState("");
  const [evidenceEnd, setEvidenceEnd] = useState("");
  const [evidenceQuery, setEvidenceQuery] = useState("");

  const startedAtRef = useRef<number | null>(null);

  const refreshSessions = useCallback(async () => {
    const response = await fetch(API, { cache: "no-store" });

    if (!response.ok) {
      setError("The Agent Room API is not available. Is FTC_AGENT_ROOM_ENABLED set?");
      return;
    }

    const data = (await response.json()) as {
      sessions: AgentRoomSessionSummary[];
      config: AgentRoomConfigView;
    };

    setSessions(data.sessions);
    setConfig(data.config);
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (runningAction === null) {
      setElapsedMs(0);
      return;
    }

    startedAtRef.current = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - (startedAtRef.current ?? Date.now()));
    }, 100);

    return () => window.clearInterval(timer);
  }, [runningAction]);

  const applyPayload = useCallback((payload: ApiPayload) => {
    setView({ session: payload.session, actions: payload.actions, config: payload.config });
    setNotice(payload.notice ?? null);
  }, []);

  const call = useCallback(
    async (
      path: string,
      init: RequestInit | undefined,
      action: AgentRoomAction | null,
    ): Promise<boolean> => {
      setBusy(true);
      setError(null);
      setNotice(null);
      setRunningAction(action);

      try {
        const response = await fetch(path, { cache: "no-store", ...init });
        const text = await response.text();
        const data = text ? (JSON.parse(text) as ApiPayload) : null;

        if (data?.session) {
          applyPayload(data);
        }

        if (!response.ok) {
          setError(data?.error ?? `Request failed (${response.status}).`);
          return false;
        }

        await refreshSessions();
        return true;
      } catch {
        setError("Could not reach the Agent Room API.");
        return false;
      } finally {
        setBusy(false);
        setRunningAction(null);
      }
    },
    [applyPayload, refreshSessions],
  );

  const openSession = useCallback(
    async (id: string) => {
      await call(`${API}/${id}`, undefined, null);
    },
    [call],
  );

  async function createSession() {
    const ok = await call(
      API,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          branch: newBranch,
          contextNotes: newContext,
        }),
      },
      null,
    );

    if (ok) {
      setNewTitle("");
      setNewDescription("");
      setNewBranch("");
      setNewContext("");
    }
  }

  async function addEvidence() {
    if (!view) {
      return;
    }

    const payload: Record<string, unknown> = { kind: evidenceKind };

    if (evidenceKind === "note") {
      payload.label = evidenceLabel;
      payload.content = evidenceText;
    } else if (evidenceKind === "file") {
      payload.path = evidencePath;
      if (evidenceStart) payload.startLine = Number(evidenceStart);
      if (evidenceEnd) payload.endLine = Number(evidenceEnd);
    } else if (evidenceKind === "diff") {
      payload.path = evidencePath;
    } else {
      payload.query = evidenceQuery;
    }

    const ok = await call(
      `${API}/${view.session.id}/evidence`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      null,
    );

    if (ok) {
      setEvidenceLabel("");
      setEvidenceText("");
      setEvidenceQuery("");
    }
  }

  async function runAction(action: AgentRoomAction) {
    if (!view) {
      return;
    }

    setPendingHandoff(null);

    await call(
      `${API}/${view.session.id}/action`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: decisionNote }),
      },
      action,
    );

    setDecisionNote("");
  }

  function onActionClick(entry: AgentRoomActionView) {
    if (entry.handoff) {
      // Approval checkpoint: nothing is sent until Isaac sees the payload.
      setPendingHandoff(entry);
      return;
    }

    void runAction(entry.action);
  }

  async function copyTranscript() {
    if (!view) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sessionToMarkdown(view.session));
      setNotice("Full transcript copied to the clipboard.");
    } catch {
      setError("The browser refused clipboard access. Use Export Markdown instead.");
    }
  }

  async function removeSession(id: string) {
    await call(`${API}/${id}`, { method: "DELETE" }, null);
    setView((current) => (current?.session.id === id ? null : current));
    await refreshSessions();
  }

  const session = view?.session ?? null;
  const stopAction = view?.actions.find((entry) => entry.action === "stop") ?? null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 pb-24">
      {/* Unmissable internal label, per the brief. */}
      <header
        className="rounded-ftc-lg border px-4 py-3"
        style={{
          borderColor: "var(--ftc-color-warning)",
          background: "var(--ftc-color-bg-elevated)",
        }}
      >
        <p
          className="text-[13px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--ftc-color-warning)" }}
        >
          Internal — FTC Agent Room
        </p>
        <p className="mt-1 text-xs text-ftc-text-secondary">
          Developer tool. Read-only against the repository: it cannot edit, commit, push,
          deploy or run SQL. Nothing is implemented until you approve it.
        </p>
        {config ? (
          <p className="mt-2 text-[11px] text-ftc-text-muted">
            Claude: <span className="text-ftc-text-secondary">{config.anthropicModel}</span>
            {config.anthropicKeyPresent ? "" : " (no ANTHROPIC_API_KEY)"} · OpenAI:{" "}
            <span className="text-ftc-text-secondary">{config.openaiModel}</span>
            {config.openaiKeyPresent ? "" : " (no OPENAI_API_KEY)"} · max{" "}
            {config.maxReviewRounds} review rounds
          </p>
        ) : null}
      </header>

      {error ? (
        <p
          className="rounded-ftc-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--ftc-color-danger)", color: "var(--ftc-color-danger)" }}
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <p
          className="rounded-ftc-md border px-4 py-3 text-sm"
          style={{ borderColor: "var(--ftc-color-primary-border)", color: "var(--ftc-color-primary)" }}
        >
          {notice}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ------------------------------------------------------------- */}
        {/* Left rail: sessions + brief + evidence                        */}
        {/* ------------------------------------------------------------- */}
        <div className="flex flex-col gap-4">
          <Card title="Recent sessions">
            {sessions.length === 0 ? (
              <p className="text-sm text-ftc-text-muted">No sessions yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sessions.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => void openSession(entry.id)}
                      className="min-w-0 flex-1 rounded-ftc-sm px-2 py-1.5 text-left text-sm text-ftc-text hover:bg-ftc-bg-elevated"
                    >
                      <span className="block truncate">{entry.title}</span>
                      <span className="block text-[11px] text-ftc-text-muted">
                        {AGENT_ROOM_STAGE_LABELS[entry.stage]}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSession(entry.id)}
                      className="ftc-btn-ghost shrink-0 px-2 py-1 text-[11px]"
                      aria-label={`Delete session ${entry.title}`}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="New task">
            <div className="flex flex-col gap-2">
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="Bug / task title"
                className="rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 text-sm text-ftc-text"
              />
              <textarea
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder="Bug description"
                rows={5}
                className="rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 text-sm text-ftc-text"
              />
              <input
                value={newBranch}
                onChange={(event) => setNewBranch(event.target.value)}
                placeholder="Relevant branch / worktree"
                className="rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 text-sm text-ftc-text"
              />
              <textarea
                value={newContext}
                onChange={(event) => setNewContext(event.target.value)}
                placeholder="Screenshots / context notes (describe them — no images are generated or uploaded)"
                rows={3}
                className="rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 text-sm text-ftc-text"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void createSession()}
                className="ftc-btn-primary px-4"
              >
                Create session
              </button>
            </div>
          </Card>

          {session ? (
            <Card title={`Evidence (${session.evidence.length})`}>
              <div className="mb-3 flex flex-col gap-2">
                <select
                  value={evidenceKind}
                  onChange={(event) =>
                    setEvidenceKind(event.target.value as typeof evidenceKind)
                  }
                  className="rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 text-sm text-ftc-text"
                >
                  <option value="note">Pasted note / build output</option>
                  <option value="file">Source file excerpt</option>
                  <option value="diff">git diff</option>
                  <option value="search">Repository search</option>
                </select>

                {evidenceKind === "note" ? (
                  <>
                    <input
                      value={evidenceLabel}
                      onChange={(event) => setEvidenceLabel(event.target.value)}
                      placeholder="Label, e.g. npm run build output"
                      className="rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 text-sm text-ftc-text"
                    />
                    <textarea
                      value={evidenceText}
                      onChange={(event) => setEvidenceText(event.target.value)}
                      placeholder="Paste the evidence"
                      rows={5}
                      className="rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 font-mono text-xs text-ftc-text"
                    />
                  </>
                ) : null}

                {evidenceKind === "file" || evidenceKind === "diff" ? (
                  <input
                    value={evidencePath}
                    onChange={(event) => setEvidencePath(event.target.value)}
                    placeholder={
                      evidenceKind === "file"
                        ? "lib/dm/chatMessageGroupLayout.ts"
                        : "Optional path to scope the diff"
                    }
                    className="rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 font-mono text-xs text-ftc-text"
                  />
                ) : null}

                {evidenceKind === "file" ? (
                  <div className="flex gap-2">
                    <input
                      value={evidenceStart}
                      onChange={(event) => setEvidenceStart(event.target.value)}
                      placeholder="From line"
                      inputMode="numeric"
                      className="min-w-0 flex-1 rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 text-sm text-ftc-text"
                    />
                    <input
                      value={evidenceEnd}
                      onChange={(event) => setEvidenceEnd(event.target.value)}
                      placeholder="To line"
                      inputMode="numeric"
                      className="min-w-0 flex-1 rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 text-sm text-ftc-text"
                    />
                  </div>
                ) : null}

                {evidenceKind === "search" ? (
                  <input
                    value={evidenceQuery}
                    onChange={(event) => setEvidenceQuery(event.target.value)}
                    placeholder="Exact text to search for"
                    className="rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 font-mono text-xs text-ftc-text"
                  />
                ) : null}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addEvidence()}
                  className="ftc-btn-secondary px-4"
                >
                  Attach evidence
                </button>
              </div>

              <ul className="flex flex-col gap-2">
                {session.evidence.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-ftc-sm border border-ftc-border-subtle p-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 break-words text-ftc-text-secondary">
                        <span className="uppercase tracking-[0.06em] text-ftc-text-muted">
                          {item.kind}
                        </span>{" "}
                        {item.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void call(
                            `${API}/${session.id}/evidence?evidenceId=${item.id}`,
                            { method: "DELETE" },
                            null,
                          )
                        }
                        className="shrink-0 text-[11px] text-ftc-text-muted underline"
                      >
                        Remove
                      </button>
                    </div>
                    {item.redactedRules.length ? (
                      <p className="mt-1" style={{ color: "var(--ftc-color-warning)" }}>
                        Redacted before storage: {item.redactedRules.join(", ")}
                      </p>
                    ) : null}
                    <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-ftc-text-muted">
                      {item.content.slice(0, 2000)}
                    </pre>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Right: stage, controls, transcript                            */}
        {/* ------------------------------------------------------------- */}
        <div className="flex min-w-0 flex-col gap-4">
          {!session ? (
            <Card title="No session open">
              <p className="text-sm text-ftc-text-secondary">
                Create a task, or open a recent session.
              </p>
            </Card>
          ) : (
            <>
              <Card title="Workflow stage">
                <p className="text-base font-semibold text-ftc-text">{session.title}</p>
                <p className="mt-1 text-sm text-ftc-text-secondary">
                  {AGENT_ROOM_STAGE_LABELS[session.stage]}
                </p>
                <p className="mt-2 text-[11px] text-ftc-text-muted">
                  Review rounds used {session.reviewRounds} of{" "}
                  {view?.config.maxReviewRounds ?? 2} · {session.totals.inputTokens} input /{" "}
                  {session.totals.outputTokens} output tokens ·{" "}
                  {formatUsd(session.totals.estimatedUsd)}
                  {session.branch ? ` · ${session.branch}` : ""}
                </p>

                {runningAction ? (
                  <p className="mt-3 text-sm" style={{ color: "var(--ftc-color-primary)" }}>
                    Running{" "}
                    {view?.actions.find((entry) => entry.action === runningAction)?.handoff
                      ?.provider ?? "workflow"}{" "}
                    — {(elapsedMs / 1000).toFixed(1)}s elapsed
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyTranscript()}
                    className="ftc-btn-secondary px-3"
                  >
                    Copy full transcript
                  </button>
                  <a
                    href={`${API}/${session.id}/export?format=markdown`}
                    className="ftc-btn-secondary inline-flex px-3"
                  >
                    Export Markdown
                  </a>
                  <a
                    href={`${API}/${session.id}/export?format=json`}
                    className="ftc-btn-secondary inline-flex px-3"
                  >
                    Export JSON
                  </a>
                </div>
              </Card>

              <Card title="Supervisor controls" tone="isaac">
                <textarea
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  placeholder="Optional note recorded with your next decision (e.g. what evidence you want)"
                  rows={2}
                  className="mb-3 w-full rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 text-sm text-ftc-text"
                />

                <div className="flex flex-wrap gap-2">
                  {view?.actions
                    .filter((entry) => entry.action !== "stop")
                    .map((entry) => (
                      <button
                        key={entry.action}
                        type="button"
                        disabled={!entry.allowed || busy}
                        title={entry.reason ?? undefined}
                        onClick={() => onActionClick(entry)}
                        className={
                          entry.action === "approve_implementation"
                            ? "ftc-btn-primary px-4"
                            : "ftc-btn-secondary px-4"
                        }
                      >
                        {AGENT_ROOM_ACTION_LABELS[entry.action]}
                      </button>
                    ))}
                </div>

                {stopAction?.allowed ? (
                  <button
                    type="button"
                    onClick={() => void runAction("stop")}
                    className="mt-3 w-full rounded-ftc-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.08em]"
                    style={{
                      background: "var(--ftc-color-danger)",
                      color: "var(--ftc-color-text-inverse)",
                    }}
                  >
                    Stop workflow
                  </button>
                ) : null}

                <ul className="mt-3 space-y-1">
                  {view?.actions
                    .filter((entry) => !entry.allowed && entry.reason)
                    .map((entry) => (
                      <li key={entry.action} className="text-[11px] text-ftc-text-muted">
                        {AGENT_ROOM_ACTION_LABELS[entry.action]}: {entry.reason}
                      </li>
                    ))}
                </ul>
              </Card>

              {pendingHandoff?.handoff ? (
                <Card title="Approve this handoff before it is sent">
                  <p className="text-sm text-ftc-text">
                    {AGENT_ROOM_ACTION_LABELS[pendingHandoff.action]} — sending{" "}
                    {pendingHandoff.handoff.totalChars.toLocaleString()} characters to{" "}
                    {pendingHandoff.handoff.provider} ({pendingHandoff.handoff.model}).
                  </p>
                  <p className="mt-1 text-xs text-ftc-text-secondary">
                    Only the task, the evidence attached to this session, and the previous reports
                    are included. No environment file, credential, cookie or automatic
                    repository scan is sent.
                  </p>
                  {pendingHandoff.handoff.redactedRules.length ? (
                    <p className="mt-1 text-xs" style={{ color: "var(--ftc-color-warning)" }}>
                      Secrets were redacted from this payload:{" "}
                      {pendingHandoff.handoff.redactedRules.join(", ")}
                    </p>
                  ) : null}
                  {pendingHandoff.handoff.truncated ? (
                    <p className="mt-1 text-xs" style={{ color: "var(--ftc-color-warning)" }}>
                      The payload hit the size limit and was truncated.
                    </p>
                  ) : null}

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-ftc-text-secondary">
                      Show the exact payload
                    </summary>
                    <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-ftc-sm border border-ftc-border-subtle p-2 font-mono text-[11px] text-ftc-text-muted">
                      {`SYSTEM\n${pendingHandoff.handoff.system}\n\nUSER\n${pendingHandoff.handoff.user}`}
                    </pre>
                  </details>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction(pendingHandoff.action)}
                      className="ftc-btn-primary px-4"
                    >
                      Send to {pendingHandoff.handoff.provider}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingHandoff(null)}
                      className="ftc-btn-secondary px-4"
                    >
                      Cancel
                    </button>
                  </div>
                </Card>
              ) : null}

              <div className="flex flex-col gap-4">
                {session.transcript.map((turn) => (
                  <TurnView key={turn.id} turn={turn} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
