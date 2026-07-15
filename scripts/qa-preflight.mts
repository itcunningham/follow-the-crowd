import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadQaCredentials, QA_ENV_FILE } from "../e2e/helpers/credentials";

function runGitCheckIgnore(filePath: string): boolean {
  try {
    execSync(`git check-ignore -q ${filePath}`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function isTracked(filePath: string): boolean {
  try {
    const tracked = execSync(`git ls-files -- ${filePath}`, { encoding: "utf8" }).trim();
    return tracked.length > 0;
  } catch {
    return false;
  }
}

function main(): void {
  if (!runGitCheckIgnore(QA_ENV_FILE)) {
    throw new Error(`${QA_ENV_FILE} is not ignored by git. Update .gitignore before running QA.`);
  }

  if (existsSync(path.resolve(QA_ENV_FILE)) && isTracked(QA_ENV_FILE)) {
    throw new Error(`${QA_ENV_FILE} is tracked by git and must remain ignored.`);
  }

  const shouldValidateCredentials = process.argv.includes("--require-credentials");
  if (!shouldValidateCredentials) {
    console.log("QA preflight passed (credential file ignore rules verified).");
    return;
  }

  try {
    loadQaCredentials();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }

  console.log("QA preflight passed with credentials present.");
}

main();
