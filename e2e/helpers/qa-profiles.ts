import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { AUTH_DIR } from "./auth-paths";
import type { QaRole } from "./credentials";

export const SYNTHETIC_DISPLAY_NAMES: Record<QaRole, string> = {
  planner: "FTC QA Planner",
  dj: "FTC QA DJ",
  both: "FTC QA Both",
};

const inviteLabelPath = (role: QaRole) => path.join(AUTH_DIR, `${role}-invite-label.txt`);
const userIdPath = (role: QaRole) => path.join(AUTH_DIR, `${role}-user-id.txt`);

export function roleForSyntheticDisplayName(displayName: string): QaRole | null {
  for (const role of ["planner", "dj", "both"] as const) {
    if (SYNTHETIC_DISPLAY_NAMES[role] === displayName) {
      return role;
    }
  }
  return null;
}

async function saveProfileDisplayName(page: Page, displayName: string): Promise<void> {
  await page.getByRole("textbox", { name: "Display name" }).fill(displayName);
  const usernameField = page.getByRole("textbox", { name: "Username" });
  if (!(await usernameField.inputValue()).trim()) {
    await usernameField.fill(`ftcqa${Date.now().toString().slice(-6)}`);
  }
  await page.getByRole("button", { name: /^Save changes$|^Save profile$/i }).click();
  await expect(page).not.toHaveURL(/\/profile\/setup/, { timeout: 20_000 });
}

async function readProfileDisplayName(page: Page): Promise<string> {
  const heading = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  const displayLine = await page
    .locator("h1 + p")
    .first()
    .textContent()
    .catch(() => null);
  if (displayLine?.trim() && displayLine.trim() !== heading) {
    return displayLine.trim();
  }
  return heading;
}

export async function ensureSyntheticQaProfile(page: Page, role: QaRole): Promise<void> {
  const targetName = SYNTHETIC_DISPLAY_NAMES[role];
  await page.locator('nav[aria-label="Mobile navigation"] a[aria-label="Profile"]').click();
  await expect(page).toHaveURL(/\/profile\//, { timeout: 15_000 });

  if (page.url().includes("/profile/setup")) {
    await saveProfileDisplayName(page, targetName);
    return;
  }

  const currentName = await readProfileDisplayName(page);
  if (currentName === targetName) {
    return;
  }

  await page.getByRole("link", { name: "Edit profile" }).click();
  await expect(page).toHaveURL(/\/profile\/setup/, { timeout: 15_000 });
  await saveProfileDisplayName(page, targetName);
}

export async function captureSyntheticInviteLabel(page: Page, role: QaRole): Promise<void> {
  const profileLink = page.locator('nav[aria-label="Mobile navigation"] a[aria-label="Profile"]');
  const profileHref = await profileLink.getAttribute("href");
  const userId = profileHref?.match(/\/profile\/([0-9a-f-]+)/i)?.[1];
  expect(userId, `${role} profile link should include a user id`).toBeTruthy();

  if (!page.url().includes(`/profile/${userId}`)) {
    await profileLink.click();
    await expect(page).toHaveURL(new RegExp(`/profile/${userId}`), { timeout: 15_000 });
  }

  const inviteLabel = await readProfileDisplayName(page);
  expect(inviteLabel).toBe(SYNTHETIC_DISPLAY_NAMES[role]);
  writeFileSync(inviteLabelPath(role), inviteLabel, { encoding: "utf8", mode: 0o600 });
  writeFileSync(userIdPath(role), userId!, { encoding: "utf8", mode: 0o600 });
}

export function readSyntheticUserId(role: QaRole): string | null {
  const filePath = userIdPath(role);
  if (!existsSync(filePath)) {
    return null;
  }
  const id = readFileSync(filePath, "utf8").trim();
  return id || null;
}

export function readSyntheticInviteLabel(role: QaRole): string {
  const filePath = inviteLabelPath(role);
  if (!existsSync(filePath)) {
    return SYNTHETIC_DISPLAY_NAMES[role];
  }

  const label = readFileSync(filePath, "utf8").trim();
  return label || SYNTHETIC_DISPLAY_NAMES[role];
}

export const qaProfileCachePaths = [
  inviteLabelPath("planner"),
  inviteLabelPath("dj"),
  inviteLabelPath("both"),
  userIdPath("planner"),
  userIdPath("dj"),
  userIdPath("both"),
] as const;
