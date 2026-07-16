import { mkdirSync } from "node:fs";
import { test as setup, webkit, devices } from "@playwright/test";
import {
  bothStoragePath,
  djStoragePath,
  plannerStoragePath,
  AUTH_DIR,
} from "./helpers/auth-paths";
import { loadQaCredentials } from "./helpers/credentials";
import { loginViaProductionUi } from "./helpers/login";
import { normalizeRoleOutgoingBlocks } from "./helpers/qa-relationship-state";
import { assertRole } from "./helpers/role";
import {
  captureSyntheticInviteLabel,
  ensureSyntheticQaProfile,
} from "./helpers/qa-profiles";

setup.describe.configure({ mode: "serial" });

setup("authenticate QA roles", async () => {
  mkdirSync(AUTH_DIR, { recursive: true });
  const credentials = loadQaCredentials();
  const browser = await webkit.launch();
  const iphone = devices["iPhone 13"];

  const roles = [
    { key: "planner" as const, path: plannerStoragePath, label: "Planner" as const },
    { key: "dj" as const, path: djStoragePath, label: "DJ" as const },
    { key: "both" as const, path: bothStoragePath, label: "Both" as const },
  ];

  try {
    for (const role of roles) {
      const context = await browser.newContext({ ...iphone });
      const page = await context.newPage();
      const account = credentials[role.key];
      await loginViaProductionUi(page, account.email, account.password);
      await assertRole(page, role.key);
      await ensureSyntheticQaProfile(page, role.key);
      await captureSyntheticInviteLabel(page, role.key);
      await normalizeRoleOutgoingBlocks(page, role.label);
      await context.storageState({ path: role.path });
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
