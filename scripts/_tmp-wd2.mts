import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SR_KEY!, { auth: { persistSession: false } });
const { data } = await db.from("booking_requests")
  .select("id, status, cancelled_at, cancelled_by, cancellation_reason, created_at, conversation_id, sender_id, recipient_id")
  .order("created_at", { ascending: false }).limit(12);
console.log("=== 12 newest booking_requests ===");
for (const b of data ?? []) {
  console.log(`${b.created_at}  ${b.id.slice(0,8)}  status=${String(b.status).padEnd(9)} cancelled_at=${b.cancelled_at ?? "-"} by=${b.cancelled_by ? String(b.cancelled_by).slice(0,8) : "-"}`);
}
const counts: Record<string, number> = {};
const { data: all } = await db.from("booking_requests").select("status");
for (const r of all ?? []) counts[r.status as string] = (counts[r.status as string] ?? 0) + 1;
console.log("\nstatus counts:", JSON.stringify(counts));
console.log("\n=== newest messages mentioning withdraw/cancel ===");
const { data: m } = await db.from("messages").select("id, created_at, user_id, text")
  .or("text.ilike.%withdr%,text.ilike.%cancel%").order("created_at", { ascending: false }).limit(6);
for (const x of m ?? []) console.log(`  ${x.created_at} ${x.id.slice(0,8)} ${JSON.stringify(String(x.text).slice(0,80))}`);
