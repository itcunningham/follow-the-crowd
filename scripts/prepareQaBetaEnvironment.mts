/**
 * Prepare a clean QA environment for FTC beta readiness testing.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local (local scripts only — never in Vercel).
 * Equivalent to scripts/cleanupTestData.sql, executed table-by-table via PostgREST.
 *
 * Usage:
 *   npm run qa:reset-environment -- --confirm
 *
 * Without --confirm, prints a dry-run summary only.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PERMANENT_QA_DISPLAY_NAMES = [
  "FTC QA Planner",
  "FTC QA DJ",
  "FTC QA DJ 1",
  "FTC QA DJ 2",
  "FTC QA DJ 3",
  "FTC QA Both",
] as const;

/** FK-safe delete order — keep in sync with scripts/cleanupTestData.sql */
const DELETE_TARGETS: Array<{ table: string; idColumn?: string; filterValue?: string }> = [
  { table: "user_reports" },
  { table: "message_reactions" },
  { table: "message_attachments" },
  { table: "message_reads" },
  { table: "booking_request_history_hides", idColumn: "user_id", filterValue: "" },
  { table: "notifications" },
  { table: "messages" },
  { table: "event_run_sheet_rows" },
  { table: "event_run_sheet_columns" },
  { table: "booking_requests" },
  { table: "events" },
  { table: "booking_plans" },
  { table: "conversation_members" },
  { table: "conversations" },
  { table: "dj_availability" },
  { table: "user_blocks" },
];

const COUNT_TABLES = DELETE_TARGETS.map((target) => target.table);

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local (see .env.example).`);
  }
  return value;
}

async function deleteAllRows(
  supabase: SupabaseClient,
  table: string,
  idColumn = "id",
  filterValue = "00000000-0000-0000-0000-000000000000",
): Promise<number> {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .neq(idColumn, filterValue);

  if (error) {
    if (error.code === "42P01") {
      console.warn(`  skip ${table}: table not found (${error.message})`);
      return 0;
    }
    throw new Error(`Failed to delete from ${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function countRows(supabase: SupabaseClient, table: string): Promise<number | null> {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) {
    if (error.code === "42P01") {
      return null;
    }
    throw new Error(`Failed to count ${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function verifyQaAccounts(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase
    .from("users")
    .select("user_id, display_name, role, onboarding_complete")
    .in("display_name", [...PERMANENT_QA_DISPLAY_NAMES])
    .order("display_name");

  if (error) {
    throw new Error(`Failed to verify QA accounts: ${error.message}`);
  }

  const rows = data ?? [];
  console.log("\nPermanent QA accounts (preserved):");
  if (rows.length === 0) {
    console.warn("  WARNING: No permanent QA accounts found by display_name.");
    return;
  }

  for (const row of rows) {
    console.log(
      `  - ${row.display_name} (${row.role}, onboarding=${row.onboarding_complete})`,
    );
  }

  const foundNames = new Set(rows.map((row) => row.display_name));
  const missing = PERMANENT_QA_DISPLAY_NAMES.filter((name) => !foundNames.has(name));
  if (missing.length > 0) {
    console.warn(`  Note: these QA names were not found (create manually if needed): ${missing.join(", ")}`);
  }
}

async function main(): Promise<void> {
  const confirmed = process.argv.includes("--confirm");
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  console.log("FTC QA beta environment reset");
  console.log(`Target: ${url}`);
  console.log(`Mode: ${confirmed ? "LIVE DELETE" : "dry-run (pass --confirm to execute)"}\n`);

  if (!confirmed) {
    console.log("Tables that would be wiped (all rows):");
    for (const target of DELETE_TARGETS) {
      console.log(`  - ${target.table}`);
    }
    console.log("\nPreserved: auth.users, public.users profiles, RLS, storage buckets.");
    console.log("Run with --confirm to execute against Supabase.");
    return;
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Deleting transactional QA data...");
  for (const target of DELETE_TARGETS) {
    const deleted = await deleteAllRows(
      supabase,
      target.table,
      target.idColumn,
      target.filterValue,
    );
    console.log(`  ${target.table}: ${deleted} row(s) deleted`);
  }

  console.log("\nPost-cleanup row counts (expect 0):");
  for (const table of COUNT_TABLES) {
    const count = await countRows(supabase, table);
    if (count === null) {
      console.log(`  ${table}: (table not found)`);
      continue;
    }
    const status = count === 0 ? "ok" : "NON-ZERO";
    console.log(`  ${table}: ${count} [${status}]`);
    if (count !== 0) {
      throw new Error(`Cleanup incomplete: ${table} still has ${count} row(s).`);
    }
  }

  await verifyQaAccounts(supabase);
  console.log("\nQA beta environment reset complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
