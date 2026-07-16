import { expect, type Page } from "@playwright/test";
import { SYNTHETIC_DISPLAY_NAMES } from "./qa-profiles";

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

export async function openGigDmForEvent(page: Page, eventName: string): Promise<void> {
  await page.goto("/bookings", { waitUntil: "domcontentloaded" });

  await expect(async () => {
    if (!page.url().includes("/bookings")) {
      await page.goto("/bookings", { waitUntil: "domcontentloaded" });
    }
    const card = page.locator("li").filter({ hasText: eventName }).first();
    await expect(card).toBeVisible();
  }).toPass({ timeout: 30_000 });

  const gigCard = page.locator("li").filter({ hasText: eventName }).first();
  const openDm = gigCard.getByRole("link", { name: /^Open DM$/i });
  await expect(openDm).toBeVisible();
  await openDm.click();
  await expect(page).toHaveURL(/\/dm\/[^/?#]+/, { timeout: 15_000 });
  await expect(page).toHaveURL(/bookingRequestId=/, { timeout: 15_000 });
}

export async function sendDmMessage(page: Page, text: string): Promise<void> {
  const composer = page.getByPlaceholder("Message...");
  await expect(composer).toBeVisible({ timeout: 15_000 });
  await composer.click();
  await composer.fill(text);

  if ((await composer.inputValue()) !== text) {
    await composer.fill("");
    await composer.pressSequentially(text, { delay: 5 });
  }

  await expect(composer).toHaveValue(text);

  const send = page.getByRole("button", { name: "Send message" });
  await expect(send).toBeEnabled({ timeout: 5_000 });
  await send.click();
  await expect(composer).toHaveValue("");

  await expect(async () => {
    if (await page.getByText(text, { exact: true }).isVisible().catch(() => false)) {
      return;
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  }).toPass({ timeout: 30_000 });
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

export async function unblockUserIfNeeded(page: Page, displayName: string): Promise<void> {
  await page.goto("/dm", { waitUntil: "domcontentloaded" });
  const row = page.getByRole("button").filter({ hasText: displayName }).first();
  if (await row.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await row.click();
    await openDmConversationDetails(page, displayName);
    const unblock = page.getByRole("button", { name: "Unblock user" });
    if (await unblock.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await unblock.click();
      await expect(page.getByRole("button", { name: "Block user", exact: true }).first()).toBeVisible({
        timeout: 10_000,
      });
    }
    return;
  }

  if (displayName === SYNTHETIC_DISPLAY_NAMES.planner) {
    await page.goto("/bookings", { waitUntil: "domcontentloaded" });
    const openDm = page.getByRole("link", { name: "Open DM" }).first();
    if (await openDm.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await openDm.click();
      await openDmConversationDetails(page, displayName);
      const unblock = page.getByRole("button", { name: "Unblock user" });
      if (await unblock.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await unblock.click();
      }
    }
  }
}
