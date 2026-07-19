import { expect, type Page } from "@playwright/test";

export async function expectEventsListTabsAligned(page: Page): Promise<void> {
  const active = page.getByRole("link", { name: "Active", exact: true });
  const history = page.getByRole("link", { name: "History", exact: true });

  await expect(active).toBeVisible();
  await expect(history).toBeVisible();

  const activeClass = await active.getAttribute("class");
  const historyClass = await history.getAttribute("class");

  expect(activeClass).toContain("inline-flex");
  expect(historyClass).toContain("inline-flex");
  expect(activeClass).toContain("ftc-filter-pill");
  expect(historyClass).toContain("ftc-filter-pill");

  const activeBox = await active.boundingBox();
  const historyBox = await history.boundingBox();

  expect(activeBox).not.toBeNull();
  expect(historyBox).not.toBeNull();

  expect(Math.abs(activeBox!.y - historyBox!.y)).toBeLessThan(0.5);
  expect(Math.abs(activeBox!.height - historyBox!.height)).toBeLessThan(0.5);
}

export async function expectEventsListTabSelected(
  page: Page,
  tab: "active" | "history",
): Promise<void> {
  const active = page.getByRole("link", { name: "Active", exact: true });
  const history = page.getByRole("link", { name: "History", exact: true });

  if (tab === "active") {
    await expect(active).toHaveClass(/ftc-filter-pill-active/);
    await expect(history).not.toHaveClass(/ftc-filter-pill-active/);
    await expect(page).toHaveURL(/\/events(?:\?|$)/);
    await expect(page).not.toHaveURL(/tab=history/);
    return;
  }

  await expect(history).toHaveClass(/ftc-filter-pill-active/);
  await expect(active).not.toHaveClass(/ftc-filter-pill-active/);
  await expect(page).toHaveURL(/tab=history/);
}
