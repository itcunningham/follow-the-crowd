import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SR_KEY!, { auth: { persistSession: false } });
const r = await db.from("booking_requests").select("id, status, cancelled_at").order("created_at",{ascending:false}).limit(5);
console.log("booking_requests error:", r.error ? `${r.error.code} :: ${r.error.message}` : "none");
console.log("rows:", r.data?.length ?? 0, JSON.stringify(r.data));
