"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * TEMPORARY diagnostics for the Run Sheet textarea row caps.
 *
 * The caps measure correctly in Chromium but fail on physical iPhones, and
 * every hypothesis reachable from source has been eliminated: the pinned rules
 * are present in the production CSS, unlayered, `!important`, with no later
 * rule, media-query rule, shared textarea minimum or `field-sizing` overriding
 * them. What is missing is what WebKit actually computes on the device.
 *
 * This reads those values on screen so they can be collected from the phone
 * without a Mac and a cable. It only ever reads — it never writes to the run
 * sheet fields or changes their behaviour — and it renders nothing at all
 * unless the URL carries `?ftcdebug=runsheet-textareas`.
 *
 * DELETE THIS FILE, and its single mount in app/events/[eventId]/page.tsx,
 * once the cause is identified.
 */

const DEBUG_FLAG_KEY = "ftcdebug";
const DEBUG_FLAG_VALUE = "runsheet-textareas";

const FIELDS = [
  { label: "Stage / Area", selector: "textarea.ftc-run-sheet-textarea-2", expectedRows: 2 },
  { label: "Notes", selector: "textarea.ftc-run-sheet-textarea-4", expectedRows: 4 },
] as const;

type FieldReading = {
  label: string;
  selector: string;
  expectedRows: number;
  found: number;
  values: Record<string, string>;
};

type Reading = {
  takenAt: string;
  environment: Record<string, string>;
  cssRulesSeenByTheDevice: Record<string, string>;
  fields: FieldReading[];
};

/**
 * Whether the device actually received the pinned rules. This separates "the
 * CSS never arrived" from "the CSS arrived and lost the cascade", which need
 * completely different fixes.
 */
function readStyleSheetPresence(): Record<string, string> {
  const wanted = [
    ".ftc-run-sheet-textarea",
    ".ftc-run-sheet-textarea-2",
    ".ftc-run-sheet-textarea-4",
  ];
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

function readField(field: (typeof FIELDS)[number]): FieldReading {
  const nodes = Array.from(document.querySelectorAll<HTMLTextAreaElement>(field.selector));
  const node = nodes[0];

  if (!node) {
    return {
      label: field.label,
      selector: field.selector,
      expectedRows: field.expectedRows,
      found: 0,
      values: { error: "no element matched this selector" },
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
    selector: field.selector,
    expectedRows: field.expectedRows,
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
    },
  };
}

function takeReading(): Reading {
  const viewport = window.visualViewport;

  return {
    takenAt: new Date().toISOString(),
    environment: {
      "root font-size": window.getComputedStyle(document.documentElement).fontSize,
      "innerWidth x innerHeight": `${window.innerWidth} x ${window.innerHeight}`,
      "visualViewport w x h": viewport ? `${viewport.width} x ${viewport.height}` : "unavailable",
      "visualViewport scale": viewport ? String(viewport.scale) : "unavailable",
      devicePixelRatio: String(window.devicePixelRatio),
      userAgent: navigator.userAgent,
    },
    cssRulesSeenByTheDevice: readStyleSheetPresence(),
    fields: FIELDS.map(readField),
  };
}

function formatReading(reading: Reading): string {
  const lines: string[] = ["FTC Run Sheet textarea diagnostics", `taken: ${reading.takenAt}`, ""];

  lines.push("[environment]");
  for (const [key, value] of Object.entries(reading.environment)) {
    lines.push(`  ${key}: ${value}`);
  }

  lines.push("", "[css rules the device actually has]");
  for (const [key, value] of Object.entries(reading.cssRulesSeenByTheDevice)) {
    lines.push(`  ${key}: ${value}`);
  }

  for (const field of reading.fields) {
    lines.push("", `[${field.label}]  (matched ${field.found} element(s))`);
    for (const [key, value] of Object.entries(field.values)) {
      lines.push(`  ${key}: ${value}`);
    }
  }

  return lines.join("\n");
}

export default function RunSheetTextareaDebugPanel() {
  const [enabled, setEnabled] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [copyState, setCopyState] = useState<string | null>(null);

  // Read from location rather than useSearchParams so this needs no Suspense
  // boundary and cannot affect rendering for anyone without the flag.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEnabled(params.get(DEBUG_FLAG_KEY) === DEBUG_FLAG_VALUE);
  }, []);

  const refresh = useCallback(() => {
    setReading(takeReading());
    setCopyState(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Let the run sheet finish loading its rows before the first measurement.
    const timer = window.setTimeout(refresh, 1200);
    return () => window.clearTimeout(timer);
  }, [enabled, refresh]);

  if (!enabled) {
    return null;
  }

  const text = reading ? formatReading(reading) : "";

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("Copied");
    } catch {
      setCopyState("Copy blocked — select the text below and copy manually");
    }
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
          gap: 6,
          padding: "8px 10px",
          borderBottom: collapsed ? "none" : "1px solid #1e293b",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ color: "#4fd1ff", fontSize: 11 }}>Run Sheet textarea debug</strong>
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button type="button" onClick={refresh} style={buttonStyle}>
            Refresh
          </button>
          <button type="button" onClick={() => void copyAll()} style={buttonStyle}>
            Copy all
          </button>
          <button type="button" onClick={() => setCollapsed((v) => !v)} style={buttonStyle}>
            {collapsed ? "Show" : "Hide"}
          </button>
        </span>
      </div>

      {collapsed ? null : (
        <div style={{ overflow: "auto", padding: "8px 10px" }}>
          {copyState ? (
            <p style={{ margin: "0 0 6px", color: "#34d399" }}>{copyState}</p>
          ) : null}

          {reading?.fields.map((field) => (
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

          {reading ? (
            <>
              <div style={{ color: "#4fd1ff", fontWeight: 700 }}>css rules on device</div>
              {Object.entries(reading.cssRulesSeenByTheDevice).map(([key, value]) => (
                <div key={key} style={{ wordBreak: "break-all", marginBottom: 4 }}>
                  <span style={{ color: "#8e9aaf" }}>{key}: </span>
                  {value}
                </div>
              ))}

              <div style={{ color: "#4fd1ff", fontWeight: 700, marginTop: 8 }}>environment</div>
              {Object.entries(reading.environment).map(([key, value]) => (
                <div key={key} style={{ wordBreak: "break-all" }}>
                  <span style={{ color: "#8e9aaf" }}>{key}: </span>
                  {value}
                </div>
              ))}

              {/* Always-available fallback if the clipboard API is blocked. */}
              <textarea
                readOnly
                value={text}
                onFocus={(event) => event.currentTarget.select()}
                style={{
                  width: "100%",
                  height: 90,
                  marginTop: 8,
                  background: "#0a0e14",
                  color: "#e6edf5",
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  font: "10px/1.35 ui-monospace, monospace",
                  padding: 6,
                }}
              />
            </>
          ) : (
            <p style={{ margin: 0, color: "#8e9aaf" }}>Measuring…</p>
          )}
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  background: "#4fd1ff",
  color: "#05070b",
  border: "none",
  borderRadius: 6,
  padding: "5px 9px",
  fontSize: 11,
  fontWeight: 700,
};
