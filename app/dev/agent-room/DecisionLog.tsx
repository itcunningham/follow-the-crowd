"use client";

/**
 * FTC Agent Room — the Decision Log panel.
 *
 * Records are written automatically when a session ends. The two fields the
 * agents cannot know — the commits that carried the fix and what happened at
 * release — are edited here by Isaac, inline, without leaving the log.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AGENT_ROLE_LABELS } from "@/lib/agentRoom/roles";
import type { DecisionLogRecord } from "@/lib/agentRoom/types";
import { AGENT_ROOM_STAGE_LABELS } from "@/lib/agentRoom/workflow";
import { Bullets, Card, Field, inputClass, monoInputClass } from "./ui";

const API = "/api/dev/agent-room/decisions";

function RecordCard({
  record,
  onSaved,
}: {
  record: DecisionLogRecord;
  onSaved: (updated: DecisionLogRecord) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [commits, setCommits] = useState(record.implementationCommits.join("\n"));
  const [releaseOutcome, setReleaseOutcome] = useState(record.releaseOutcome);
  const [followUps, setFollowUps] = useState(record.followUpItems.join("\n"));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);

    try {
      const response = await fetch(`${API}/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          implementationCommits: commits,
          releaseOutcome,
          followUpItems: followUps,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { record: DecisionLogRecord };
        onSaved(data.record);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={record.issueTitle} tone="default">
      <p className="mb-3 text-[11px] text-ftc-text-muted">
        {new Date(record.timestamp).toLocaleString()} ·{" "}
        {AGENT_ROOM_STAGE_LABELS[record.stage]}
        {record.branch ? ` · ${record.branch}` : ""}
      </p>

      <Field label="Root cause" value={record.rootCause} />
      <Field label="Evidence" value={record.evidenceSummary} />
      <Field label="Final decision" value={record.finalDecision} />
      <Field label="Verification performed" value={record.verificationPerformed} />
      <Bullets
        label="Agents"
        items={record.participatingAgents.map((role) => AGENT_ROLE_LABELS[role])}
      />

      {editing ? (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-[0.06em] text-ftc-text-muted">
            Implementation commits — one per line
            <textarea
              value={commits}
              onChange={(event) => setCommits(event.target.value)}
              rows={3}
              className={`${monoInputClass} mt-1`}
              placeholder="ea88dee Record the Crew Chat media release"
            />
          </label>
          <label className="text-[11px] uppercase tracking-[0.06em] text-ftc-text-muted">
            Release outcome
            <textarea
              value={releaseOutcome}
              onChange={(event) => setReleaseOutcome(event.target.value)}
              rows={2}
              className={`${inputClass} mt-1`}
              placeholder="Shipped to Production as 49135c8; verified on two iPhones."
            />
          </label>
          <label className="text-[11px] uppercase tracking-[0.06em] text-ftc-text-muted">
            Follow-up items — one per line
            <textarea
              value={followUps}
              onChange={(event) => setFollowUps(event.target.value)}
              rows={2}
              className={`${inputClass} mt-1`}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="ftc-btn-primary px-4"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="ftc-btn-secondary px-4"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <Bullets label="Implementation commits" items={record.implementationCommits} />
          <Field label="Release outcome" value={record.releaseOutcome} />
          <Bullets label="Follow-up items" items={record.followUpItems} />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ftc-btn-secondary px-4"
          >
            {record.implementationCommits.length || record.releaseOutcome
              ? "Edit commits / release outcome"
              : "Add commits / release outcome"}
          </button>
        </>
      )}
    </Card>
  );
}

export default function DecisionLog() {
  const [records, setRecords] = useState<DecisionLogRecord[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Generation guard. Typing fires one request per debounce window, and those
   * requests can resolve out of order — an earlier, slower search would
   * otherwise overwrite the results of a later one, leaving the list showing
   * answers to a query the box no longer contains. Only the newest request may
   * write state. (Measured: searching "parity" showed 0 records because the
   * previous query's response landed second.)
   */
  const generationRef = useRef(0);

  const load = useCallback(async (search: string) => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;

    setLoading(true);

    try {
      const response = await fetch(`${API}?q=${encodeURIComponent(search)}`, {
        cache: "no-store",
      });

      if (response.ok && generationRef.current === generation) {
        const data = (await response.json()) as { records: DecisionLogRecord[] };
        setRecords(data.records);
      }
    } finally {
      if (generationRef.current === generation) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Debounced so typing does not fire a request per keystroke.
    const timer = window.setTimeout(() => void load(query), 200);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  return (
    <div className="flex flex-col gap-4">
      <Card title="Decision log">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search cause, decision, branch, agent, commit…"
          className={inputClass}
        />
        <p className="mt-2 text-[11px] text-ftc-text-muted">
          {loading
            ? "Searching…"
            : `${records.length} record${records.length === 1 ? "" : "s"}`}
          {" · "}
          <a
            href={`${API}?format=markdown&q=${encodeURIComponent(query)}`}
            className="underline"
          >
            Export Markdown
          </a>
        </p>
      </Card>

      {records.length === 0 && !loading ? (
        <Card>
          <p className="text-sm text-ftc-text-muted">
            Nothing logged yet. A record is written automatically the first time a session
            is approved, rejected or stopped.
          </p>
        </Card>
      ) : null}

      {records.map((record) => (
        <RecordCard
          key={record.id}
          record={record}
          onSaved={(updated) =>
            setRecords((current) =>
              current.map((entry) => (entry.id === updated.id ? updated : entry)),
            )
          }
        />
      ))}
    </div>
  );
}
