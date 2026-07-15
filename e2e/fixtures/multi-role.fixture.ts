import {
  test as base,
  chromium,
  expect,
  type Browser,
  type Page,
} from "@playwright/test";
import {
  bothStoragePath,
  djStoragePath,
  plannerStoragePath,
} from "../helpers/auth-paths";

export type RolePages = {
  browser: Browser;
  planner: Page;
  dj: Page;
  both: Page;
};

export const test = base.extend<{ roles: RolePages }>({
  roles: async ({}, use) => {
    const browser = await chromium.launch();
    const plannerContext = await browser.newContext({ storageState: plannerStoragePath });
    const djContext = await browser.newContext({ storageState: djStoragePath });
    const bothContext = await browser.newContext({ storageState: bothStoragePath });

    const roles: RolePages = {
      browser,
      planner: await plannerContext.newPage(),
      dj: await djContext.newPage(),
      both: await bothContext.newPage(),
    };

    await use(roles);

    await plannerContext.close();
    await djContext.close();
    await bothContext.close();
    await browser.close();
  },
});

export { expect };
