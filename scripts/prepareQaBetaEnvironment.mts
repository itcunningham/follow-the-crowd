/**
 * Automated FTC beta environment reset (local runner).
 *
 * Mirrors scripts/resetQaEnvironment.sql via PostgREST + Storage API + Auth Admin.
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Optional: .env.qa.local emails auto-fill profile seeding (same as SQL email map).
 *
 * Usage:
 *   npm run qa:reset-environment          # dry-run
 *   npm run qa:reset-environment -- --confirm
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PERMANENT_QA_DISPLAY_NAMES = [
  "FTC QA Planner",
  "FTC QA DJ",
  "FTC QA DJ 1",
  "FTC QA DJ 2",
  "FTC QA DJ 3",
  "FTC QA Both",
] as const;

type QaSeedProfile = {
  displayName: (typeof PERMANENT_QA_DISPLAY_NAMES)[number];
  role: "promoter" | "dj" | "both";
  username: string;
  bio: string;
  genre: string | null;
  location: string;
  artistName: string | null;
  promoterBrandName: string | null;
  promoterBrandDescription: string | null;
  emailEnvKey?: string;
};

const QA_SEED_PROFILES: QaSeedProfile[] = [
  {
    displayName: "FTC QA Planner",
    role: "promoter",
    username: "ftcqa_planner",
    bio: "Coached beta planner account for Follow The Crowd QA.",
    genre: null,
    location: "Melbourne",
    artistName: null,
    promoterBrandName: "FTC QA Events",
    promoterBrandDescription: "Underground events and curated DJ bookings for beta testing.",
    emailEnvKey: "FTC_QA_PLANNER_EMAIL",
  },
  {
    displayName: "FTC QA DJ",
    role: "dj",
    username: "ftcqa_dj",
    bio: "Primary E2E DJ account — house and disco sets.",
    genre: "house",
    location: "Melbourne",
    artistName: "FTC QA DJ",
    promoterBrandName: null,
    promoterBrandDescription: null,
    emailEnvKey: "FTC_QA_DJ_EMAIL",
  },
  {
    displayName: "FTC QA DJ 1",
    role: "dj",
    username: "ftcqa_dj1",
    bio: "Techno and peak-time warehouse energy — QA DJ 1.",
    genre: "techno",
    location: "Melbourne",
    artistName: "QA DJ One",
    promoterBrandName: null,
    promoterBrandDescription: null,
    emailEnvKey: "FTC_QA_DJ1_EMAIL",
  },
  {
    displayName: "FTC QA DJ 2",
    role: "dj",
    username: "ftcqa_dj2",
    bio: "House, disco, and club grooves — QA DJ 2.",
    genre: "house",
    location: "Melbourne",
    artistName: "QA DJ Two",
    promoterBrandName: null,
    promoterBrandDescription: null,
    emailEnvKey: "FTC_QA_DJ2_EMAIL",
  },
  {
    displayName: "FTC QA DJ 3",
    role: "dj",
    username: "ftcqa_dj3",
    bio: "Drum & bass and breakbeat selections — QA DJ 3.",
    genre: "drum and bass",
    location: "Melbourne",
    artistName: "QA DJ Three",
    promoterBrandName: null,
    promoterBrandDescription: null,
    emailEnvKey: "FTC_QA_DJ3_EMAIL",
  },
  {
    displayName: "FTC QA Both",
    role: "both",
    username: "ftcqa_both",
    bio: "Dual-role QA account — plans events and plays DJ sets.",
    genre: "eclectic",
    location: "Melbourne",
    artistName: "FTC QA Both",
    promoterBrandName: "FTC QA Dual",
    promoterBrandDescription: "Planner and DJ workflows for beta parity testing.",
    emailEnvKey: "FTC_QA_BOTH_EMAIL",
  },
];

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

const STORAGE_BUCKETS_TO_CLEAR = ["dm-attachments", "event-covers"] as const;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local (see .env.example).`);
  }
  return value;
}

function loadOptionalQaEmails(): void {
  const qaEnvPath = path.resolve(".env.qa.local");
  if (existsSync(qaEnvPath)) {
    loadEnv({ path: qaEnvPath, override: true });
  }
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
      console.warn(`  skip ${table}: table not found`);
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

async function listStoragePaths(
  supabase: SupabaseClient,
  bucket: string,
  prefix = "",
): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    throw new Error(`Failed to list storage://${bucket}/${prefix}: ${error.message}`);
  }

  const paths: string[] = [];

  for (const entry of data ?? []) {
    const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id) {
      paths.push(entryPath);
      continue;
    }
    paths.push(...(await listStoragePaths(supabase, bucket, entryPath)));
  }

  return paths;
}

async function clearStorageBucket(supabase: SupabaseClient, bucket: string): Promise<number> {
  const paths = await listStoragePaths(supabase, bucket);
  if (paths.length === 0) {
    return 0;
  }

  const batchSize = 100;
  let removed = 0;

  for (let index = 0; index < paths.length; index += batchSize) {
    const batch = paths.slice(index, index + batchSize);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) {
      throw new Error(`Failed to remove storage://${bucket} objects: ${error.message}`);
    }
    removed += batch.length;
  }

  return removed;
}

async function fetchAuthUsersByEmail(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const emailToUserId = new Map<string, string>();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    for (const user of data.users) {
      if (user.email) {
        emailToUserId.set(user.email.trim().toLowerCase(), user.id);
      }
    }

    if (data.users.length < 200) {
      break;
    }
    page += 1;
  }

  return emailToUserId;
}

function buildProfilePayload(seed: QaSeedProfile): Record<string, string | boolean | null> {
  return {
    role: seed.role,
    onboarding_complete: true,
    display_name: seed.displayName,
    username: seed.username,
    bio: seed.bio,
    genre: seed.genre,
    location: seed.location,
    artist_name: seed.artistName,
    promoter_brand_name: seed.promoterBrandName,
    promoter_brand_description: seed.promoterBrandDescription,
    dj_past_gigs: "",
    promoter_venues_used: "",
    promoter_upcoming_events: "",
    promoter_past_events: "",
    dj_availability: "",
    deleted_at: null,
  };
}

async function seedQaProfiles(supabase: SupabaseClient): Promise<void> {
  const authByEmail = await fetchAuthUsersByEmail(supabase);

  console.log("\nSeeding / normalising QA profiles...");
  for (const seed of QA_SEED_PROFILES) {
    const payload = buildProfilePayload(seed);

    const { data: byDisplayName, error: displayError } = await supabase
      .from("users")
      .select("user_id")
      .eq("display_name", seed.displayName)
      .maybeSingle();

    if (displayError) {
      throw new Error(`Failed to lookup ${seed.displayName}: ${displayError.message}`);
    }

    if (byDisplayName?.user_id) {
      const { error } = await supabase.from("users").update(payload).eq("user_id", byDisplayName.user_id);
      if (error) {
        throw new Error(`Failed to update ${seed.displayName}: ${error.message}`);
      }
      console.log(`  updated ${seed.displayName} (by display_name)`);
      continue;
    }

    const email = seed.emailEnvKey ? process.env[seed.emailEnvKey]?.trim().toLowerCase() : undefined;
    const userId = email ? authByEmail.get(email) : undefined;

    if (!userId) {
      console.warn(`  skip ${seed.displayName}: no profile row and no auth email (${seed.emailEnvKey ?? "n/a"})`);
      continue;
    }

    const { error } = await supabase.from("users").upsert(
      { user_id: userId, ...payload },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(`Failed to upsert ${seed.displayName}: ${error.message}`);
    }
    console.log(`  upserted ${seed.displayName} (auth email ${email})`);
  }
}

async function verifyQaAccounts(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase
    .from("users")
    .select("user_id, display_name, role, onboarding_complete, username")
    .in("display_name", [...PERMANENT_QA_DISPLAY_NAMES])
    .order("display_name");

  if (error) {
    throw new Error(`Failed to verify QA accounts: ${error.message}`);
  }

  const rows = data ?? [];
  console.log("\nPermanent QA accounts:");
  if (rows.length === 0) {
    console.warn("  WARNING: No QA accounts found. Sign up in the app, then re-run seed.");
    return;
  }

  for (const row of rows) {
    console.log(`  - ${row.display_name} (@${row.username}, ${row.role})`);
  }

  const foundNames = new Set(rows.map((row) => row.display_name));
  const missing = PERMANENT_QA_DISPLAY_NAMES.filter((name) => !foundNames.has(name));
  if (missing.length > 0) {
    console.warn(`  Missing: ${missing.join(", ")} — sign up manually, then run seedQaProfiles.sql or re-run with --confirm`);
  }
}

async function main(): Promise<void> {
  loadOptionalQaEmails();

  const confirmed = process.argv.includes("--confirm");

  console.log("FTC Beta Environment Reset (automated runner)");
  console.log(`Mode: ${confirmed ? "LIVE" : "dry-run (pass --confirm to execute)"}`);
  console.log(`SQL equivalent: scripts/resetQaEnvironment.sql\n`);

  if (!confirmed) {
    console.log("Would wipe transactional tables:");
    for (const target of DELETE_TARGETS) {
      console.log(`  - ${target.table}`);
    }
    console.log("\nWould clear storage buckets (avatars preserved):");
    for (const bucket of STORAGE_BUCKETS_TO_CLEAR) {
      console.log(`  - ${bucket}`);
    }
    console.log("\nWould seed QA profiles from .env.qa.local emails (if present).");
    console.log("\nTo execute: npm run qa:reset-environment -- --confirm");
    console.log("(requires SUPABASE_SERVICE_ROLE_KEY in .env.local)");
    console.log("\nOr run scripts/resetQaEnvironment.sql in Supabase SQL Editor (no service role needed).");
    return;
  }

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  console.log(`Target: ${url}`);

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Deleting transactional data...");
  for (const target of DELETE_TARGETS) {
    const deleted = await deleteAllRows(supabase, target.table, target.idColumn, target.filterValue);
    console.log(`  ${target.table}: ${deleted}`);
  }

  console.log("\nClearing QA storage artifacts...");
  for (const bucket of STORAGE_BUCKETS_TO_CLEAR) {
    const removed = await clearStorageBucket(supabase, bucket);
    console.log(`  ${bucket}: ${removed} object(s) removed`);
  }

  await seedQaProfiles(supabase);

  console.log("\nPost-cleanup counts (expect 0):");
  for (const target of DELETE_TARGETS) {
    const count = await countRows(supabase, target.table);
    if (count === null) {
      console.log(`  ${target.table}: (not found)`);
      continue;
    }
    console.log(`  ${target.table}: ${count} ${count === 0 ? "ok" : "NON-ZERO"}`);
    if (count !== 0) {
      throw new Error(`Cleanup incomplete: ${target.table}`);
    }
  }

  await verifyQaAccounts(supabase);
  console.log("\nFTC beta environment reset complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
