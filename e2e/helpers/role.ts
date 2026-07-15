import { expect, type Page } from "@playwright/test";
import type { QaRole } from "./credentials";

export async function readCachedRole(page: Page): Promise<QaRole | "unknown"> {
  const role = await page.evaluate(() => {
    const raw =
      sessionStorage.getItem("ftc-nav-role") ||
      (() => {
        try {
          const parsed = JSON.parse(localStorage.getItem("ftc-nav-role-local") || "null") as {
            role?: string;
          } | null;
          return parsed?.role ?? null;
        } catch {
          return null;
        }
      })();

    if (raw === "promoter") return "planner";
    if (raw === "dj" || raw === "both") return raw;
    return null;
  });

  if (role === "planner" || role === "dj" || role === "both") {
    return role;
  }

  const navLabels = await page
    .locator('nav[aria-label="Mobile navigation"] a[aria-label]')
    .evaluateAll((elements) => elements.map((el) => el.getAttribute("aria-label")));

  if (navLabels.includes("Gigs") && !navLabels.includes("Events")) {
    return "dj";
  }

  if (navLabels.includes("Events")) {
    await page.goto("/bookings", { waitUntil: "domcontentloaded" });
    const text = await page.locator("body").innerText();
    if (text.includes("Bookings Received") || text.includes("No gigs yet")) {
      return "both";
    }
    return "planner";
  }

  return "unknown";
}

export async function assertRole(page: Page, expected: QaRole): Promise<void> {
  await page.goto("/bookings", { waitUntil: "domcontentloaded" });
  const detected = await readCachedRole(page);
  expect(detected, `Expected ${expected} role from visible app state`).toBe(expected);
}
