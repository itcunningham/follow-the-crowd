import { expect, type Locator, type Page } from "@playwright/test";

export function bookingCardForEvent(page: Page, eventHint: string | RegExp): Locator {
  return page.locator("li").filter({ hasText: eventHint }).first();
}

export async function expandBookingCardDetails(card: Locator): Promise<void> {
  const details = card.getByRole("button", { name: /View details/i });
  if (await details.isVisible().catch(() => false)) {
    await details.click();
    await expect(card.getByRole("button", { name: /^Accept$|^Propose rate$/i }).first()).toBeVisible({
      timeout: 5_000,
    });
  }
}

export async function clickAcceptOnBookingCard(card: Locator): Promise<void> {
  await expandBookingCardDetails(card);
  const accept = card.getByRole("button", { name: /^Accept$/i });
  await expect(accept).toBeVisible();
  try {
    await accept.click({ timeout: 3_000 });
  } catch {
    await accept.click({ force: true });
  }
}

export async function clickProposeRateOnBookingCard(card: Locator): Promise<void> {
  await expandBookingCardDetails(card);
  const propose = card.getByRole("button", { name: "Propose rate", exact: true });
  await expect(propose).toBeVisible();
  try {
    await propose.click({ timeout: 3_000 });
  } catch {
    await propose.click({ force: true });
  }
}

export async function submitRateProposal(page: Page, amount: string): Promise<void> {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox").last().fill(amount);
  await dialog.getByRole("button", { name: "Send proposal", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
}
