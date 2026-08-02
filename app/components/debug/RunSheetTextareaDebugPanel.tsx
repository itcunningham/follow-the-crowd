"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { FTC_APP_VERSION, getFtcBuildId } from "@/lib/ftcAppVersion";

/**
 * TEMPORARY diagnostics for the Run Sheet textarea row caps.
 *
 * The caps measure correctly in Chromium but fail on physical iPhones, and
 * every hypothesis reachable from source has been eliminated: the pinned rules
 * are present in the production CSS, unlayered, `!important`, with no later
 * rule, media-query rule, shared textarea minimum or `field-sizing` overriding
 * them. What is missing is what WebKit actually computes on the device.
 *
 * This reads those values on the phone so they can be collected without a Mac
 * and a cable. One button takes the reading and puts it on the clipboard, so
 * the whole test is: type into both fields, tap once, paste. It only ever
 * reads — it never writes to the run sheet fields or changes their behaviour —
 * and it renders nothing at all unless the URL carries
 * `?ftcdebug=runsheet-textareas`.
 *
 * DELETE THIS FILE, and its single mount in app/events/[eventId]/page.tsx,
 * once the cause is identified.
 */

const DEBUG_FLAG_KEY = "ftcdebug";
const DEBUG_FLAG_VALUE = "runsheet-textareas";

/** How long the "Diagnostics copied" confirmation stays on screen. */
const CONFIRMATION_MS = 4000;

const BASE_SELECTOR = ".ftc-run-sheet-textarea";

const FIELDS = [
  { label: "Stage / Area", modifier: ".ftc-run-sheet-textarea-2", expectedRows: 2 },
  { label: "Notes", modifier: ".ftc-run-sheet-textarea-4", expectedRows: 4 },
] as const;

type FieldReading = {
  label: string;
  selector: string;
  found: number;
  values: Record<string, string>;
};

type Reading = {
  takenAt: string;
  environment: Record<string, string>;
  cssRules: Record<string, string>;
  fields: FieldReading[];
};

/**
 * Whether the device actually received the pinned rules. This separates "the
 * CSS never arrived" from "the CSS arrived and lost the cascade", which need
 * completely different fixes and which static analysis cannot tell apart.
 */
function readStyleSheetPresence(): Record<string, string> {
  const wanted = [BASE_SELECTOR, ...FIELDS.map((field) => field.modifier)];
  const found: Record<string, string> = {};

  for (const name of wanted) {
    found[name] = "NOT FOUND";
  }

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | undefined;

    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin stylesheet; skip rather than fail the whole reading.
      continue;
    }

    for (const rule of Array.from(rules ?? [])) {
      const text = rule.cssText ?? "";

      for (const name of wanted) {
        // Exact selector match so `-2` doesn't satisfy the base class check.
        if (text.startsWith(`${name} {`) || text.startsWith(`${name}{`)) {
          found[name] = text.length > 220 ? `${text.slice(0, 220)}…` : text;
        }
      }
    }
  }

  return found;
}

function readField(
  field: (typeof FIELDS)[number],
  cssRules: Record<string, string>,
): FieldReading {
  const selector = `textarea${field.modifier}`;
  const nodes = Array.from(document.querySelectorAll<HTMLTextAreaElement>(selector));
  const node = nodes[0];

  const cssPresence = {
    [`css rule ${BASE_SELECTOR}`]: cssRules[BASE_SELECTOR] === "NOT FOUND" ? "MISSING" : "present",
    [`css rule ${field.modifier}`]:
      cssRules[field.modifier] === "NOT FOUND" ? "MISSING" : "present",
  };

  if (!node) {
    return {
      label: field.label,
      selector,
      found: 0,
      values: { error: "no element matched this selector", ...cssPresence },
    };
  }

  const style = window.getComputedStyle(node);
  const lineHeight = parseFloat(style.lineHeight);
  const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const visibleRows =
    Number.isFinite(lineHeight) && lineHeight > 0
      ? ((node.clientHeight - paddingY) / lineHeight).toFixed(2)
      : "n/a (line-height not numeric)";

  return {
    label: field.label,
    selector,
    found: nodes.length,
    values: {
      className: node.className,
      "rows attr": String(node.rows),
      height: style.height,
      "min-height": style.minHeight,
      "max-height": style.maxHeight,
      clientHeight: `${node.clientHeight}`,
      scrollHeight: `${node.scrollHeight}`,
      "line-height": style.lineHeight,
      "font-size": style.fontSize,
      "padding t/b": `${style.paddingTop} / ${style.paddingBottom}`,
      "border t/b": `${style.borderTopWidth} / ${style.borderBottomWidth}`,
      "box-sizing": style.boxSizing,
      "overflow-y": style.overflowY,
      "VISIBLE ROWS": `${visibleRows}  (want ${field.expectedRows})`,
      ...cssPresence,
    },
  };
}

function takeReading(): Reading {
  const viewport = window.visualViewport;
  const cssRules = readStyleSheetPresence();

  return {
    takenAt: new Date().toISOString(),
    environment: {
      route: window.location.pathname,
      build: `${FTC_APP_VERSION} · ${getFtcBuildId()}`,
      "root font-size": window.getComputedStyle(document.documentElement).fontSize,
      "innerWidth x innerHeight": `${window.innerWidth} x ${window.innerHeight}`,
      "visualViewport w x h": viewport ? `${viewport.width} x ${viewport.height}` : "unavailable",
      "visualViewport scale": viewport ? String(viewport.scale) : "unavailable",
      devicePixelRatio: String(window.devicePixelRatio),
      userAgent: navigator.userAgent,
    },
    cssRules,
    fields: FIELDS.map((field) => readField(field, cssRules)),
  };
}

function formatReading(reading: Reading): string {
  const lines: string[] = ["FTC Run Sheet textarea diagnostics", `taken: ${reading.takenAt}`, ""];

  lines.push("[environment]");
  for (const [key, value] of Object.entries(reading.environment)) {
    lines.push(`  ${key}: ${value}`);
  }

  for (const field of reading.fields) {
    lines.push("", `[${field.label}]  (matched ${field.found} element(s))`);
    for (const [key, value] of Object.entries(field.values)) {
      lines.push(`  ${key}: ${value}`);
    }
  }

  lines.push("", "[css rules the device actually has]");
  for (const [key, value] of Object.entries(reading.cssRules)) {
    lines.push(`  ${key}: ${value}`);
  }

  return lines.join("\n");
}

export default function RunSheetTextareaDebugPanel() {
  const [enabled, setEnabled] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copyFailedText, setCopyFailedText] = useState<string | null>(null);
  const confirmationTimer = useRef<number | undefined>(undefined);

  // Read from location rather than useSearchParams so this needs no Suspense
  // boundary and cannot affect rendering for anyone without the flag.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get(DEBUG_FLAG_KEY) === DEBUG_FLAG_VALUE);
  }, []);

  useEffect(() => {
    return () => window.clearTimeout(confirmationTimer.current);
  }, []);

  const capture = useCallback(() => {
    // Measure and format synchronously: Safari only honours a clipboard write
    // inside the gesture's own task, so nothing may be awaited before it.
    const next = takeReading();
    const text = formatReading(next);

    setReading(next);
    window.clearTimeout(confirmationTimer.current);

    const failed = () => {
      setCopyFailedText(text);
      // The message points at the fallback box, so make sure it is on screen.
      setCollapsed(false);
      // Left on screen, not auto-dismissed: it is an instruction, not a receipt.
      setStatus("Copy blocked — select the text below and copy it manually");
    };

    if (!navigator.clipboard) {
      failed();
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopyFailedText(null);
      setStatus("Diagnostics copied");
      confirmationTimer.current = window.setTimeout(() => setStatus(null), CONFIRMATION_MS);
    }, failed);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Show something once the run sheet has loaded its rows. Measure only —
    // the clipboard write belongs to the button's gesture, not to load.
    const timer = window.setTimeout(() => setReading(takeReading()), 1200);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        right: 8,
        bottom: 8,
        zIndex: 2147483647,
        background: "#05070b",
        border: "1px solid #4fd1ff",
        borderRadius: 12,
        color: "#e6edf5",
        font: "11px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace",
        maxHeight: collapsed ? undefined : "62dvh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 32px rgb(0 0 0 / 0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderBottom: collapsed ? "none" : "1px solid #1e293b",
        }}
      >
        <button
          type="button"
          onClick={capture}
          style={{
            flex: 1,
            background: "#4fd1ff",
            color: "#05070b",
            border: "none",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Capture diagnostics
        </button>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          style={{
            background: "transparent",
            color: "#8e9aaf",
            border: "1px solid #1e293b",
            borderRadius: 8,
            padding: "10px 10px",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {status ? (
        <p
          style={{
            margin: 0,
            padding: "6px 10px",
            color: copyFailedText ? "#fbbf24" : "#34d399",
            fontWeight: 700,
          }}
          role="status"
        >
          {status}
        </p>
      ) : null}

      {collapsed ? null : (
        <div style={{ overflow: "auto", padding: "8px 10px" }}>
          {/* Shown only when the clipboard refused the write. */}
          {copyFailedText ? (
            <textarea
              readOnly
              value={copyFailedText}
              onFocus={(event) => event.currentTarget.select()}
              style={{
                width: "100%",
                height: 110,
                marginBottom: 8,
                background: "#0a0e14",
                color: "#e6edf5",
                border: "1px solid #fbbf24",
                borderRadius: 6,
                font: "10px/1.35 ui-monospace, monospace",
                padding: 6,
              }}
            />
          ) : null}

          {reading ? (
            <>
              {reading.fields.map((field) => (
                <div key={field.selector} style={{ marginBottom: 10 }}>
                  <div style={{ color: "#4fd1ff", fontWeight: 700 }}>
                    {field.label} — matched {field.found}
                  </div>
                  {Object.entries(field.values).map(([key, value]) => (
                    <div key={key} style={{ display: "flex", gap: 6, wordBreak: "break-all" }}>
                      <span style={{ color: "#8e9aaf", flex: "0 0 40%" }}>{key}</span>
                      <span style={{ flex: 1 }}>{value}</span>
                    </div>
                  ))}
                </div>
              ))}

              <div style={{ color: "#4fd1ff", fontWeight: 700 }}>environment</div>
              {Object.entries(reading.environment).map(([key, value]) => (
                <div key={key} style={{ wordBreak: "break-all" }}>
                  <span style={{ color: "#8e9aaf" }}>{key}: </span>
                  {value}
                </div>
              ))}
            </>
          ) : (
            <p style={{ margin: 0, color: "#8e9aaf" }}>Measuring…</p>
          )}
        </div>
      )}
    </div>
  );
}
