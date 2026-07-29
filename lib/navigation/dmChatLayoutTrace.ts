import { readFixedChatLayoutDiagnostics } from "@/lib/navigation/prepareFixedChatPageMount";

export type DmChatLayoutTraceEntry = {
  phase: string;
  routeKey: string;
  timestamp: number;
  composerToNavGapPx: number | null;
  composerBottom: number | null;
  navTop: number | null;
  shellBottom: number | null;
  columnPaddingBottom: string | null;
  documentScroll: ReturnType<typeof readFixedChatLayoutDiagnostics>;
  extra?: Record<string, unknown>;
};

const TRACE_FLAG_KEY = "ftc-dm-layout-trace-enabled";
const TRACE_LOG_KEY = "ftc-dm-layout-trace-log";

function isTraceEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  try {
    return sessionStorage.getItem(TRACE_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

function readComposerLayoutMetrics(): Pick<
  DmChatLayoutTraceEntry,
  "composerToNavGapPx" | "composerBottom" | "navTop" | "shellBottom" | "columnPaddingBottom"
> {
  if (typeof document === "undefined") {
    return {
      composerToNavGapPx: null,
      composerBottom: null,
      navTop: null,
      shellBottom: null,
      columnPaddingBottom: null,
    };
  }

  const composerInput = document.querySelector<HTMLTextAreaElement>(
    'textarea[placeholder="Message"]',
  );
  const composerRoot =
    composerInput?.closest("div.shrink-0.border-t") ?? composerInput?.parentElement ?? null;
  const nav = document.querySelector(".ftc-mobile-nav-bar");
  const shell = document.querySelector(".fixed.inset-x-0.top-0, .fixed.inset-0");
  const column = document.querySelector(".ftc-mobile-nav-offset");

  const composerRect = composerRoot?.getBoundingClientRect() ?? null;
  const navRect = nav?.getBoundingClientRect() ?? null;
  const shellRect = shell?.getBoundingClientRect() ?? null;

  return {
    composerToNavGapPx:
      composerRect && navRect ? Math.round(navRect.top - composerRect.bottom) : null,
    composerBottom: composerRect ? Math.round(composerRect.bottom) : null,
    navTop: navRect ? Math.round(navRect.top) : null,
    shellBottom: shellRect ? Math.round(shellRect.bottom) : null,
    columnPaddingBottom: column ? getComputedStyle(column).paddingBottom : null,
  };
}

/** Log DM chat layout lifecycle + geometry for normal-open vs return-path comparison. */
export function traceDmChatLayout(
  phase: string,
  routeKey: string,
  extra?: Record<string, unknown>,
): void {
  if (!isTraceEnabled()) {
    return;
  }

  const entry: DmChatLayoutTraceEntry = {
    phase,
    routeKey,
    timestamp: Date.now(),
    ...readComposerLayoutMetrics(),
    documentScroll: readFixedChatLayoutDiagnostics(),
    extra,
  };

  console.info("[ftc-dm-layout-trace]", entry);

  try {
    const previous = JSON.parse(sessionStorage.getItem(TRACE_LOG_KEY) ?? "[]") as
      | DmChatLayoutTraceEntry[]
      | string;

    const entries = Array.isArray(previous) ? previous : [];
    entries.push(entry);
    sessionStorage.setItem(TRACE_LOG_KEY, JSON.stringify(entries.slice(-40)));
  } catch {
    // Ignore trace persistence failures.
  }
}

export function clearDmChatLayoutTrace(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.removeItem(TRACE_LOG_KEY);
  sessionStorage.removeItem(TRACE_FLAG_KEY);
}
