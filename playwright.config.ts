import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const AUTH_DIR = path.join("test-results", ".auth");
const PRODUCTION_BASE_URL = "https://follow-the-crowd.vercel.app";

export default defineConfig({
  testDir: path.join("e2e"),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: process.env.FTC_QA_BASE_URL ?? PRODUCTION_BASE_URL,
    ...devices["iPhone 13"],
    trace: "off",
    video: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "authenticated-prod",
      testMatch: /journeys\/.*\.spec\.ts/,
      dependencies: ["setup"],
    },
  ],
  globalTeardown: path.join("e2e", "global-teardown.ts"),
  outputDir: path.join("test-results", "playwright-output"),
});

export { AUTH_DIR, PRODUCTION_BASE_URL };
