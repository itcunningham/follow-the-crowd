import { supabase } from "@/lib/supabaseClient";
import type { BookingRequestInput } from "@/lib/bookingRequests";
import { normalizeStoredRate } from "@/lib/bookingRate";
import { CURRENT_USER_ID } from "@/lib/user/currentUser";

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
  eventDate: string;
  setTime: string;
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
    event_date: input.eventDate.trim(),
    set_time: input.setTime.trim(),
    fee: normalizeStoredRate(input.fee),
    notes: input.notes.trim(),
  };
}

export function bookingPlanToRequestInput(plan: BookingPlan): BookingRequestInput {
  return {
    eventName: plan.event_name,
    venue: plan.venue,
    eventDate: plan.event_date,
    setTime: plan.set_time,
    fee: normalizeStoredRate(plan.fee),
    notes: plan.notes,
  };
}

export async function listBookingPlans(
  ownerId: string = CURRENT_USER_ID,
): Promise<BookingPlan[]> {
  const { data, error } = await supabase
    .from("booking_plans")
    .select(BOOKING_PLAN_FIELDS)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as BookingPlan[];
}

export async function getBookingPlanById(planId: string): Promise<BookingPlan | null> {
  const { data, error } = await supabase
    .from("booking_plans")
    .select(BOOKING_PLAN_FIELDS)
    .eq("id", planId)
    .eq("owner_id", CURRENT_USER_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as BookingPlan | null) ?? null;
}

export async function createBookingPlan(input: BookingPlanInput): Promise<BookingPlan> {
  const { data, error } = await supabase
    .from("booking_plans")
    .insert({
      owner_id: CURRENT_USER_ID,
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
  const { data, error } = await supabase
    .from("booking_plans")
    .update(mapPlanInputToRow(input))
    .eq("id", planId)
    .eq("owner_id", CURRENT_USER_ID)
    .select(BOOKING_PLAN_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data as BookingPlan;
}
