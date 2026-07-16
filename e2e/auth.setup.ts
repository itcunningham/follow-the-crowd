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
import { unblockUserIfNeeded } from "./helpers/dm-navigation";
import { assertRole } from "./helpers/role";
import {
  captureSyntheticInviteLabel,
  ensureSyntheticQaProfile,
  SYNTHETIC_DISPLAY_NAMES,
} from "./helpers/qa-profiles";

setup.describe.configure({ mode: "serial" });

setup("authenticate QA roles", async () => {
  mkdirSync(AUTH_DIR, { recursive: true });
  const credentials = loadQaCredentials();
  const browser = await webkit.launch();
  const iphone = devices["iPhone 13"];

  const roles = [
    { key: "planner" as const, path: plannerStoragePath },
    { key: "dj" as const, path: djStoragePath },
    { key: "both" as const, path: bothStoragePath },
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
    if (role.key === "dj") {
      await unblockUserIfNeeded(page, SYNTHETIC_DISPLAY_NAMES.planner);
      await unblockUserIfNeeded(page, SYNTHETIC_DISPLAY_NAMES.both);
    }
      await context.storageState({ path: role.path });
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
