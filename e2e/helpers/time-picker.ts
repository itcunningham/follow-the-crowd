import { expect, type Page } from "@playwright/test";

const WHEEL_ITEM_HEIGHT = 44;

async function pickWheelValue(page: Page, groupLabel: string, value: string): Promise<void> {
  const group = page.getByRole("group", { name: groupLabel });
  await expect(group).toBeVisible({ timeout: 5_000 });

  await group.evaluate(
    (groupEl, { targetValue, itemHeight }) => {
      const scroller = groupEl.querySelector<HTMLElement>('[class*="overflow-y-auto"]');
      if (!scroller) {
        throw new Error(`Wheel scroller not found for ${groupEl.getAttribute("aria-label") ?? "group"}`);
      }

      const rows = Array.from(scroller.children).filter(
        (child) => child.getAttribute("aria-hidden") !== "true",
      );
      const index = rows.findIndex((row) => row.textContent?.trim() === targetValue);
      if (index < 0) {
        throw new Error(`Wheel value "${targetValue}" not found`);
      }

      scroller.scrollTop = index * itemHeight;
      scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
    },
    { targetValue: value, itemHeight: WHEEL_ITEM_HEIGHT },
  );

  await expect(group.locator("div").filter({ hasText: new RegExp(`^${value}$`) })).toBeVisible();
}

export async function pickSetTime(
  page: Page,
  controlLabel: "Start Time" | "Finish Time",
  hour: number,
  minute: number,
  meridiem: "AM" | "PM",
): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${controlLabel},`) }).click();
  const dialog = page.getByRole("dialog", { name: controlLabel });
  await expect(dialog.getByRole("button", { name: "Done" })).toBeVisible();
  await pickWheelValue(page, "Hour", String(hour));
  await pickWheelValue(
    page,
    "Minute",
    minute === 0 ? "00" : String(minute).padStart(2, "0"),
  );
  await pickWheelValue(page, "AM or PM", meridiem);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden({ timeout: 5_000 });
}
