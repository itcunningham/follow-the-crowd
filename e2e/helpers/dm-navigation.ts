import { expect, type Page } from "@playwright/test";
import {
  assertNeutralBlockProfile,
  ensureActorUnblockedOther,
  openDmParticipantProfilePanel,
} from "./qa-relationship-state";

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
  await openDmParticipantProfilePanel(page, conversationTitle);
}

export async function blockUserInDmDetails(page: Page, conversationTitle: string): Promise<void> {
  await openDmParticipantProfilePanel(page, conversationTitle);
  await assertNeutralBlockProfile(page, "Block test actor", conversationTitle);
  await page.getByRole("button", { name: "Block user", exact: true }).first().click();
  await page.getByRole("button", { name: "Block user", exact: true }).last().click();
  await expect(page.getByRole("button", { name: "Unblock user" })).toBeVisible({ timeout: 10_000 });
}

export async function unblockUserIfNeeded(
  page: Page,
  displayName: string,
  actor = "QA role",
): Promise<void> {
  await ensureActorUnblockedOther(page, actor, displayName, { allowMissingThread: true });
}
