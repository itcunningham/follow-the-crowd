import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SQL_PATH = path.join(REPO_ROOT, "scripts/resetQaEnvironment.sql");
const RUNBOOK_PATH = path.join(REPO_ROOT, "docs/qa/FTC-BETA-ENVIRONMENT-RESET.md");

const REQUIRED_MARKERS = [
  "_qa_detected",
  "_qa_user_ids",
  "_qa_booking_requests",
  "_qa_booking_requests_touching",
  "_qa_only_conversations",
  "delete from public.notifications",
  "delete from public.booking_requests",
  "delete from public.events",
  "insert into public.users",
  "qa_booking_requests_mixed_remaining",
  "non_qa_events",
  "BEGIN QA ENVIRONMENT RESET",
  "END QA ENVIRONMENT RESET",
] as const;

function readResetSql(): string {
  return readFileSync(SQL_PATH, "utf8");
}

function validateResetSql(source: string): void {
  for (const marker of REQUIRED_MARKERS) {
    if (!source.includes(marker)) {
      throw new Error(`resetQaEnvironment.sql is missing required marker: ${marker}`);
    }
  }
}

function printRunbookSummary(): void {
  console.log("FTC QA environment reset");
  console.log("");
  console.log("Safest path: run scripts/resetQaEnvironment.sql in Supabase SQL Editor.");
  console.log("It scopes deletes to detected QA accounts only — non-QA users are untouched.");
  console.log("");
  console.log("Runbook:", path.relative(REPO_ROOT, RUNBOOK_PATH));
  console.log("SQL:", path.relative(REPO_ROOT, SQL_PATH));
  console.log("");
  console.log("QA account detection:");
  console.log("  • display_name starts with FTC QA");
  console.log("  • username starts with ftcqa_");
  console.log("  • auth email local-part starts with ftcqa, ftc.qa, or ftc_qa");
  console.log("");
  console.log("Reset removes (QA-scoped):");
  console.log("  • DMs, group/crew chat messages, attachments, reactions, reads");
  console.log("  • Bookings, plans, events, run sheets, notifications");
  console.log("  • DJ availability, blocks, reports, QA-only conversations");
  console.log("  • QA event covers and DM attachment storage (avatars preserved)");
  console.log("");
  console.log("Preserved:");
  console.log("  • auth.users, profiles, avatars, settings, roles");
  console.log("  • Non-QA users and their transactional data");
  console.log("  • Mixed DMs — non-QA messages remain; QA messages removed");
  console.log("  • QA↔non-QA bookings preserved (see qa_booking_requests_mixed_remaining in SQL output)");
  console.log("");
  console.log("After reset:");
  console.log("  • QA profiles re-seeded for Discover/profile browsing");
  console.log("  • No active bookings, negotiations, or conversations for QA accounts");
  console.log("  • Verification queries at the bottom of the SQL output must show 0 QA rows");
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const source = readResetSql();
  validateResetSql(source);

  if (args.has("--print-sql")) {
    process.stdout.write(source);
    return;
  }

  printRunbookSummary();

  if (args.has("--check")) {
    console.log("SQL structure check passed.");
    return;
  }

  console.log("Next step:");
  console.log("  1. Open Supabase Dashboard → SQL → New query");
  console.log("  2. Paste the full contents of scripts/resetQaEnvironment.sql");
  console.log("     (or run: npm run qa:reset -- --print-sql | pbcopy)");
  console.log("  3. Run the query and confirm QA data remaining counts are 0");
}

main();
