import { expect, type Locator, type Page } from "@playwright/test";

const CHAT_BOOKING_REQUEST_ID_ATTR = "data-chat-booking-request-id";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function bookingCardForEvent(page: Page, eventName: string): Locator {
  const bookingRequestId = new URL(page.url()).searchParams.get("bookingRequestId");

  if (bookingRequestId) {
    return page.locator(`li[${CHAT_BOOKING_REQUEST_ID_ATTR}="${bookingRequestId}"]`);
  }

  return page
    .locator("li")
    .filter({
      has: page.getByText(eventName, { exact: true }),
    })
    .first();
}

export async function expandBookingCardDetails(card: Locator, eventName: string): Promise<void> {
  const accept = card.getByRole("button", { name: /^Accept$|^Accept offer$/i });

  if (await accept.isVisible().catch(() => false)) {
    await accept.scrollIntoViewIfNeeded();
    return;
  }

  const expand = card.getByRole("button", {
    name: new RegExp(`${escapeRegExp(eventName)}`, "i"),
  });
  await expect(expand).toBeVisible({ timeout: 10_000 });
  await expand.click();
  await expect(accept).toBeVisible({ timeout: 10_000 });
  await accept.scrollIntoViewIfNeeded();
}

export async function clickAcceptOnBookingCard(
  page: Page,
  card: Locator,
  eventName: string,
): Promise<void> {
  await expandBookingCardDetails(card, eventName);
  const accept = card.getByRole("button", { name: /^Accept$/i });
  await expect(accept).toBeEnabled({ timeout: 10_000 });

  const responsePromise = page
    .waitForResponse(
      (response) =>
        response.url().includes("booking_requests") &&
        response.request().method() === "PATCH" &&
        response.ok(),
      { timeout: 20_000 },
    )
    .catch(() => null);

  await accept.click();
  await responsePromise;

  await expect(async () => {
    const text = await card.innerText();
    expect(text).toMatch(/Accepted|Confirmed/i);
    expect(text).not.toMatch(/\bPending\b/i);
  }).toPass({ timeout: 20_000 });
}

export async function clickProposeRateOnBookingCard(
  card: Locator,
  eventName: string,
): Promise<void> {
  await expandBookingCardDetails(card, eventName);
  const propose = card.getByRole("button", { name: "Propose rate", exact: true });
  await expect(propose).toBeVisible();
  await propose.click();
}

export async function submitRateProposal(page: Page, amount: string): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Propose rate" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Proposed rate" }).fill(amount);
  await dialog.getByRole("button", { name: "Send proposal", exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}
