import { expect, type Page } from "@playwright/test";

export async function openFirstDmInboxThread(page: Page, hint: RegExp): Promise<void> {
  await page.goto("/dm", { waitUntil: "domcontentloaded" });
  const row = page.getByRole("button").filter({ hasText: hint }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click();
  await expect(page).toHaveURL(/\/dm\//, { timeout: 15_000 });
}

export async function openFirstDmInboxThreadFromCurrentPage(page: Page, hint: RegExp): Promise<void> {
  const row = page.getByRole("button").filter({ hasText: hint }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click();
  await expect(page).toHaveURL(/\/dm\//, { timeout: 15_000 });
}

export async function openDmConversationDetails(page: Page, conversationTitle: string): Promise<void> {
  await page.getByRole("button", { name: `Open profile for ${conversationTitle}` }).click();
  await expect(page.getByRole("button", { name: "Block user" })).toBeVisible({ timeout: 10_000 });
}

export async function blockUserInDmDetails(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Block user", exact: true }).first().click();
  await page.getByRole("button", { name: "Block user", exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Unblock user" })).toBeVisible({ timeout: 10_000 });
}
