import {
  test as base,
  devices,
  expect,
  webkit,
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
    const browser = await webkit.launch();
    const iphone = devices["iPhone 13"];
    const plannerContext = await browser.newContext({
      storageState: plannerStoragePath,
      ...iphone,
    });
    const djContext = await browser.newContext({
      storageState: djStoragePath,
      ...iphone,
    });
    const bothContext = await browser.newContext({
      storageState: bothStoragePath,
      ...iphone,
    });

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
