import { mkdirSync } from "node:fs";
import { test as setup } from "@playwright/test";
import {
  bothStoragePath,
  djStoragePath,
  plannerStoragePath,
  AUTH_DIR,
} from "./helpers/auth-paths";
import { loadQaCredentials } from "./helpers/credentials";
import { loginViaProductionUi } from "./helpers/login";
import { assertRole } from "./helpers/role";

setup.describe.configure({ mode: "serial" });

setup("authenticate QA roles", async ({ browser }) => {
  mkdirSync(AUTH_DIR, { recursive: true });
  const credentials = loadQaCredentials();

  const roles = [
    { key: "planner" as const, path: plannerStoragePath },
    { key: "dj" as const, path: djStoragePath },
    { key: "both" as const, path: bothStoragePath },
  ];

  for (const role of roles) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const account = credentials[role.key];
    await loginViaProductionUi(page, account.email, account.password);
    await assertRole(page, role.key);
    await context.storageState({ path: role.path });
    await context.close();
  }
});
