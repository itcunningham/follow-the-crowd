import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SR_KEY!, { auth: { persistSession: false } });

console.log("=== newest cancelled/withdrawn bookings ===");
const { data: br } = await db.from("booking_requests")
  .select("id, status, sender_id, recipient_id, conversation_id, cancelled_at, cancelled_by, created_at")
  .not("cancelled_at", "is", null).order("cancelled_at", { ascending: false }).limit(5);
for (const b of br ?? []) {
  console.log(`\nbooking ${b.id}`);
  console.log(`  status=${b.status} cancelled_at=${b.cancelled_at} cancelled_by=${String(b.cancelled_by).slice(0,8)}`);
  console.log(`  sender(planner)=${String(b.sender_id).slice(0,8)} recipient(dj)=${String(b.recipient_id).slice(0,8)}`);
  // the cancellation DM notice
  const { data: msgs } = await db.from("messages")
    .select("id, created_at, user_id, text")
    .eq("conversation_id", b.conversation_id)
    .gte("created_at", b.cancelled_at!)
    .order("created_at", { ascending: true }).limit(4);
  for (const m of msgs ?? []) console.log(`  msg ${m.id} ${m.created_at} ${JSON.stringify(String(m.text).slice(0,70))}`);
  // notifications around that time
  const { data: ns } = await db.from("notifications")
    .select("id, created_at, user_id, type, title, link, message_id")
    .gte("created_at", b.cancelled_at!)
    .lte("created_at", new Date(new Date(b.cancelled_at!).getTime()+120000).toISOString())
    .order("created_at", { ascending: true });
  if (!ns?.length) console.log("  *** NO notification created in the 2min window ***");
  for (const n of ns ?? []) {
    console.log(`  notif ${n.created_at} -> ${String(n.user_id).slice(0,8)} type=${n.type} ${JSON.stringify(n.title)}`);
    console.log(`        link=${n.link} message_id=${n.message_id ?? "NULL"}`);
  }
}
