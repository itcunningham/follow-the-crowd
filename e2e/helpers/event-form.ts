import { expect, type Page } from "@playwright/test";
import { pickSetTime } from "./time-picker";
import { readSyntheticInviteLabel, SYNTHETIC_DISPLAY_NAMES } from "./qa-profiles";

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

async function navigateCalendarToMonth(page: Page, dateKey: string): Promise<void> {
  const [year, month] = dateKey.split("-").map(Number);
  const targetLabel = new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  for (let i = 0; i < 14; i += 1) {
    if ((await page.locator("body").innerText()).includes(targetLabel)) {
      return;
    }
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(page.locator("body")).toContainText(/\d{4}|Today|Upcoming/i);
  }

  throw new Error(`Could not navigate calendar to ${targetLabel}`);
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

  let eventId: string | null = null;
  await expect(async () => {
    eventId = await resolveEventId(page, eventName);
    expect(eventId).toBeTruthy();
  }).toPass({ timeout: 20_000 });

  await page.goto("/events", { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toContainText(eventName);
  await page.goto("/calendar", { waitUntil: "domcontentloaded" });
  await navigateCalendarToMonth(page, dateKey);
  await expect(page.locator("body")).toContainText(eventName);

  await page.goto("/events", { waitUntil: "domcontentloaded" });
  const eventsText = await page.locator("body").innerText();
  const duplicateCount = (eventsText.match(new RegExp(eventName, "g")) ?? []).length;
  expect(duplicateCount).toBeLessThanOrEqual(1);

  return { name: eventName, id: eventId };
}

async function openSendBookingsFromEvent(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^Invite DJs$/ }).click();
  const dialog = page.getByRole("dialog", { name: "Send bookings" });
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Loading DJs", { exact: false })).toBeHidden({ timeout: 20_000 });
}

async function selectSyntheticQaDj(page: Page): Promise<void> {
  const inviteLabel = readSyntheticInviteLabel("dj");
  const search = page.getByPlaceholder("Search DJs by name or genre");
  await search.fill(inviteLabel);
  const escaped = inviteLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const selectButton = page.getByRole("button", {
    name: new RegExp(`^(Select|Deselect)\\s+${escaped}$`, "i"),
  });
  await expect(selectButton.first()).toBeVisible({ timeout: 15_000 });
  await selectButton.first().click();
}

async function fillFixedOfferAmount(page: Page, fee: string): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Send bookings" });
  const amountField = dialog.getByRole("textbox").last();
  await expect(amountField).toBeVisible();
  await amountField.fill(fee);
}

async function sendBookingsDialog(page: Page): Promise<void> {
  const send = page
    .getByRole("button", {
      name: /Send invitation|Confirm 1 DJ|Send bookings|Send \d+ booking/i,
    })
    .first();
  await expect(send).toBeEnabled();
  await send.click();
  await expect(page.getByRole("dialog", { name: "Send bookings" })).toBeHidden({ timeout: 15_000 });
}

export async function inviteDjWithFixedOffer(page: Page, fee = "500"): Promise<void> {
  await openSendBookingsFromEvent(page);
  await selectSyntheticQaDj(page);
  await page.getByRole("button", { name: "Fixed offer", exact: true }).click();
  await fillFixedOfferAmount(page, fee);
  await sendBookingsDialog(page);
}

export async function inviteDjWithOpenOffer(page: Page): Promise<void> {
  await openSendBookingsFromEvent(page);
  await selectSyntheticQaDj(page);
  await page.getByRole("button", { name: "Ask for rate", exact: true }).click();
  await sendBookingsDialog(page);
}

export async function assertEventBookingsSection(
  page: Page,
  eventId: string,
  pattern: RegExp,
): Promise<void> {
  await page.goto(`/events/${eventId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Bookings" })).toBeVisible();
  await expect(page.locator("body")).toContainText(pattern);
}

export { SYNTHETIC_DISPLAY_NAMES };
