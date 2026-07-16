import { expect, type Page } from "@playwright/test";
import type { RolePages } from "../fixtures/multi-role.fixture";
import {
  readSyntheticUserId,
  roleForSyntheticDisplayName,
  SYNTHETIC_DISPLAY_NAMES,
} from "./qa-profiles";

export type BlockRelationshipCheck = {
  actor: "Planner" | "DJ" | "Both";
  page: Page;
  otherDisplayName: string;
  allowMissingThread?: boolean;
};

async function readProfileIdentityText(page: Page): Promise<string> {
  const heading = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  const displayLine = await page
    .locator("h1 + p")
    .first()
    .textContent()
    .catch(() => null);
  if (displayLine?.trim() && displayLine.trim() !== heading) {
    return `${heading} ${displayLine.trim()}`;
  }
  return heading;
}

async function expectParticipantIdentity(page: Page, displayName: string): Promise<void> {
  await expect(async () => {
    const dmHeading = page.getByRole("heading", { level: 1 });
    if (page.url().includes("/dm/")) {
      await expect(dmHeading).toContainText(displayName);
      return;
    }
    const identity = await readProfileIdentityText(page);
    expect(identity).toContain(displayName);
  }).toPass({ timeout: 20_000 });
}

async function openDmThreadWithParticipant(page: Page, displayName: string): Promise<void> {
  await page.goto("/dm", { waitUntil: "domcontentloaded" });
  const row = page.getByRole("button").filter({ hasText: displayName }).first();
  await expect(row, `Messages inbox should list ${displayName}`).toBeVisible({ timeout: 30_000 });
  await row.click();
  await expect(page).toHaveURL(/\/dm\/[^/?#]+/, { timeout: 15_000 });
  await expectParticipantIdentity(page, displayName);
}

async function openDmThreadViaGigsPlannerFallback(page: Page, expectedDisplayName: string): Promise<boolean> {
  await page.goto("/bookings", { waitUntil: "domcontentloaded" });
  const gigCards = page.locator("li").filter({ hasText: expectedDisplayName });
  const cardCount = await gigCards.count();
  for (let index = 0; index < cardCount; index += 1) {
    const card = gigCards.nth(index);
    const openDm = card.getByRole("link", { name: /^Open DM$/i });
    if (!(await openDm.isVisible().catch(() => false))) {
      continue;
    }
    await openDm.click();
    await expect(page).toHaveURL(/\/dm\/[^/?#]+/, { timeout: 15_000 });
    if (await page.getByRole("heading", { level: 1 }).filter({ hasText: expectedDisplayName }).isVisible().catch(() => false)) {
      return true;
    }
    await page.goto("/bookings", { waitUntil: "domcontentloaded" });
  }
  return false;
}

async function openDmThreadViaCachedProfile(page: Page, displayName: string, actor: string): Promise<void> {
  const targetRole = roleForSyntheticDisplayName(displayName);
  if (!targetRole) {
    throw new Error(`${actor} cannot resolve cached profile for ${displayName}.`);
  }
  const userId = readSyntheticUserId(targetRole);
  if (!userId) {
    throw new Error(
      `${actor} is missing cached user id for ${displayName}. Re-run auth setup before journey tests.`,
    );
  }

  await page.goto(`/profile/${userId}`, { waitUntil: "domcontentloaded" });
  await expectParticipantIdentity(page, displayName);

  const messageBtn = page.getByRole("button", {
    name: /Message \/ Book DJ|Message Promoter|^Message$/i,
  });
  await expect(messageBtn, `Profile for ${displayName} should expose Message`).toBeVisible({
    timeout: 20_000,
  });
  await messageBtn.click();
  await expect(page).toHaveURL(/\/dm\/[^/?#]+/, { timeout: 20_000 });
  await expectParticipantIdentity(page, displayName);
}

export async function openDmThreadWithSupportedFallbacks(
  page: Page,
  displayName: string,
  actor: string,
): Promise<void> {
  await page.goto("/dm", { waitUntil: "domcontentloaded" });
  const row = page.getByRole("button").filter({ hasText: displayName }).first();
  if (await row.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await row.click();
    await expect(page).toHaveURL(/\/dm\/[^/?#]+/, { timeout: 15_000 });
    await expectParticipantIdentity(page, displayName);
    return;
  }

  try {
    await openDmThreadViaCachedProfile(page, displayName, actor);
    return;
  } catch (profileError) {
    if (
      displayName === SYNTHETIC_DISPLAY_NAMES.planner &&
      (await openDmThreadViaGigsPlannerFallback(page, displayName))
    ) {
      return;
    }
    throw profileError;
  }
}

export async function openDmParticipantProfilePanel(
  page: Page,
  displayName: string,
): Promise<void> {
  const profileButton = page.getByRole("button", { name: `Open profile for ${displayName}` });
  if (await profileButton.isVisible().catch(() => false)) {
    await profileButton.click();
  } else {
    await page
      .getByRole("button", { name: /^Open profile for / })
      .first()
      .click();
  }
  await expect(
    page.getByRole("button", { name: /^Block user$|^Unblock user$/ }).first(),
  ).toBeVisible({ timeout: 10_000 });
}

export async function assertNeutralBlockProfile(
  page: Page,
  actor: string,
  otherDisplayName: string,
): Promise<void> {
  const unblock = page.getByRole("button", { name: "Unblock user" });
  if (await unblock.isVisible().catch(() => false)) {
    throw new Error(
      `${actor} still blocks ${otherDisplayName}: Unblock user is visible in profile controls.`,
    );
  }
  await expect(
    page.getByRole("button", { name: "Block user", exact: true }).first(),
    `${actor} should see Block user for neutral relationship with ${otherDisplayName}`,
  ).toBeVisible({ timeout: 10_000 });
}

export async function ensureActorUnblockedOther(
  page: Page,
  actor: string,
  otherDisplayName: string,
  options?: { allowMissingThread?: boolean },
): Promise<void> {
  await page.goto("/dm", { waitUntil: "domcontentloaded" });
  const row = page.getByRole("button").filter({ hasText: otherDisplayName }).first();
  const hasThread = await row.isVisible({ timeout: 5_000 }).catch(() => false);

  if (!hasThread) {
    if (options?.allowMissingThread) {
      return;
    }
    try {
      await openDmThreadWithSupportedFallbacks(page, otherDisplayName, actor);
    } catch (error) {
      throw new Error(
        `${actor} could not open a DM thread with ${otherDisplayName} to verify block state. ${String(error)}`,
      );
    }
  } else {
    await openDmThreadWithParticipant(page, otherDisplayName);
  }

  await openDmParticipantProfilePanel(page, otherDisplayName);

  const unblock = page.getByRole("button", { name: "Unblock user" });
  if (await unblock.isVisible().catch(() => false)) {
    await unblock.click();
    await expect(unblock).toBeHidden({ timeout: 10_000 });
  }

  await assertNeutralBlockProfile(page, actor, otherDisplayName);
}

export async function normalizeSyntheticBlockRelationships(roles: RolePages): Promise<void> {
  const checks: BlockRelationshipCheck[] = [
    { actor: "DJ", page: roles.dj, otherDisplayName: SYNTHETIC_DISPLAY_NAMES.planner },
    { actor: "Planner", page: roles.planner, otherDisplayName: SYNTHETIC_DISPLAY_NAMES.dj },
    { actor: "DJ", page: roles.dj, otherDisplayName: SYNTHETIC_DISPLAY_NAMES.both },
    { actor: "Planner", page: roles.planner, otherDisplayName: SYNTHETIC_DISPLAY_NAMES.both },
    { actor: "Both", page: roles.both, otherDisplayName: SYNTHETIC_DISPLAY_NAMES.planner, allowMissingThread: true },
    { actor: "Both", page: roles.both, otherDisplayName: SYNTHETIC_DISPLAY_NAMES.dj, allowMissingThread: true },
  ];

  for (const check of checks) {
    await ensureActorUnblockedOther(check.page, check.actor, check.otherDisplayName, {
      allowMissingThread: check.allowMissingThread,
    });
  }
}

export async function verifyPlannerDjBookingReady(roles: RolePages): Promise<void> {
  await openDmThreadWithSupportedFallbacks(roles.planner, SYNTHETIC_DISPLAY_NAMES.dj, "Planner");
  await expect(roles.planner.getByPlaceholder("Message...")).toBeVisible({ timeout: 10_000 });
  await expect(roles.planner.locator("body")).not.toContainText(/no longer send messages/i);
  await expect(roles.planner.locator("body")).not.toContainText(/^You blocked /i);

  await ensureActorUnblockedOther(roles.dj, "DJ", SYNTHETIC_DISPLAY_NAMES.planner);
}

export async function normalizeRoleOutgoingBlocks(
  page: Page,
  actor: "Planner" | "DJ" | "Both",
): Promise<void> {
  const others =
    actor === "Planner"
      ? [SYNTHETIC_DISPLAY_NAMES.dj, SYNTHETIC_DISPLAY_NAMES.both]
      : actor === "DJ"
        ? [SYNTHETIC_DISPLAY_NAMES.planner, SYNTHETIC_DISPLAY_NAMES.both]
        : [SYNTHETIC_DISPLAY_NAMES.planner, SYNTHETIC_DISPLAY_NAMES.dj];

  for (const other of others) {
    await ensureActorUnblockedOther(page, actor, other, {
      allowMissingThread: true,
    });
  }
}
