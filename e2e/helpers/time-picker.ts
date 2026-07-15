import { expect, type Page } from "@playwright/test";

async function pickWheelValue(page: Page, groupLabel: string, value: string): Promise<void> {
  const group = page.getByRole("group", { name: groupLabel });
  const item = group.locator("div").filter({ hasText: new RegExp(`^${value}$`) }).first();
  await expect(item).toBeVisible({ timeout: 5_000 });
  await item.click({ force: true });
}

export async function pickSetTime(
  page: Page,
  controlLabel: "Start Time" | "Finish Time",
  hour: number,
  minute: number,
  meridiem: "AM" | "PM",
): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${controlLabel},`) }).click();
  await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  await pickWheelValue(page, "Hour", String(hour));
  await pickWheelValue(
    page,
    "Minute",
    minute === 0 ? "00" : String(minute).padStart(2, "0"),
  );
  await pickWheelValue(page, "Meridiem", meridiem);
  await page.getByRole("button", { name: "Done" }).click();
}
