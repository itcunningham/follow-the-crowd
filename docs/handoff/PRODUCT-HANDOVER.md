# FTC (Follow The Crowd) — Complete Product Handover

**Audience:** anyone joining FTC on day one (Builder, QA, Release, Product partner).  
**Status:** day-one product + strategy handover. Brand/mission detail → `BRAND-PHILOSOPHY.md`. Roadmap/GTM detail → `PRODUCT-VISION.md`. What shipped → `CURRENT-STATE.md`.  
**Last updated:** 2026-08-04

---

## Vision

FTC is **not** trying to become another social media app.

It starts by solving one painful problem:

> **Running events is messy.**

Promoters currently juggle Instagram DMs, WhatsApp, Messenger, Notes, Google Sheets, emails, and calendars. Everything is scattered.

FTC replaces that workflow with one dedicated operating system.

Long-term vision:

> **Become the operating system for the independent music industry.**

Not just bookings. Everything — grown from the workflow core, not bolted on.

---

## Philosophy

FTC is built around:

> **Workflow first. Community second. Content third.**

Almost every startup does the reverse (followers, likes, feeds, content).

FTC starts with work people already need every weekend. If people depend on FTC to run events, the network forms afterwards.

Always ask: **Does this reduce work?**  
Not: **Is this a cool feature?**

Workflow wins. Always.

Full mission / enemy / feature gate: `BRAND-PHILOSOPHY.md`.

---

## Identity

FTC should always feel:

- Professional
- Underground
- Independent
- Community-driven
- Built by people inside the scene

Never corporate.  
Never “social media trying to be cool.”

Positioning options:

- **FTC is where events get organised.**
- **The operating system for independent events.**

Cultural line: **For the culture, not the clout.** / **For the Culture.**

---

## Initial users

MVP targets: promoters, event planners, DJs, artists, venues.

**No fans. No followers. No reels. No algorithms.** Those come much later.

---

## Current core features

- **Events** — create/edit/cancel; venue, time, notes, status; upcoming / past / cancelled
- **Event Plans** — reusable templates
- **Booking requests** — send/receive; accept/decline; rate negotiation; history
- **Gigs** — artist availability; incoming / confirmed / history
- **Calendars** — planner + artist; month + agenda; deep linking
- **DMs** — production messaging (read receipts, images, reactions, realtime). Reference implementation for all chat.
- **Crew Chat** — one chat per event; shared event context
- **Run Sheet** — from accepted bookings; keep lightweight
- **Profiles** — artists, promoters, venues; bio, genres, links

### What makes FTC different

The **event owns the communication** — not random group chats.

```
Event → Bookings → Crew Chat → Run Sheet → Execution
```

One workflow.

---

## Current stage (honest)

FTC is **not proven yet**.

It is:

- A strong private-beta product
- Built around a genuine workflow problem
- Polished enough to test seriously
- Still dependent on whether real promoters repeatedly choose it over Instagram / WhatsApp / Sheets

It has **not** yet proven: PMF, paid conversion, long-term retention, organic growth, or Melbourne default status.

**Next milestone is not more vision. It is real usage.**

---

## Immediate priority: beta readiness

Do **not** add major features before this phase is complete unless something is genuinely launch-blocking.

Formal QA order:

1. Full promoter journey  
2. Full DJ journey  
3. Messaging regression  
4. Realtime multi-user testing  
5. Permissions and security  
6. Edge cases and destructive actions  
7. Mobile and desktop compatibility  
8. Regression after every fix  
9. Beta onboarding preparation  
10. Real-user feedback collection  

Core promoter booking flow is already considered passed unless a new regression appears. See `docs/qa/`.

### First beta target

- ~5–10 Melbourne promoters  
- DJs connected to those promoters  
- Real events, not demos  
- Recurring nights preferred (weekly test rhythm)  

Observe: what they get instantly, what needs coaching, where they return to IG/Sheets, what they use/ignore, what blocks inviting collaborators.

Coached beta is fine at first. The real test is whether they later operate **without** help.

---

## Success metrics

Downloads are not the important number.

Track:

- Weekly active promoters  
- Events created per promoter  
- Booking requests sent / acceptance rate  
- % events using Crew Chat  
- % accepted DJs on Run Sheet  
- Promoters returning the following week  
- Time from signup to first event  
- External collaborators invited  
- % completing a full event workflow  
- Promoters using FTC for a **second** real event  

Strongest early metric:

> How many promoters use FTC for another event without being reminded?

### Retention signals (what “cool” is not)

- Next event created in FTC  
- DJs invited without prompting  
- Duplicate spreadsheet abandoned  
- Crew Chat checked during the night  
- Asking for operational additions  
- Annoyed when FTC is unavailable  

That is dependency.

First real milestone:

> Promoters saying, “I can’t imagine running my events without FTC.”

---

## Revenue & pricing

**Artists/DJs free. Promoters paid. Venues later. Festivals/agencies premium.**

Likely rollout (do not lock until value is proven):

- Private beta: free  
- Early adopters: ~A$29–39/mo  
- Established promoter: ~A$49–59/mo  
- Pro later: ~A$79–100+  
- Festival/agency: custom  

Illustrative at A$50/mo: 20 → A$1k MRR · 100 → A$5k MRR · 500 → A$25k MRR.

Challenge is conversion and retention, not market size. Avoid transactional fees until FTC already creates clear value.

---

## Go-to-market

Isaac’s edge: DJ, producer, promoter experience; scene language; lived fragmented workflow; direct Melbourne relationships.

Story opens doors. **Retention** comes from being easier than IG + WhatsApp + Sheets + email + Notes.

Early acquisition: direct onboarding through Melbourne relationships — not paid ads first.

### Growth loop

1. Promoter creates event → invites DJs → DJs activate → DJs work with other promoters → more promoters encounter FTC  
2. Later: invite photographers/security/crew → profiles → hire across events → fans join because supply exists  

Professional workflow must come first.

### Long-term moat

Features are copyable. Defensible: professional network, event history, completed-work reputation, templates/ops data, calendars, crew connections, habit, **local scene density**.

Moat is not “we have Crew Chat.” It is:

> Everyone you need to run the event is already working through FTC.

---

## Long-term roadmap (strategic layers)

Expansions grow from the workflow. Do not ship as separate products.

| Phase | Focus |
|-------|--------|
| **1** | Workflow indispensable — events, bookings, DMs, crew chat, run sheet, calendars |
| **2** | Workforce — searchable pros beyond DJs (photo, video, security, MC, lighting, door, stage, sound, production) when users repeatedly ask |
| **3** | Ops depth — expand run sheet / role workflows only if asked |
| **4** | Professional network — reputation, verified work history, portfolios, connections |
| **5** | Content — event media, recaps; supports workflow, does not replace it |
| **6** | Fans — follow/discover/save; different home than professionals |
| **7** | Creator economy — subs, tickets, merch, paid communities only when justified |

Detail and older phase lists: `PRODUCT-VISION.md`. If docs disagree on sequencing, **this handover + BRAND-PHILOSOPHY win for priority**; vision doc holds depth.

---

## Permanent product rules

1. **One primary home** for each piece of information  
2. **Workflow before features**  
3. **Mature interaction patterns** first (IG, WhatsApp, iMessage, Discord, Telegram)  
4. **Preserve context** — back restores origin, tabs, filters, conversation  
5. **Realtime must be trustworthy** — no hard-refresh culture  
6. **Avoid over-engineering** — smallest correct solution  
7. **Investigate after repeated failure** — after two failed fixes, diagnose root cause  
8. **No feature creep before beta** — roadmap ideas stay on the roadmap  

---

## Roles (who does what)

| Who | Role |
|-----|------|
| **Isaac** | Founder, product owner, final UX decision-maker, real-device QA, Supabase SQL, release approval, talks to users |
| **Cursor (this agent)** | Product Owner assistant, UX reviewer, technical planning partner, agent coordinator — decide what to build / wait, challenge ideas, assign agents, verify diagnoses, gate QA/release readiness, stop feature creep. *Replaces the former ChatGPT product role.* |
| **Claude / Builder agents** | Inspect repo, diagnose, implement, build/test, commit/push feature branches |
| **QA Reviewer** | Independent break-testing; does not implement fixes |
| **Release Agent** | Integrate approved branches, resolve conflicts, push `main`, prove Production serves the commit — not a “No target” Preview |

Plain terms:

> **Isaac decides what FTC should become. Builders build it. Cursor helps make sure you’re building the right thing, in the right order, and that agents aren’t bullshitting you.**

Worktrees, collision rules, Agent Room: `MULTI-AGENT-WORKFLOW.md`, `FTC_WORKFLOW.md`.

---

## Known traps

- Production lag / testing Preview while Production is stale  
- Realtime tables missing from publication  
- Client state races / stale refreshes  
- Navigation origins dropped; push vs pop history  
- Image aspect / loading; iOS keyboard  
- Shared-file collisions (`CURRENT-STATE.md`, `test-regressions.mts`)  
- Temporary diagnostics reaching Production  
- Root-cause claims without evidence  

A fix is not shipped until: branch pushed → QA → Release integrates → `origin/main` pushed → Production deployment succeeds → canonical app serves new commit → Isaac confirms on device when needed.

---

## Biggest risk

Not building features — **changing habits**.

FTC wins only if it is genuinely easier on a real event night.

Every feature should answer:

> Does this save someone time tonight?

---

## End goal

Start as event workflow. Over years, ecosystem for independent music — promoters, DJs, venues, crew, fans, discovery, content, reputation, monetisation — each layer growing from the operational core so FTC stays cohesive instead of becoming “an app that does everything.”

**Can work. Not guaranteed.** First proof:

> Can ~10 promoters run real recurring events through FTC and keep returning?
