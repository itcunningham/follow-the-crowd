"use client";

/**
 * FTC Agent Room — the supervisor's panel.
 *
 * The agents hand work to each other. Isaac's job here is to start a run and
 * then answer the questions that are genuinely his: a product decision, a real
 * choice between implementations, the release call, or a blocker.
 *
 * The red STOP button is available on any live session, and the exact payload
 * of the next agent turn is always inspectable — it just no longer blocks the
 * workflow unless Isaac switches handoffs to "review each one".
 *
 * Layout is single-column at 390px and two-column from `lg`; every control and
 * every panel is present at both widths.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ESCALATION_LABELS } from "@/lib/agentRoom/roles";
import { sessionToMarkdown } from "@/lib/agentRoom/transcript";
import type { AgentRoomSessionSummary } from "@/lib/agentRoom/types";
import type { AgentRoomConfigView, AgentRoomSessionView } from "@/lib/agentRoom/view";
import {
  AGENT_ROOM_ACTION_LABELS,
  AGENT_ROOM_STAGE_LABELS,
  type AgentRoomAction,
} from "@/lib/agentRoom/workflow";
import DecisionLog from "./DecisionLog";
import Timeline from "./Timeline";
import { Badge, Card, formatUsd, inputClass, monoInputClass } from "./ui";

const API = "/api/dev/agent-room";

type ApiPayload = AgentRoomSessionView & {
  error?: string;
  notice?: string;
  hops?: number;
};

type EvidenceKind = "note" | "file" | "diff" | "search";

export default function AgentRoomClient() {
  const [tab, setTab] = useState<"room" | "log">("room");
  const [sessions, setSessions] = useState<AgentRoomSessionSummary[]>([]);
  const [config, setConfig] = useState<AgentRoomConfigView | null>(null);
  const [view, setView] = useState<AgentRoomSessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [runningLabel, setRunningLabel] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showPayload, setShowPayload] = useState(false);

  const [decisionNote, setDecisionNote] = useState("");
  const [escalationAnswer, setEscalationAnswer] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [newContext, setNewContext] = useState("");

  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>("note");
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
    if (runningLabel === null) {
      setElapsedMs(0);
      return;
    }

    startedAtRef.current = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - (startedAtRef.current ?? Date.now()));
    }, 100);

    return () => window.clearInterval(timer);
  }, [runningLabel]);

  const call = useCallback(
    async (path: string, init: RequestInit | undefined, label: string | null) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      setRunningLabel(label);

      try {
        const response = await fetch(path, { cache: "no-store", ...init });
        const text = await response.text();
        const data = text ? (JSON.parse(text) as ApiPayload) : null;

        if (data?.session) {
          setView({
            session: data.session,
            actions: data.actions,
            route: data.route,
            config: data.config,
          });
          setNotice(data.notice ?? null);
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
        setRunningLabel(null);
      }
    },
    [refreshSessions],
  );

  const session = view?.session ?? null;
  const route = view?.route ?? null;
  const escalation = session?.escalation?.required ? session.escalation : null;

  const actionAllowed = useCallback(
    (action: AgentRoomAction) =>
      view?.actions.find((entry) => entry.action === action)?.allowed ?? false,
    [view],
  );

  async function runAction(action: AgentRoomAction, note?: string) {
    if (!session) {
      return;
    }

    const ok = await call(
      `${API}/${session.id}/action`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note ?? decisionNote }),
      },
      action === "advance" ? (route?.roleLabel ?? "agent") : null,
    );

    if (ok) {
      setDecisionNote("");
      setEscalationAnswer("");
      setShowPayload(false);
    }
  }

  /**
   * Manual mode: record the approval, then run the turn it authorises. The
   * server refuses `advance` until that approval exists, so this pair is the
   * whole of "review each handoff" rather than a client-side courtesy.
   */
  async function approveAndAdvance() {
    if (!session) {
      return;
    }

    const approved = await call(
      `${API}/${session.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approveNextHandoff: true }),
      },
      null,
    );

    if (approved) {
      await runAction("advance");
    }
  }

  async function runToDecision() {
    if (!session) {
      return;
    }

    await call(`${API}/${session.id}/run`, { method: "POST" }, "the agents");
    setShowPayload(false);
  }

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
    if (!session) {
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
      `${API}/${session.id}/evidence`,
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

  async function setApprovalMode(mode: "auto" | "manual") {
    if (!session) {
      return;
    }

    await call(
      `${API}/${session.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handoffApproval: mode }),
      },
      null,
    );
  }

  async function copyTranscript() {
    if (!session) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sessionToMarkdown(session));
      setNotice("Full transcript copied to the clipboard.");
    } catch {
      setError("The browser refused clipboard access. Use Export Markdown instead.");
    }
  }

  const manualMode = session?.handoffApproval === "manual";
  const canAdvance = actionAllowed("advance");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 pb-24">
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
          The agents investigate, review, plan and assess. They cannot edit, commit, push,
          deploy or run SQL — implementation happens in a worktree, by you.
        </p>
        {config ? (
          <p className="mt-2 text-[11px] text-ftc-text-muted">
            Claude: <span className="text-ftc-text-secondary">{config.anthropicModel}</span>
            {config.anthropicKeyPresent ? "" : " (no key)"} · OpenAI:{" "}
            <span className="text-ftc-text-secondary">{config.openaiModel}</span>
            {config.openaiKeyPresent ? "" : " (no key)"} · {config.maxReviewRounds} review
            rounds · {config.maxAutoHops} automatic turns
          </p>
        ) : null}

        <div className="mt-3 flex gap-2">
          {(["room", "log"] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setTab(entry)}
              className={tab === entry ? "ftc-btn-primary px-4" : "ftc-btn-secondary px-4"}
            >
              {entry === "room" ? "Room" : "Decision log"}
            </button>
          ))}
        </div>
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
          style={{
            borderColor: "var(--ftc-color-primary-border)",
            color: "var(--ftc-color-primary)",
          }}
        >
          {notice}
        </p>
      ) : null}

      {tab === "log" ? (
        <DecisionLog />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* ----------------------------------------------------------- */}
          {/* Left rail                                                    */}
          {/* ----------------------------------------------------------- */}
          <div className="flex flex-col gap-4">
            <Card title="Sessions">
              {sessions.length === 0 ? (
                <p className="text-sm text-ftc-text-muted">No sessions yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {sessions.map((entry) => (
                    <li key={entry.id} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => void call(`${API}/${entry.id}`, undefined, null)}
                        className="min-w-0 flex-1 rounded-ftc-sm px-2 py-1.5 text-left text-sm text-ftc-text hover:bg-ftc-bg-elevated"
                      >
                        <span className="block truncate">{entry.title}</span>
                        <span className="block text-[11px] text-ftc-text-muted">
                          {AGENT_ROOM_STAGE_LABELS[entry.stage]}
                        </span>
                      </button>
                      {entry.needsIsaac ? <Badge text="You" tone="warn" /> : null}
                      <button
                        type="button"
                        onClick={() => {
                          void call(`${API}/${entry.id}`, { method: "DELETE" }, null).then(
                            () => {
                              setView((current) =>
                                current?.session.id === entry.id ? null : current,
                              );
                            },
                          );
                        }}
                        className="shrink-0 text-[11px] text-ftc-text-muted underline"
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
                  className={inputClass}
                />
                <textarea
                  value={newDescription}
                  onChange={(event) => setNewDescription(event.target.value)}
                  placeholder="Bug description"
                  rows={5}
                  className={inputClass}
                />
                <input
                  value={newBranch}
                  onChange={(event) => setNewBranch(event.target.value)}
                  placeholder="Relevant branch / worktree"
                  className={inputClass}
                />
                <textarea
                  value={newContext}
                  onChange={(event) => setNewContext(event.target.value)}
                  placeholder="Screenshots / context notes (describe them — no images are uploaded)"
                  rows={3}
                  className={inputClass}
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
                    onChange={(event) => setEvidenceKind(event.target.value as EvidenceKind)}
                    className={inputClass}
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
                        className={inputClass}
                      />
                      <textarea
                        value={evidenceText}
                        onChange={(event) => setEvidenceText(event.target.value)}
                        placeholder="Paste the evidence"
                        rows={5}
                        className={monoInputClass}
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
                      className={monoInputClass}
                    />
                  ) : null}

                  {evidenceKind === "file" ? (
                    <div className="flex gap-2">
                      <input
                        value={evidenceStart}
                        onChange={(event) => setEvidenceStart(event.target.value)}
                        placeholder="From line"
                        inputMode="numeric"
                        className={inputClass}
                      />
                      <input
                        value={evidenceEnd}
                        onChange={(event) => setEvidenceEnd(event.target.value)}
                        placeholder="To line"
                        inputMode="numeric"
                        className={inputClass}
                      />
                    </div>
                  ) : null}

                  {evidenceKind === "search" ? (
                    <input
                      value={evidenceQuery}
                      onChange={(event) => setEvidenceQuery(event.target.value)}
                      placeholder="Exact text to search for"
                      className={monoInputClass}
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
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Right: status, escalation, controls, timeline                */}
          {/* ----------------------------------------------------------- */}
          <div className="flex min-w-0 flex-col gap-4">
            {!session ? (
              <Card title="No session open">
                <p className="text-sm text-ftc-text-secondary">
                  Create a task, or open a session. The agents will take it from there and
                  only come back to you when a decision is genuinely yours.
                </p>
              </Card>
            ) : (
              <>
                <Card title="Status">
                  <p className="text-base font-semibold text-ftc-text">{session.title}</p>
                  <p className="mt-1 text-sm text-ftc-text-secondary">
                    {AGENT_ROOM_STAGE_LABELS[session.stage]}
                  </p>

                  <p className="mt-2 text-sm" style={{ color: "var(--ftc-color-primary)" }}>
                    {route?.roleLabel ? `Next: ${route.roleLabel}` : "Next: you"} —{" "}
                    <span className="text-ftc-text-secondary">{route?.reason}</span>
                  </p>

                  <p className="mt-2 text-[11px] text-ftc-text-muted">
                    {session.reviewRounds}/{view?.config.maxReviewRounds} review rounds ·{" "}
                    {session.builderPasses}/{view?.config.maxBuilderPasses} builder passes ·{" "}
                    {session.autoHops}/{view?.config.maxAutoHops} agent turns ·{" "}
                    {session.totals.inputTokens} in / {session.totals.outputTokens} out ·{" "}
                    {formatUsd(session.totals.estimatedUsd)}
                    {session.branch ? ` · ${session.branch}` : ""}
                  </p>

                  {runningLabel ? (
                    <p className="mt-3 text-sm" style={{ color: "var(--ftc-color-primary)" }}>
                      Running {runningLabel} — {(elapsedMs / 1000).toFixed(1)}s elapsed
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyTranscript()}
                      className="ftc-btn-secondary px-3"
                    >
                      Copy transcript
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

                {escalation ? (
                  <Card
                    title={`The agents need you — ${ESCALATION_LABELS[escalation.type]}`}
                    tone="isaac"
                  >
                    <p className="text-sm text-ftc-text">{escalation.question}</p>

                    {escalation.options.length ? (
                      <div className="mt-3 flex flex-col gap-2">
                        {escalation.options.map((option, index) => (
                          <button
                            key={`${option}-${index}`}
                            type="button"
                            disabled={busy}
                            onClick={() => void runAction("resolve_escalation", option)}
                            className="ftc-btn-secondary px-4 text-left"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <textarea
                      value={escalationAnswer}
                      onChange={(event) => setEscalationAnswer(event.target.value)}
                      placeholder="Or write your own answer — the agents carry on with it"
                      rows={2}
                      className={`${inputClass} mt-3`}
                    />
                    <button
                      type="button"
                      disabled={busy || !escalationAnswer.trim()}
                      onClick={() => void runAction("resolve_escalation", escalationAnswer)}
                      className="ftc-btn-primary mt-2 px-4"
                    >
                      Send answer and continue
                    </button>
                  </Card>
                ) : null}

                <Card title="Controls" tone="isaac">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canAdvance || busy}
                      onClick={() =>
                        manualMode ? setShowPayload(true) : void runToDecision()
                      }
                      className="ftc-btn-primary px-4"
                    >
                      {manualMode ? "Review next handoff" : "Run to next decision"}
                    </button>
                    <button
                      type="button"
                      disabled={!canAdvance || busy}
                      onClick={() =>
                        manualMode ? setShowPayload(true) : void runAction("advance")
                      }
                      className="ftc-btn-secondary px-4"
                    >
                      Run one step
                    </button>
                    {(
                      [
                        "approve_implementation",
                        "request_more_evidence",
                        "reject_diagnosis",
                        "generate_summary",
                      ] as const
                    ).map((action) => (
                      <button
                        key={action}
                        type="button"
                        disabled={!actionAllowed(action) || busy}
                        onClick={() => void runAction(action)}
                        className="ftc-btn-secondary px-4"
                      >
                        {AGENT_ROOM_ACTION_LABELS[action]}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    placeholder="Optional note recorded with your next decision"
                    rows={2}
                    className={`${inputClass} mt-3`}
                  />

                  {actionAllowed("stop") ? (
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

                  <div
                    role="group"
                    aria-label="Handoff approval"
                    className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ftc-text-muted"
                  >
                    <span id="ftc-handoff-mode-label">Handoffs:</span>
                    {(["auto", "manual"] as const).map((mode) => {
                      const selected = session.handoffApproval === mode;

                      return (
                        <button
                          key={mode}
                          type="button"
                          // The selected mode is carried by the button's own
                          // pressed state, a filled background and a tick — not
                          // by colour, which a colour-blind reader cannot use
                          // and a screen reader cannot see at all.
                          aria-pressed={selected}
                          onClick={() => void setApprovalMode(mode)}
                          className={`${
                            selected ? "ftc-btn-primary" : "ftc-btn-secondary"
                          } px-3 py-1 text-[11px]`}
                        >
                          {selected ? "✓ " : ""}
                          {mode === "auto" ? "run automatically" : "review each one"}
                        </button>
                      );
                    })}
                  </div>

                  {view?.actions.some((entry) => !entry.allowed && entry.reason) ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] text-ftc-text-muted">
                        Why some controls are unavailable
                      </summary>
                      <ul className="mt-1 space-y-1">
                        {view.actions
                          .filter((entry) => !entry.allowed && entry.reason)
                          .map((entry) => (
                            <li key={entry.action} className="text-[11px] text-ftc-text-muted">
                              {AGENT_ROOM_ACTION_LABELS[entry.action]}: {entry.reason}
                            </li>
                          ))}
                      </ul>
                    </details>
                  ) : null}
                </Card>

                {showPayload && route?.handoff ? (
                  <Card title="Next handoff — approve before it is sent">
                    <p className="text-sm text-ftc-text">
                      {route.handoff.roleLabel} —{" "}
                      {route.handoff.totalChars.toLocaleString()} characters to{" "}
                      {route.handoff.provider} ({route.handoff.model}).
                    </p>
                    <p className="mt-1 text-xs text-ftc-text-secondary">
                      Only the task, the evidence attached to this session, the previous
                      reports and your earlier answers are included. No environment file,
                      credential, cookie or automatic repository scan is sent.
                    </p>
                    {route.handoff.redactedRules.length ? (
                      <p className="mt-1 text-xs" style={{ color: "var(--ftc-color-warning)" }}>
                        Secrets redacted from this payload:{" "}
                        {route.handoff.redactedRules.join(", ")}
                      </p>
                    ) : null}
                    {route.handoff.truncated ? (
                      <p className="mt-1 text-xs" style={{ color: "var(--ftc-color-warning)" }}>
                        The payload hit the size limit and was truncated.
                      </p>
                    ) : null}

                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-ftc-text-secondary">
                        Show the exact payload
                      </summary>
                      <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-ftc-sm border border-ftc-border-subtle p-2 font-mono text-[11px] text-ftc-text-muted">
                        {`SYSTEM\n${route.handoff.system}\n\nUSER\n${route.handoff.user}`}
                      </pre>
                    </details>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void approveAndAdvance()}
                        className="ftc-btn-primary px-4"
                      >
                        Approve and send to {route.handoff.provider}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPayload(false)}
                        className="ftc-btn-secondary px-4"
                      >
                        Cancel
                      </button>
                    </div>
                  </Card>
                ) : null}

                <Card title="Timeline">
                  <Timeline turns={session.transcript} />
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
