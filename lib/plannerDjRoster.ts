import { supabase } from "@/lib/supabaseClient";

/**
 * Whether the DJ picker is scoped to the planner's own roster.
 *
 * A code constant rather than an env var on purpose: flipping it is a reviewed
 * commit with a diff, not a dashboard toggle nobody can point at afterwards.
 *
 * Enabled 2026-08-08. It shipped `false` first so the table, backfill and
 * add flow could land with zero user-visible change, and was flipped only after
 * a live two-planner test confirmed the isolation actually holds — planner 2
 * did not inherit planner 1's DJ — and after the stranding gate showed no
 * active planner would be left unable to book anyone.
 *
 * `listBookableDjs()` is still the other arm of every call site, so reverting
 * to global discovery is this one line, not a revert of the feature.
 *
 * Before turning it on again after any bulk data change, re-run
 * `scripts/verifyPlannerDjRoster.sql` and confirm row 30: eligible planners
 * owning an event but holding no roster rows must be zero.
 */
export const ROSTER_SCOPING_ENABLED = true;

/**
 * Deliberately identical for "no such username" and "that username is not a
 * bookable DJ". Distinguishing them would turn this field into a probe for
 * which accounts exist and what type they are.
 */
export const ADD_DJ_NOT_FOUND_MESSAGE = "No DJ found with that username";

export type AddDjToRosterResult =
  | { ok: true; djId: string; displayName: string; alreadyPresent: boolean }
  | { ok: false; message: string };

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

/**
 * Add one DJ to the current planner's roster by exact username.
 *
 * Exact match only — no prefix, no fuzzy, no listing. That is what keeps this a
 * private add flow rather than a back-door global directory: a planner can only
 * add someone whose username they already know.
 */
export async function addDjToRosterByUsername(
  plannerId: string,
  rawUsername: string,
): Promise<AddDjToRosterResult> {
  const username = normalizeUsername(rawUsername);

  if (!username) {
    return { ok: false, message: "Enter a username." };
  }

  const { data, error } = await supabase
    .from("users")
    .select("user_id, username, display_name, role, onboarding_complete")
    .eq("username", username)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[roster] username lookup failed:", error);
    return { ok: false, message: "Could not add that DJ. Please try again." };
  }

  const isBookableDj =
    data != null &&
    (data.role === "dj" || data.role === "both") &&
    data.onboarding_complete === true &&
    Boolean((data.display_name as string | null)?.trim());

  if (!isBookableDj) {
    return { ok: false, message: ADD_DJ_NOT_FOUND_MESSAGE };
  }

  const djId = data.user_id as string;

  if (djId === plannerId) {
    return { ok: false, message: "You cannot add yourself to your roster." };
  }

  // The composite primary key makes this idempotent, so re-adding someone who
  // is already there is a success rather than an error the planner has to
  // interpret.
  const { error: insertError } = await supabase
    .from("planner_dj_roster")
    .upsert(
      { planner_id: plannerId, dj_id: djId, source: "manual" },
      { onConflict: "planner_id,dj_id", ignoreDuplicates: true },
    );

  if (insertError) {
    console.error("[roster] add failed:", insertError);
    return { ok: false, message: "Could not add that DJ. Please try again." };
  }

  return {
    ok: true,
    djId,
    displayName: ((data.display_name as string | null) ?? "").trim(),
    alreadyPresent: false,
  };
}

/**
 * Remove one DJ from the current planner's roster.
 *
 * Scoped by BOTH ids. The RLS delete policy already restricts this to
 * `planner_id = auth_user_id()`, so the planner filter is redundant against a
 * correct database — it is stated anyway so a policy regression shows up as a
 * failing test rather than as one planner clearing another's roster.
 *
 * Deletes exactly one row from planner_dj_roster and nothing else. The DJ
 * account, bookings, DMs, crew chat and message history are all keyed off other
 * tables and are untouched: this removes a bookmark, not a relationship. The
 * same DJ can be added back afterwards through the existing username flow.
 */
export async function removeDjFromRoster(
  plannerId: string,
  djId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!plannerId || !djId) {
    return { ok: false, message: "Could not remove that DJ. Please try again." };
  }

  const { error } = await supabase
    .from("planner_dj_roster")
    .delete()
    .eq("planner_id", plannerId)
    .eq("dj_id", djId);

  if (error) {
    console.error("[roster] remove failed:", error);
    return { ok: false, message: "Could not remove that DJ. Please try again." };
  }

  return { ok: true };
}

/**
 * Record the planner→DJ relationship created by sending a booking request.
 *
 * Fires on booking *creation*, not acceptance: a planner who deliberately tried
 * to book someone has shown enough intent to keep them findable. Tying it to
 * acceptance would make a declined DJ disappear from that planner's future
 * searches, which is the wrong outcome.
 *
 * Never throws. A booking that already exists must not fail because a roster
 * row did not — the same reasoning as the notification call beside it.
 */
export async function recordRosterFromBooking(
  plannerId: string,
  djId: string,
): Promise<void> {
  if (!plannerId || !djId || plannerId === djId) {
    return;
  }

  try {
    const { error } = await supabase
      .from("planner_dj_roster")
      .upsert(
        { planner_id: plannerId, dj_id: djId, source: "booking" },
        { onConflict: "planner_id,dj_id", ignoreDuplicates: true },
      );

    if (error) {
      console.error("[roster] booking auto-add failed:", plannerId, djId, error);
    }
  } catch (rosterError) {
    console.error("[roster] booking auto-add threw:", plannerId, djId, rosterError);
  }
}
