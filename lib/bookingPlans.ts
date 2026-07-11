import { supabase } from "@/lib/supabaseClient";
import type { BookingRequestInput } from "@/lib/bookingRequests";
import { normalizeStoredRate } from "@/lib/bookingRate";
import { getCurrentUserId } from "@/lib/user/currentUser";

export type BookingPlan = {
  id: string;
  created_at: string;
  owner_id: string;
  name: string;
  event_name: string;
  venue: string;
  event_date: string;
  set_time: string;
  fee: string;
  notes: string;
};

export type BookingPlanInput = {
  name: string;
  eventName: string;
  venue: string;
  fee: string;
  notes: string;
};

const BOOKING_PLAN_FIELDS =
  "id, created_at, owner_id, name, event_name, venue, event_date, set_time, fee, notes";

function mapPlanInputToRow(input: BookingPlanInput) {
  return {
    name: input.name.trim(),
    event_name: input.eventName.trim(),
    venue: input.venue.trim(),
    event_date: "",
    set_time: "",
    fee: normalizeStoredRate(input.fee),
    notes: input.notes.trim(),
  };
}

export function bookingPlanToRequestInput(plan: BookingPlan): BookingRequestInput {
  return {
    eventName: plan.event_name,
    venue: plan.venue,
    eventDate: "",
    setTime: "",
    fee: normalizeStoredRate(plan.fee),
    notes: plan.notes,
    rateMode: "fixed",
  };
}

export async function listBookingPlans(ownerId?: string): Promise<BookingPlan[]> {
  const userId = ownerId ?? (await getCurrentUserId());
  const { data, error } = await supabase
    .from("booking_plans")
    .select(BOOKING_PLAN_FIELDS)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as BookingPlan[];
}

export async function getBookingPlanById(planId: string): Promise<BookingPlan | null> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("booking_plans")
    .select(BOOKING_PLAN_FIELDS)
    .eq("id", planId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as BookingPlan | null) ?? null;
}

export async function createBookingPlan(input: BookingPlanInput): Promise<BookingPlan> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("booking_plans")
    .insert({
      owner_id: userId,
      ...mapPlanInputToRow(input),
    })
    .select(BOOKING_PLAN_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data as BookingPlan;
}

export async function updateBookingPlan(
  planId: string,
  input: BookingPlanInput,
): Promise<BookingPlan> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from("booking_plans")
    .update(mapPlanInputToRow(input))
    .eq("id", planId)
    .eq("owner_id", userId)
    .select(BOOKING_PLAN_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data as BookingPlan;
}

export async function deleteBookingPlans(planIds: string[]): Promise<void> {
  if (planIds.length === 0) {
    return;
  }

  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from("booking_plans")
    .delete()
    .in("id", planIds)
    .eq("owner_id", userId);

  if (error) {
    throw error;
  }
}
