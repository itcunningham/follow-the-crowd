import { expect, type Page } from "@playwright/test";
import { pickSetTime } from "./time-picker";

export type CreatedEventRef = {
  name: string;
  id: string | null;
};

function futureDateKey(daysAhead = 28): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

export async function openCreateEventFromScratch(page: Page): Promise<void> {
  await page.goto("/events", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Create event$/i }).click();
  await page.getByText("From scratch", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create event" })).toBeVisible();
}

export async function pickEventDate(page: Page, dateKey: string): Promise<void> {
  const [year, month, day] = dateKey.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const ariaDate = target.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  await page.getByRole("button", { name: /^Event date,/ }).click();
  await expect(page.getByRole("dialog", { name: /Select date/i })).toBeVisible();

  const dayButton = page.getByRole("button", { name: ariaDate, exact: true });
  if (await dayButton.isVisible().catch(() => false)) {
    await dayButton.click();
    return;
  }

  for (let i = 0; i < 3; i += 1) {
    await page.getByRole("button", { name: /Next month|Go to next month/i }).click().catch(() => undefined);
    if (await dayButton.isVisible().catch(() => false)) {
      await dayButton.click();
      return;
    }
  }

  throw new Error(`Could not select event date ${dateKey} in date picker`);
}

export async function fillRequiredEventForm(
  page: Page,
  eventName: string,
  options?: { venue?: string; dateKey?: string },
): Promise<string> {
  const venue = options?.venue ?? "QA Beta Test Venue";
  const dateKey = options?.dateKey ?? futureDateKey();

  await page.getByLabel("Event name").fill(eventName);
  await page.getByLabel("Venue").fill(venue);
  await pickEventDate(page, dateKey);
  await pickSetTime(page, "Start Time", 7, 0, "PM");
  await pickSetTime(page, "Finish Time", 11, 0, "PM");

  await expect(page.getByRole("button", { name: /^Start Time,/ })).not.toContainText(
    "Select start time",
  );
  await expect(page.getByRole("button", { name: /^Finish Time,/ })).not.toContainText(
    "Select finish time",
  );

  return dateKey;
}

export async function saveEventOnce(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Save event$/i }).click();
}

async function resolveEventId(page: Page, eventName: string): Promise<string | null> {
  const fromUrl = page.url().match(/\/events\/([0-9a-f-]{36})/i)?.[1] ?? null;
  if (fromUrl) {
    return fromUrl;
  }

  await page.goto("/events", { waitUntil: "domcontentloaded" });
  const link = page.getByRole("link", { name: new RegExp(eventName) }).first();
  if (await link.isVisible().catch(() => false)) {
    await link.click();
    await page.waitForURL(/\/events\/[0-9a-f-]{36}/, { timeout: 15_000 });
    return page.url().match(/\/events\/([0-9a-f-]{36})/i)?.[1] ?? null;
  }

  return null;
}

export async function createEventFromScratch(
  page: Page,
  namePrefix: string,
): Promise<CreatedEventRef> {
  const eventName = `${namePrefix}${Date.now()}`;
  await openCreateEventFromScratch(page);
  const dateKey = await fillRequiredEventForm(page, eventName);
  await saveEventOnce(page);
  await page.waitForTimeout(2_000);

  let eventId = await resolveEventId(page, eventName);
  if (!eventId) {
    await page.waitForTimeout(3_000);
    eventId = await resolveEventId(page, eventName);
  }

  if (eventId) {
    await page.goto(`/events/${eventId}`, { waitUntil: "domcontentloaded" });
  }

  await page.goto("/events", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(eventName);
  await page.goto("/calendar", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(eventName);

  const eventsText = await page.goto("/events").then(() => page.locator("body").innerText());
  const duplicateCount = (eventsText.match(new RegExp(eventName, "g")) ?? []).length;
  expect(duplicateCount).toBeLessThanOrEqual(1);

  void dateKey;
  return { name: eventName, id: eventId };
}

export async function inviteFirstDjWithFixedOffer(page: Page, fee = "500"): Promise<void> {
  const sendBookings = page.getByRole("button", { name: /Send bookings|Invite DJs/i }).first();
  if (await sendBookings.isVisible().catch(() => false)) {
    await sendBookings.click();
  }

  const selectDj = page.locator('button[aria-label^="Select"]').first();
  await expect(selectDj).toBeVisible();
  await selectDj.click();
  await page.getByText("Fixed offer", { exact: true }).first().click();
  await page.locator('input[inputmode="decimal"]').first().fill(fee);
  const send = page.getByRole("button", {
    name: /Send invitation|Confirm 1 DJ|Send bookings/i,
  }).first();
  await expect(send).toBeEnabled();
  await send.click();
  await page.waitForTimeout(3_000);
}

export async function inviteFirstDjWithOpenOffer(page: Page): Promise<void> {
  const selectDj = page.locator('button[aria-label^="Select"]').first();
  await expect(selectDj).toBeVisible();
  await selectDj.click();
  await page.getByText("Ask for rate", { exact: true }).first().click();
  const send = page.getByRole("button", {
    name: /Send invitation|Confirm 1 DJ|Send bookings/i,
  }).first();
  await expect(send).toBeEnabled();
  await send.click();
  await page.waitForTimeout(3_000);
}
