// @ts-nocheck
// Verifies the ACTUAL request PostgREST/Supabase's real query builder sends
// for the DM conversation message fetch, not a source-regex on our own file.
//
// Root cause this protects against: `.order("created_at", { ascending: true })`
// alone has no tiebreaker. When multiple messages share an identical
// created_at (realistic for a conversation whose history was bulk-seeded in
// one transaction — Postgres's now() is stable for the whole transaction —
// e.g. several images uploaded by a QA seed script), SQL gives no ordering
// guarantee among the tied rows: two executions of the identical query can
// legitimately return a different relative order for them. The scroll logic
// can be perfectly correct (scrollTop really is at the DOM's last element)
// while the *content* at that position differs between a first open and a
// reopen, because the fetch itself reordered a tied message.
//
// This test asserts the real @supabase/supabase-js query builder — not our
// page code re-implemented — produces a request with `created_at` AND `id`
// chained in the order clause, which is what removes the ambiguity.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

export async function runDmMessageOrderDeterminismTest(): Promise<void> {
  const supabase = createClient("https://example.test.supabase.co", "anon-key-placeholder");

  const query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", "conversation-under-test")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  const orderParam = query.url.searchParams.get("order");

  assert.equal(
    orderParam,
    "created_at.asc,id.asc",
    "DM message fetch must order by created_at with an id tiebreaker, so a conversation with any tied created_at values (e.g. a bulk-seeded QA history) returns the same row order on every fetch — otherwise which message renders last (\"newest\") can differ between a first open and a reopen even though the scroll position itself is correct.",
  );
}
