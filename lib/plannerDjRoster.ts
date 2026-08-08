import { supabase } from "@/lib/supabaseClient";

/**
 * Whether the DJ picker is scoped to the planner's own roster.
 *
 * A code constant rather than an env var on purpose: flipping it is a reviewed
 * commit with a diff, not a dashboard toggle nobody can point at afterwards.
 *
 * While this is false, `listBookableDjs()` remains the only behaviour anyone
 * sees and every DJ still shows — so the roster can be built, backfilled and
 * populated with zero user-visible change, and the rollback for anything wrong
 * is one line rather than a migration.
 *
 * Do not flip until every active planner has a non-empty roster. The gate query
 * is row 30 of scripts/… post-migration verification: eligible planners owning
 * an event but holding no roster rows must be zero.
 */
export const ROSTER_SCOPING_ENABLED = false;

/**
 * Deliberately identical for "no such username" and "that username is not a
 * bookable DJ". Distinguishing them would turn this field into a probe for
 * which accounts exist and what type they are.
 */
export const ADD_DJ_NOT_FOUND_MESSAGE = "No DJ found with that username.";

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
