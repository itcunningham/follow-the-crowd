import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
}

if (!supabaseUrl.startsWith("https://") || !supabaseUrl.includes(".supabase.co")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL (https://xxxxx.supabase.co)",
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
