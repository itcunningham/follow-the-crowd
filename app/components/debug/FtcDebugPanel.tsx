"use client";

import { getDeployedCommitSha } from "@/lib/debug/ftcDebugPanel";

type FtcDebugPanelProps = {
  title: string;
  fields: Record<string, string | number | boolean | null | undefined>;
};

export default function FtcDebugPanel({ title, fields }: FtcDebugPanelProps) {
  return (
    <section
      aria-label={`${title} debug`}
      className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-[10px] leading-relaxed text-ftc-text-secondary"
    >
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">
        {title} (debug)
      </p>
      <dl className="grid gap-0.5 font-mono">
        <div>
          <dt className="inline">deployedCommit: </dt>
          <dd className="inline text-ftc-text">{getDeployedCommitSha()}</dd>
        </div>
        {Object.entries(fields).map(([key, value]) => (
          <div key={key}>
            <dt className="inline">{key}: </dt>
            <dd className="inline break-all text-ftc-text">
              {value === null || value === undefined ? "null" : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
