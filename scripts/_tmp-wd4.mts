import { createClient } from "@supabase/supabase-js";
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SR_KEY!, { auth: { persistSession: false } });
const n = await db.from("notifications")
  .select("id, created_at, user_id, type, title, body, link, message_id")
  .or("title.ilike.%ithdrew%,title.ilike.%ancelled%")
  .order("created_at", { ascending: false }).limit(6);
console.log("notifications error:", n.error ? `${n.error.code} ${n.error.message}` : "none");
console.log(`\n=== withdrawal/cancellation notifications: ${n.data?.length ?? 0} ===`);
for (const x of n.data ?? []) {
  console.log(`\n${x.created_at}  ${JSON.stringify(x.title)}`);
  console.log(`  id=${x.id}  -> ${String(x.user_id).slice(0,8)}  type=${x.type}`);
  console.log(`  link=${x.link}`);
  console.log(`  message_id=${x.message_id ?? "NULL"}`);
  if (x.message_id) {
    const m = await db.from("messages").select("id, created_at, text").eq("id", x.message_id).maybeSingle();
    console.log(`  target: ${m.data ? `${m.data.created_at} ${JSON.stringify(String(m.data.text).slice(0,60))}` : "MISSING"}`);
  }
}
const c = await db.from("messages").select("id, created_at, user_id, text")
  .ilike("text", "%ancelled%").order("created_at",{ascending:false}).limit(5);
console.log(`\n=== newest cancellation DM notices: ${c.data?.length ?? 0} ===`);
for (const m of c.data ?? []) console.log(`  ${m.created_at} ${m.id} ${JSON.stringify(String(m.text).slice(0,70))}`);
