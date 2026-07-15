import { chmodSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const QA_ENV_FILE = ".env.qa.local";

const REQUIRED_VARS = [
  "FTC_QA_PLANNER_EMAIL",
  "FTC_QA_PLANNER_PASSWORD",
  "FTC_QA_DJ_EMAIL",
  "FTC_QA_DJ_PASSWORD",
  "FTC_QA_BOTH_EMAIL",
  "FTC_QA_BOTH_PASSWORD",
] as const;

export type QaRole = "planner" | "dj" | "both";

export type QaCredentials = Record<
  QaRole,
  {
    email: string;
    password: string;
  }
>;

function assertOwnerReadableOnly(filePath: string): void {
  if (process.platform === "win32") {
    return;
  }

  const mode = statSync(filePath).mode & 0o777;
  if (mode & 0o077) {
    chmodSync(filePath, 0o600);
  }
}

export function loadQaCredentials(): QaCredentials {
  const envPath = path.resolve(process.cwd(), QA_ENV_FILE);

  if (!existsSync(envPath)) {
    throw new Error(
      `Missing ${QA_ENV_FILE}. Copy .env.qa.local.example to ${QA_ENV_FILE} and add synthetic QA account values.`,
    );
  }

  assertOwnerReadableOnly(envPath);
  loadEnv({ path: envPath, override: true });

  const missing = REQUIRED_VARS.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required QA environment variables: ${missing.join(", ")}`);
  }

  return {
    planner: {
      email: process.env.FTC_QA_PLANNER_EMAIL!.trim(),
      password: process.env.FTC_QA_PLANNER_PASSWORD!.trim(),
    },
    dj: {
      email: process.env.FTC_QA_DJ_EMAIL!.trim(),
      password: process.env.FTC_QA_DJ_PASSWORD!.trim(),
    },
    both: {
      email: process.env.FTC_QA_BOTH_EMAIL!.trim(),
      password: process.env.FTC_QA_BOTH_PASSWORD!.trim(),
    },
  };
}

export { QA_ENV_FILE, REQUIRED_VARS };
