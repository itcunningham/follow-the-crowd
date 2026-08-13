# Private planner–DJ roster — beta design

**Status:** design only, nothing implemented. Awaiting approval.
**Branch:** `agent/planner-dj-roster` (base `b3973487`)

---

## 0. The finding that shapes everything else

`users_select_authenticated` on `public.users` is:

```sql
for select to authenticated using (auth.uid() is not null)
```

**Any authenticated account can already read every user row**, directly through the
REST API, regardless of what the UI shows. A private roster therefore delivers
**curation, not confidentiality**. It changes which DJs a planner *is shown*; it
does not stop a determined user enumerating every DJ on the platform.

This must not be described to promoters as "your DJ list is private from other
promoters" in the security sense. It is private in the *workspace* sense.

Real confidentiality would require tightening that policy, which reaches profiles,
crew chat, run sheet, booking cards and avatars — a far larger change, and not
beta work. Recorded, not solved.

---

## 1. Recommended entry model: **add by exact @username, plus automatic add on booking**

| Model | Cold start | Surface | Verdict |
|---|---|---|---|
| **Add by exact `@username`** | ✅ solves it | 1 table, 1 query, 1 input | **Ship** |
| **Auto-add on booking sent** | ❌ circular alone | ~5 lines in the send path | **Ship** (with the above) |
| Invite by link/code | ✅ and grows platform | token table, claim route, expiry, revocation | **Next**, not beta |
| Invite by email | ✅ reaches non-users | clients cannot read `auth.users`; needs server route + service role + email infra | **Defer** |
| Global directory | ✅ | this is today's behaviour | Out of scope by request |

**Why this pair.** Add-by-username is the smallest thing that can populate an empty
roster: `username` already carries a unique index (`users_username_unique_idx`), so
exact lookup needs no new indexing and no fuzzy search. Auto-add on booking then
makes the roster self-maintaining — every planner who books someone accumulates a
roster without touching any new UI.

**Why not email for beta.** The coached beta is 5–10 planner/DJ pairs **who already
know each other**. Email invite solves platform growth, which beta does not need,
and costs the most: `auth.users` is not client-readable, so it needs a server route
holding the service-role key, plus email delivery, plus a claim-on-signup flow. It
is also an email-enumeration oracle if it reveals whether an address is registered.

**Link/code is the natural successor** — this market coordinates over Instagram and
WhatsApp, not email, so a shareable join link fits real behaviour better than email
ever will. Design it after beta.

---

## 2. Schema

```sql
create table if not exists public.planner_dj_roster (
  planner_id  text        not null,
  dj_id       text        not null,
  source      text        not null default 'manual',   -- manual | booking | backfill
  created_at  timestamptz not null default now(),
  primary key (planner_id, dj_id),
  constraint planner_dj_roster_no_self check (planner_id <> dj_id)
);

create index if not exists planner_dj_roster_planner_idx on public.planner_dj_roster (planner_id);
```

`text` ids, matching every other table in this codebase (`auth.uid()::text`).
The composite primary key makes every add idempotent — `on conflict do nothing`
means auto-add on booking can run unconditionally without duplicate handling.

`source` exists so backfilled and booking-derived rows can be told apart from
deliberate adds later, and so a bad backfill can be reversed by `source` alone.

---

## 3. RLS

```sql
alter table public.planner_dj_roster enable row level security;

create policy "planner_dj_roster_select_own" on public.planner_dj_roster
  for select to authenticated
  using (planner_id = public.auth_user_id());

create policy "planner_dj_roster_insert_own" on public.planner_dj_roster
  for insert to authenticated
  with check (planner_id = public.auth_user_id());

create policy "planner_dj_roster_delete_own" on public.planner_dj_roster
  for delete to authenticated
  using (planner_id = public.auth_user_id());
```

No `update` policy — there is nothing mutable.

**Deliberately scoped to the planner only.** The DJ cannot read which planners have
added them. That is the smaller surface and no UI needs the reverse direction. If a
"promoters who work with you" view is ever wanted, add a second select policy then.

**Not enforced in RLS:** that `dj_id` is actually a DJ. Postgres cannot express that
cheaply without a subquery in `with check`, and the consequence of a bad row is a
non-DJ appearing in one planner's own picker — visible only to them, and deletable.
Enforce in the client query; do not pay for a policy subquery on every insert.

**Follow the rule this repo learned the hard way:** add these three policy names to
the drop list in `setupProductionRls.sql` so a re-run is idempotent, and re-run the
security audit after applying (`REL-05a`).

---

## 4. Migration and backfill

```sql
insert into public.planner_dj_roster (planner_id, dj_id, source)
select distinct br.sender_id, br.recipient_id, 'backfill'
from public.booking_requests br
join public.users p on p.user_id = br.sender_id
join public.users d on d.user_id = br.recipient_id
where p.role in ('promoter','both')
  and d.role in ('dj','both')
  and br.sender_id <> br.recipient_id
on conflict do nothing;
```

Idempotent, and reversible with `delete ... where source = 'backfill'`.

Every planner who has ever sent a booking starts with a populated roster. Only a
genuinely new planner starts empty — which is exactly the case §7 handles.

Run a read-only pre-flight first (count rows this would insert, and how many
planners end up with zero) before applying, per the reset-doc procedure.

---

## 5. `listBookableDjs()` changes

Today it selects **every** user and filters client-side to `role in ('dj','both')`.
Three call sites: `useSendBookingRequestsDraft.ts:51`, `bookings/page.tsx:998`
and `:1234`.

**Do not change its behaviour. Add a sibling and gate it.**

```ts
export async function listRosterDjs(): Promise<UserProfile[]> {
  const currentUserId = await getCurrentUserId();
  const { data: roster } = await supabase
    .from("planner_dj_roster").select("dj_id").eq("planner_id", currentUserId);
  const ids = (roster ?? []).map((r) => r.dj_id as string);
  if (ids.length === 0) return [];
  const { data } = await supabase.from("users").select(PROFILE_FIELDS).in("user_id", ids);
  return /* same role/onboarding/display-name filter and sort as listBookableDjs */;
}
```

Call sites choose via one flag:

```ts
const djs = ROSTER_SCOPING_ENABLED ? await listRosterDjs() : await listBookableDjs();
```

**This is the single most important safety property of the design.** Building the
roster and enforcing the roster ship separately. The table, the add flow and the
backfill all land with the flag **off**, changing nothing. The flag flips only once
rosters are demonstrably populated. If scoping goes wrong, the rollback is a flag,
not a migration.

---

## 6. UI flow

Unchanged entry point: **Event → `Invite DJs` → picker**. The picker is
`SendBookingRequestsPanel`, already mounted on event detail, the events page and the
calendar-create flow.

One addition inside the picker, above the existing search field:

```
[ Add a DJ by @username        ] [ Add ]
```

Exact match only. On success the DJ appears in the list below, already selected.
On no match: *"No DJ found with that username."* — the same message whether the
username does not exist or belongs to a promoter, so the field cannot be used to
probe account types.

The existing `Search name or genre` field then filters **within the roster**
instead of within all DJs. Same component, same behaviour, smaller pool.

No new route, no new page, no navigation change — therefore no new 390/1280 parity
risk beyond the one added row.

---

## 7. Brand-new planner, zero roster members

The failure mode to design against: scoping turns on, roster is empty, planner
cannot book anyone, and the product is **worse than before**.

Three defences, in order of importance:

1. **The flag.** Scoping is off until rosters are populated. A new planner cannot hit
   an empty roster before the add path exists, because both ship together.
2. **Empty state that is an action, not a dead end.** With zero roster members the
   picker shows the add-by-username field and one line — *"Add the DJs you work with
   by their @username."* — never an empty list with a search box over nothing.
3. **Auto-add on booking.** The moment they book anyone, the roster is non-empty
   permanently.

**Explicit gate before flipping the flag:** query how many planners with ≥1 event
would have an empty roster. If that number is not zero, do not flip.

---

## 8. A DJ on multiple rosters

Fully supported and requires no special handling — the primary key is
`(planner_id, dj_id)`, so the same DJ is simply several independent rows.

Planner A adding a DJ has **no effect** on Planner B's roster. Neither planner can
see the other's rows: the select policy is `planner_id = auth_user_id()`. This is
exactly the requested property — the same DJ appears for both only if each added
them independently.

The DJ experiences nothing different. Bookings, DMs, crew chat and run sheet are
all keyed off `booking_requests` and `events`, none of which this table touches.

---

## 9. Does a DJ approve being added?

**No, for beta — and the reason matters.**

Adding a DJ to a roster **grants the planner nothing they did not already have**.
Today any planner can book any DJ. The roster only *narrows* what a planner sees.
It is a bookmark, not a permission, so there is no privilege for the DJ to consent
to. Requiring approval would add a notification type, an accept/decline surface and
a pending state, to authorise something that was already allowed.

**Revisit if the roster ever confers capability** — showing DJ availability, rates,
or contact details to roster owners. At that point it becomes a permission and
consent is required. Write that trigger down now, because it will not be obvious
later.

---

## 10. Edge cases and privacy

| Case | Behaviour |
|---|---|
| DJ deletes their account | Roster row dangles. Add `on delete cascade` if `users` rows are truly deleted; if accounts are soft-deleted, filter on `onboarding_complete` as the query already does. **Check which before implementing.** |
| DJ changes username | Roster is keyed on `user_id`, so it survives. Correct by construction. |
| Planner adds themselves | Blocked by the `check (planner_id <> dj_id)` constraint. |
| Planner adds a promoter | Client filters on role; a stray row is visible only to that planner and deletable. |
| Username enumeration | Exact-match only, no prefix search, identical error for "not found" and "not a DJ". Note the users table is already fully readable (§0), so this adds no exposure it does not already have. |
| Role changes `dj` → `promoter` | Falls out of the picker via the role filter; row remains, harmless. |
| Two planners, same DJ | §8 — independent rows, mutually invisible. |
| Backfill run twice | `on conflict do nothing`. Idempotent. |

---

## 11. Code surface and risk

| Area | Size | Risk |
|---|---|---|
| SQL: table, 3 policies, backfill | ~50 lines, new script | Low — new table, nothing existing altered |
| `lib/user/plannerDjRoster.ts` (new) | ~90 lines | Low |
| `listRosterDjs()` in `currentUser.ts` | ~20 lines added, existing function untouched | Low |
| 3 call sites, flag-gated | ~3 lines each | Low while flag is off |
| Picker: add field + empty state | ~60 lines in `SendBookingRequestsPanel` | Medium — shared by three surfaces |
| Auto-add on booking send | ~5 lines in `createBookingRequest` | Medium — must not fail the booking; wrap like the existing notification `try/catch` |

**Total: roughly 250 lines, one new table, no existing behaviour changed while the
flag is off.**

The single real risk is the flag flip, and §7's gate is what controls it.

Auto-add deserves the same treatment the notification call already gets in
`createBookingRequest` — a booking must never fail because a roster insert did.

---

## 12. Tests required before closed beta

**RLS, mutation-tested** — the load-bearing ones:
1. Planner B cannot `select` Planner A's roster rows.
2. Planner B cannot `insert` a row with `planner_id` = Planner A.
3. Planner B cannot `delete` Planner A's rows.
4. A DJ cannot read rosters they appear on.

Each must be verified by attempting it as the wrong account and confirming zero
rows or a denial — not by reading the policy text.

**Behaviour:**
5. Flag off → all three call sites return exactly today's result. *This is the
   regression that protects the rollback path.*
6. `listRosterDjs` returns only roster members.
7. Empty roster → add-by-username empty state, not an empty search.
8. Add by username: exact match adds; wrong case, partial match and promoter
   username all produce the identical not-found message.
9. Auto-add on booking creates exactly one row and is idempotent across resends.
10. A failing roster insert does not fail the booking.
11. Backfill is idempotent; second run inserts zero.

**Two-account live** (the harness cannot produce these):
12. Planner A adds DJ X; Planner B's picker does not show X.
13. Both planners add X independently; both see X; neither sees the other's row.
14. New planner, empty roster: add by username, then send a booking, end to end.

**Pre-flip gate:** planners with ≥1 event and an empty roster must be zero.

---

---

# Approved decisions (2026-08-08)

1. DJs do **not** see which planners rostered them in beta.
2. Feature flag is a **code-level constant**, reviewed in a commit — not an env var.
3. Curation vs confidentiality understood. Internal phrasing is **"private roster
   view"**. Never "other promoters cannot access these DJs".
4. Auto-add fires when a booking request is **created**, not on acceptance. A
   declined DJ vanishing from future search would be the wrong outcome — the roster
   records intent, not success.
5. Deletion model resolved: **soft-delete**. No foreign key, no cascade. See below.

---

# SQL design — for review, not yet applied

## Deletion model: evidence and consequence

`delete_account_data()` (`setupAccountDeletion.sql:222`) **updates** the
`public.users` row — `display_name='Deleted User'`, `role=null`,
`onboarding_complete=false`, `deleted_at=now()` — and hard-deletes only
`auth.users` (line 261). If no profile row exists it *inserts* a tombstone.

Consequences, in order of importance:

* **No `ON DELETE CASCADE`.** The row is never deleted, so a cascade would never
  fire. Worse than absent: it reads as protection that does not exist.
* **No foreign key at all.** No table in this schema declares one to
  `public.users` — not `booking_requests`, not `messages`. This would be the first.
* **Cleanup belongs in `delete_account_data()`**, alongside the eight tables it
  already clears, and must run **in both directions**:
  `where planner_id = v_user_id or dj_id = v_user_id`. The `dj_id` half is the one
  that is easy to forget — without it a deleted DJ leaves a stale row on every
  planner's roster forever.
* **Product consequence to be aware of:** deleting an account silently removes that
  DJ from every promoter's roster, with no notification. Correct for beta; the
  alternative is telling promoters about someone who left.

## Table

`public.planner_dj_roster` — `planner_id text`, `dj_id text`, `source text` default
`'manual'`, `created_at timestamptz` default `now()`.
Primary key `(planner_id, dj_id)`; check `planner_id <> dj_id`; index on
`planner_id`.

`text` ids match every other table. The composite PK makes every add idempotent, so
auto-add on booking can run unconditionally with `on conflict do nothing`. `source`
(`manual` | `booking` | `backfill`) exists so a bad backfill is reversible by
`source` alone.

## Policies — three, the minimum

`select`, `insert`, `delete`, each `to authenticated`, each keyed on
`planner_id = public.auth_user_id()`. No `update` policy: nothing is mutable.

The DJ side is deliberately unreadable — decision 1. Enforcement that `dj_id` is a
real DJ stays in the client query, not in `with check`: a policy subquery would cost
on every insert, and the worst case is one stray row visible only to its owner.

**Correction to an earlier draft of this doc:** it said to add the three policy
names to the drop list in `setupProductionRls.sql`. That would be **destructive**.
That file drops *and re-creates* its own policies; adding drops without matching
creates means any re-run of it silently deletes the roster policies. Idempotency
belongs as drop-then-create inside `setupPlannerDjRoster.sql`, which is now the
single owner of these three names. Re-run the security audit after applying
(`REL-05a`) — that part stands.

## Roster read filter

`role in ('dj','both')` **and** `onboarding_complete` **and** `deleted_at is null`
**and** non-empty `display_name`.

`deleted_at is null` is strictly redundant today — anonymisation already nulls `role`
and clears `onboarding_complete`, so a deleted DJ drops out anyway. It is stated
explicitly so the filter does not silently depend on anonymisation continuing to do
that.

## Backfill

Distinct `(sender_id, recipient_id)` from `booking_requests`, restricted to eligible
planners and eligible DJs, `source='backfill'`, `on conflict do nothing`.
Idempotent; reversible via `delete ... where source = 'backfill'`.

Uses only `sender_id` / `recipient_id` — present since the base table, so the
backfill does not depend on any later migration.

## Not in the SQL

Auto-add on booking creation is **application code**, not migration. It belongs in
`createBookingRequest`, wrapped like the existing notification `try/catch` at
`bookingRequests.ts:2292` — a booking must never fail because a roster insert did.

## Flag

Ships **OFF**. `listBookableDjs()` is not modified; `listRosterDjs()` is added
beside it and the three call sites choose between them. Nothing changes until the
flag flips, and the flip is gated on pre-flight row 20 reading zero.

---

## Open decisions for Isaac

1. **Are `users` rows hard-deleted or soft-deleted?** Decides `on delete cascade`.
2. **Should DJs see which planners rostered them?** Recommend no for beta.
3. **Flag name and location** — env var vs a constant. Recommend a constant, so
   flipping it is a reviewed commit rather than a dashboard toggle.
4. **Confirm §0 is understood** — this is curation, not confidentiality, and must
   not be described to promoters as security.
