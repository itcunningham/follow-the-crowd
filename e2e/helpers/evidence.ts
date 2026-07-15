import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

export type FailureEvidence = {
  url: string;
  visibleError: string | null;
  screenshotPath?: string;
  consoleErrors: string[];
  networkSummary: Array<{ method: string; status: number; url: string }>;
};

const SENSITIVE_PATTERN =
  /token|password|authorization|bearer|apikey|eyJ[a-zA-Z0-9_-]{10,}/i;

export function attachEvidenceCollectors(page: Page): {
  consoleErrors: string[];
  networkSummary: Array<{ method: string; status: number; url: string }>;
} {
  const consoleErrors: string[] = [];
  const networkSummary: Array<{ method: string; status: number; url: string }> = [];

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }
    const text = message.text();
    if (!SENSITIVE_PATTERN.test(text)) {
      consoleErrors.push(text.slice(0, 400));
    }
  });

  page.on("response", (response) => {
    if (response.status() < 400) {
      return;
    }
    const url = response.url().replace(/([?&]apikey=)[^&]+/gi, "$1[REDACTED]");
    if (SENSITIVE_PATTERN.test(url)) {
      return;
    }
    networkSummary.push({
      method: response.request().method(),
      status: response.status(),
      url,
    });
  });

  return { consoleErrors, networkSummary };
}

export async function captureFailureEvidence(
  page: Page,
  label: string,
  collectors: ReturnType<typeof attachEvidenceCollectors>,
): Promise<FailureEvidence> {
  const screenshotPath = path.join("test-results", "screenshots", `${label}.png`);
  mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const visibleError =
    bodyText.match(/(required|invalid|failed|error|couldn't|choose)/i)?.[0] ?? null;

  return {
    url: page.url(),
    visibleError,
    screenshotPath,
    consoleErrors: collectors.consoleErrors,
    networkSummary: collectors.networkSummary,
  };
}
