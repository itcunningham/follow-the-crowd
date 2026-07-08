"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FTC_CANONICAL_HOST,
  isPreviewDeploymentHost,
} from "@/lib/debug/ftcDeployment";
import { getDeployedCommitSha } from "@/lib/debug/ftcDebugPanel";
import { useFtcDebugPanelEnabled } from "@/app/components/debug/useFtcDebugPanelEnabled";

export default function FtcDeploymentBanner() {
  const showDebug = useFtcDebugPanelEnabled();
  const [hostname, setHostname] = useState<string | null>(null);

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  if (!showDebug || !hostname) {
    return null;
  }

  const deployedCommit = getDeployedCommitSha();
  const onPreviewHost = isPreviewDeploymentHost(hostname);

  return (
    <div
      className={`border-b px-4 py-2 text-center text-[11px] leading-relaxed sm:px-6 ${
        onPreviewHost
          ? "border-[var(--ftc-color-danger)]/40 bg-[var(--ftc-color-danger)]/10 text-[var(--ftc-color-danger)]"
          : "border-amber-500/30 bg-amber-500/5 text-amber-100/90"
      }`}
    >
      <p className="font-mono">
        build <span className="font-semibold text-ftc-text">{deployedCommit}</span>
        {" · "}
        host <span className="font-semibold text-ftc-text">{hostname}</span>
      </p>
      {onPreviewHost ? (
        <p className="mt-1">
          Old preview deployment — use{" "}
          <Link href={`https://${FTC_CANONICAL_HOST}`} className="font-semibold underline">
            {FTC_CANONICAL_HOST}
          </Link>{" "}
          for current production.
        </p>
      ) : null}
    </div>
  );
}
