"use client";

/**
 * FTC Agent Room — shared presentational pieces.
 *
 * Small, dumb components reused by the timeline, the decision log and the
 * shell, so the three panels cannot drift apart visually. Everything uses the
 * existing `.ftc-*` tokens; no new design language is introduced here.
 */

import type { AgentRole } from "@/lib/agentRoom/roles";

export type CardTone = "default" | "claude" | "openai" | "isaac" | "alert";

export function accentFor(tone: CardTone): string {
  switch (tone) {
    case "claude":
      return "var(--ftc-color-primary)";
    case "openai":
      return "var(--ftc-color-success)";
    case "isaac":
      return "var(--ftc-color-warning)";
    case "alert":
      return "var(--ftc-color-danger)";
    default:
      return "var(--ftc-color-border-strong)";
  }
}

export function Card({
  title,
  children,
  tone = "default",
  right,
}: {
  title?: string;
  children: React.ReactNode;
  tone?: CardTone;
  right?: React.ReactNode;
}) {
  return (
    <section
      className="rounded-ftc-lg border bg-ftc-surface p-4"
      style={{
        borderColor: "var(--ftc-color-border-subtle)",
        borderLeft: `3px solid ${accentFor(tone)}`,
      }}
    >
      {title ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ftc-text-section-label">
            {title}
          </h2>
          {right}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Bullets({ label, items }: { label: string; items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ftc-text-muted">
        {label}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ftc-text">
        {items.map((item, index) => (
          <li key={`${label}-${index}`} className="break-words">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  if (!value) {
    return null;
  }

  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ftc-text-muted">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ftc-text">{value}</p>
    </div>
  );
}

export type BadgeTone = "good" | "warn" | "bad" | "neutral";

export function Badge({ text, tone }: { text: string; tone: BadgeTone }) {
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

/** Round marker carrying an agent's initials, like an avatar in a chat thread. */
export function RoleChip({ initials, tone }: { initials: string; tone: CardTone }) {
  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
      style={{
        border: `1px solid ${accentFor(tone)}`,
        color: accentFor(tone),
      }}
    >
      {initials}
    </span>
  );
}

export function formatUsd(value: number | null): string {
  return value === null ? "cost estimate unavailable" : `~$${value.toFixed(4)}`;
}

export function riskTone(level: string): BadgeTone {
  return level === "high" ? "bad" : level === "medium" ? "warn" : "good";
}

export function verdictTone(verdict: string): BadgeTone {
  if (verdict === "AGREE" || verdict === "READY") {
    return "good";
  }

  if (verdict === "REJECT" || verdict === "BLOCKED") {
    return "bad";
  }

  return "warn";
}

/** Which side of the room a role sits on, for the accent colour. */
export function toneForRole(role: AgentRole | null, actor: string): CardTone {
  if (actor === "isaac") {
    return "isaac";
  }

  if (actor === "system") {
    return "default";
  }

  return role === "reviewer" || role === "qa" ? "openai" : "claude";
}

export const inputClass =
  "w-full rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 text-sm text-ftc-text";

export const monoInputClass =
  "w-full rounded-ftc-sm border border-ftc-border bg-ftc-surface-raised px-3 py-2 font-mono text-xs text-ftc-text";
