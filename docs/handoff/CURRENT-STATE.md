# Current state (last updated: 2026-07-22)

Update this file after every completed ship (see `HANDOFF-UPDATE.md`).

## Phone / desktop parity (permanent — 2026-07-19)

**Rule:** Every FTC change must work at **~390px (phone)** and **~1280px (desktop)** with the same features, permissions, status logic, navigation outcomes, and loading/empty/error meaning. Responsive layout may differ; behaviour must not. Authoritative spec: **`FTC_WORKFLOW.md` §7**. QA templates updated: `docs/qa/README.md`, `REGRESSION-CHECKLIST.md`, `BUG-TEMPLATE.md`.

**Recent surfaces audited (2026-07-19, commit `6b98447`):** Events Active/History + batched lineup stats; event-detail guard; Gigs loading skeletons; event-detail → DM → Back; workspace tabs; profile identity hierarchy; owner vs public profile actions — all use shared logic/components; no confirmed phone/desktop behavioural mismatch found. Intentional layout differences only (main nav placement, Calendar mobile strip vs desktop grid, workspace sub-nav scroll/wrap).

## Coached private beta (2026-07-16)

**Decision:** **GO** — small, coached private beta (5–10 Planner/DJ pairs).

| Evidence | Result |
|----------|--------|
| Production Supabase security audit | 16/16 passed |
| Authenticated automated production QA | 8/8 passed |
| Physical iPhone Safari smoke | 7/7 passed |
| Open Critical / High defects | 0 / 0 |
| Production build & deploy | Stable |

**Docs:** `docs/qa/PRIVATE-BETA-GO-LIVE.md`, `docs/qa/KNOWN-ISSUES.md`, `docs/qa/BETA-READINESS-CHECKLIST.md`, `docs/qa/TESTER-ONBOARDING.md`

**App version (2026-07-16):** Settings shows **`FTC Private Beta 0.9.0 · Build <short-commit>`** (local dev: `Build Local`). Version from `package.json`; build from Vercel `VERCEL_GIT_COMMIT_SHA` via `lib/ftcAppVersion.ts`. Testers include this line in bug reports.

**App launch splash (2026-07-19):** Authenticated users opening `/` see `FtcAppSplashScreen` while auth resolves — no marketing landing flash before redirect to `/events` or `/dm`.

**Accepted known issues (not fixing in beta):** KN-01 Bookings row profile tap; KN-02 Event→DM→Back; KN-03 Profile tab latency; KN-04 Crew chat return; KN-05 Secondary return paths; KN-06 Event name/venue caps — see `docs/qa/KNOWN-ISSUES.md`.

**Out of scope:** payments, AI generation, Discover expansion, social features, public launch.

**Before first tester invite:** complete operational checklist OP-01–OP-11 in `PRIVATE-BETA-GO-LIVE.md` (tester list, invitations, feedback channel, backup, monitoring, QA data isolation).

**Pause rule:** new Critical/High production defect pauses tester onboarding.

## Core product

- Auth, signup, onboarding, roles (promoter / dj / both)
- Discover, profiles, DM conversations
- Booking requests via DM (pending / accepted / declined / cancelled)
- Rate proposals: open offers, fixed offers, DJ counter-proposals, accept/decline RPCs
- Events: create, edit, cancel, delete, lineup, send bookings, run sheet
- Event Plans (`/booking-plans`), Calendar (`/calendar`), Gigs (`/bookings`)
- Notifications, settings, account deletion
- DJ availability calendar

## Events

- Optional event flyer upload (JPEG/PNG/WebP, 5 MB, bucket `event-covers`)
- **Event cover images (2026-07-14):** Event Details centred natural-aspect flyer hero (~430px max-height); status badge overlaps flyer foot; tighter flyer→title spacing; coloured fallback header unchanged; edit preview + list thumbs unchanged
- Event colour: 8 selectable + Auto (slate neutral when Auto or legacy slate)
- Flat solid artwork tiles (no glow)
- Event list: Active + History tabs; whole card links to detail
- **Create event tab pills (2026-07-21):** while Create event flow is open, Active/History pills show neutral styling; tapping a tab closes create and lands on that list (URL updates synchronously before create closes — no Active/History flash); Cancel restores the tab from URL (`?tab=history` preserved)
- **Events History tab perf (2026-07-21):** Active/History switches use `history.pushState` only (no Next `router.push`) so `EventsPageClient` stays mounted — avoids Suspense/`loading.tsx` remount and duplicate `listOwnedEvents` + lineup-stats fetch on every History click
- **Events list load (2026-07-19):** lineup stat chips load via one batched `booking_requests` query per page fetch (minimal fields), not one query per event
- **History UX (2026-07-14):** History tab matches Active list layout/spacing; locked tab row height + reserved trash slot prevents layout jump on tab switch
- **Event detail (2026-07-19):** single `OnboardingGuard` wrapper; Open DM from event detail returns Back to same event via `from=event-detail&eventId=…`
- **Event detail load (2026-07-21):** parallel `getEventById` + lineup + crew-chat unlock; seed hero/title/meta from Events list cache; lower sections skeleton until lineup resolves; loading shell mirrors hero, summary meta rows, Invite DJs, Run Sheet, and Bookings geometry; route `loading.tsx` + scroll-reset shell gate (no `invisible` blank frame)
- **History event detail (2026-07-14):** past/cancelled events read-only on detail — no Edit, Invite DJs, lifecycle delete/cancel, run sheet edit, booking cancel/hide/proposal actions; Open DM and existing group chat link kept; historical empty copy for run sheet and bookings
- **History bulk select (2026-07-14):** Select all operates on full History list (`filterPlannerHistoryTabEvents`), not cancelled-only subset
- **Design system (2026-07-14):** `docs/design/FTC_DESIGN_SYSTEM.md` + `lib/design/ftcDesignSystem.ts` — shared tokens; standardised status badges, empty states, section titles, button min-heights
- **History hide:** bulk remove from History view sets `history_hidden_at` on owned `events` rows via authenticated RLS update (does not delete records). Optional RPC hardening: `20250720120000_event_history_hide_past.sql` (not yet applied on production as of 2026-07-20 — legacy RPC only hid `cancelled`).
- **Create/edit validation:** inline field errors after Save; start + finish time both required; notes length/line limits disable save
- **Event create/edit time pickers (2026-07-22):** empty start/finish wheels open at current local time via `defaultEventStartWheelTime` / `resolveEventTimePickerOpenValue`; past-time floor only when event date is today; shared `getEventSetTimeValidationErrors` enforces finish-after-start (overnight PM→AM only), zero duration, 24h max, and today start-in-past across Events create/edit, Use Plan booking create, and booking request modal via `BookingSetTimeRangeField` + `eventFormFieldValidation` + `lib/events.ts` server asserts
- **Notes** section on event detail (heading "Notes", muted section label)
- Edit with confirmation when booking-impacting fields change + group chat update message
- **Edit event form polish (2026-07-14):** unified form control height/radius/focus; settings-panel card header; intentional flyer upload panel; aligned colour chips + preview row; subtle notes counter
- Run sheet: single planner view for assigned DJs; table on `lg+`, cards below
- Run sheet rows auto-created when DJ accepts
- Accepted bookings cancellable by planner or DJ with reason + group chat update
- Booking cards in DMs show **live** event fields from `events` when `event_id` set; expanded card uses compact icon metadata rows (venue/date/time/rate), no event initials thumb, expandable notes, tighter spacing
- **DM photo picker (2026-07-14):** media icon opens native OS chooser (Photo Library / Take Photo on iOS); no forced camera via `capture`
- **Mobile bottom nav + keyboard (2026-07-21):** on viewports below `md`, text-field focus latches a keyboard session from `visualViewport` height gap; nav stays hidden while focused (including iOS scroll) until height gap shows dismissal or focus leaves; offset padding clears with the bar

## Calendar

- **Calendar action CTA (2026-07-22):** mobile/desktop date actions show **Event Plans** (not “Saved Event Plans”) on the second pill; workspace tab and Event Plans page copy unchanged
- **Planner Event Calendar cards (2026-07-22):** mobile agenda cards use `usePlannerCalendarItemNavigation` (touch `pointerup` + `location.assign`) to open Event Details with `from=calendar` return params — never DM; calendar origin is forwarded through Event Details → lineup DM → Back → Event Details → Back via `buildEventDetailDmThreadHref` + `resolveDmThreadBackHref` + existing `resolveEventDetailBackHref`
- Desktop: month grid + day modal (wider layout, same behaviour)
- No intro/description copy under the page title (planner event calendar)
- **Status dot priority per date:** Accepted (green) → Pending (amber) → Upcoming (dark blue); Today uses tile outline, not dot colour
- **Cancelled events hidden** from calendar items, dots, and counts (History unchanged)
- Agenda/grid ordering: booking priority then start time (`sortPlannerCalendarAgendaItems`)
- Event cards: `Event Name · Venue Name` on one truncated line; coloured event accent bar
- **Shared mobile chrome:** `CalendarMobileChrome` owns month nav, legend row, and day-strip spacing for Events and Gigs calendars (standalone + dual-mode); both calendars reserve the Select Dates secondary row and use `CALENDAR_MOBILE_CHROME_GIGS_DAY_STRIP_CLASS` (`mt-1`) for identical legend-to-strip rhythm; day-strip chips use content-height `PlannerCalendarMobileDateStrip` markup (no fixed live chip height; `h-[3.75rem]` skeleton-only)
- **Calendar load perf (2026-07-22):** Events Calendar uses session/local item cache + workspace prefetch (`ensurePlannerCalendarItemsPrefetched`) with stale-while-revalidate on mount; no refetch on `date`/`month` URL-only changes; saved-plans hint reads Event Plans list cache when warm. Gigs Calendar uses matching cache/prefetch (`ensureDjGigsCalendarPrefetched`). Dual-role Events ↔ Gigs calendar tabs remount on switch (avoids `display: contents` hit-testing bugs); caches keep repeat opens fast. Workspace header uses `sticky top-0 z-50 isolate bg-ftc-bg` so primary tabs stay the top interactive layer on `/calendar`. Mobile agenda does not call `scrollIntoView` (month changes no longer shift document scroll); date strip centring uses horizontal `scrollLeft` only; dual calendar sub-tab switches preserve `window.scrollY`; active workspace and filter pills are no-ops on tap. Repeat Events ↔ Calendar workspace navigation shows cached grid immediately while background revalidate runs.
- **Gigs Calendar workspace tabs (2026-07-22):** Top workspace pills use shared `PlannerWorkspaceSubNavLink`; touch uses `window.location.assign` (iOS Safari), desktop uses `router.push`. Workspace header is `sticky top-0 z-50 isolate` with page body at `relative z-0` so calendar paint cannot win hit-testing over Events/Event Plans/Gigs/Calendar pills. Gigs month-nav update toast uses grid stacking in `CalendarMonthNav` (no absolute full-row overlay). Leaving Calendar clears stale Use Plan intercept and opens canonical destinations (Gigs → Incoming).
- **Workspace sub-nav layout (2026-07-22):** Shared row uses `flex-nowrap` at all breakpoints (no desktop wrap), `min-h-11` sub-nav slot matching 44px hit targets, stable `ftc-workspace-subnav-pill` border box (active state does not change dimensions), always-reserved Gigs badge slot, no `scrollIntoView` on tab change (prevents horizontal pill jump); title row `min-h-[2.75rem]` on phone and desktop. **`WORKSPACE_SUB_NAV_TABS`** in `lib/plannerEventsNav.ts` is the single immutable source (fixed id, label, href, order); `PlannerEventsSubNav` always maps that array with `key={tab.id}` and never filters items out of the row while role is unknown (SSR/loading), so Event Plans cannot be replaced by Calendar in slot two.
- **Gigs `Select dates` row:** secondary action reserves space from first frame — disabled real button while calendar data loads; dual-mode parent always reserves row via `reserveSecondaryRow` (Events tab leaves row empty); standalone Events calendar reserves same row
- **Calendar mobile polish (2026-07-14):** shared `calendarMobileUi` — selected-day header, dashed empty state with muted calendar icon, agenda fade/slide transition (175ms, `motion-reduce`), `active:scale-[0.98]` press on day chips/cards/arrows; month title `text-base`; nav arrow gap `gap-0`; shared `CalendarMobileAgendaCard` layout for Events and Gigs mobile agenda cards (min height, padding, title/badge/time slots); mobile bottom nav uses `z-50` so fixed nav wins hit testing over overlapping agenda card buttons; agenda transition hook settles immediately on first mount (no fade/`inert` stuck state) and clears `translate-y`/`inert` once date keys match so initial Events Calendar load does not block Messages nav taps; **Events/Gigs calendar tab pills** use touch `pointerup` activation in `PlannerFilterPills` (same iOS Safari pattern as Gigs booked-card nav) so tab switches commit when `click` is dropped during layout/scroll
- **Calendar polish (2026-07-14):** empty-day hint copy; month picker ~12% narrower (`15rem`); date strip always re-centres selected day (removed scroll cache); desktop day modal empty copy aligned
- **Calendar production polish (2026-07-14):** today vs selected hierarchy on strip/desktop; centred strip scroll; compact empty state + agenda cards; tighter legend; month picker grid/button/Confirm CTA polish; 150–175ms transitions
- **Calendar today label (2026-07-15):** fixed-height status row under selected-date heading prevents layout jump when toggling today vs other dates (Events + Gigs mobile)
- **Calendar past-date strip indicators (2026-07-15):** shared `shouldShowCalendarDateStripIndicators` in `PlannerCalendarMobileDateStrip` hides dots and `+N` counts on dates before local today; past dates remain tappable with full agenda/booking content unchanged (Events + Gigs)
- **Gigs booked-card navigation (2026-07-14):** mobile agenda cards navigate on touch `pointerup` via `window.location.assign` (iOS Safari does not commit App Router `router.push`); desktop mouse and keyboard use `router.push`; booked items validate UUID `event_id` before navigation; calendar return query params preserved on event/DM links; calendar-origin DMs return to Gigs Calendar via `buildCalendarOriginReturnHref` (not Messages)
- **Gigs → DM booking deep link (2026-07-14):** `Open conversation` passes `bookingRequestId` query param; DM scrolls target booking card into view; absolute overlay focus ring (2px primary) holds ~2s then fades ~1s via active/fading phases
- **DM → event → Back (2026-07-14):** `View event` from DM booking card passes `from=dm&conversationId&bookingRequestId`; event detail Back returns to `/dm/{conversationId}?bookingRequestId=…&bookingFocus=scroll-only` — scrolls to booking without blue highlight; Gigs/Calendar deep-links omit `bookingFocus` and keep scroll + highlight
- Create-from-calendar: Save event + **Confirm N DJ(s)** invite flow
- Today highlight on date strip; selected + today states on desktop grid cells

## DJ availability calendar

- Mobile (`< md`): horizontal date strip + selected-day panel — status buttons (Available / Maybe / Unavailable / Clear), booking list, today/selected chip styling aligned with planner event calendar strip
- **Mobile availability pills (2026-07-14):** optimistic save with per-date version guard; active pills keep 1px transparent border (no layout shift on select/save); buttons stay interactive during save; subtle opacity on active pill only; rollback + inline error on failure
- Desktop (`md+`): month grid with per-date overflow menu unchanged
- Bulk select + quick select (Fridays / Saturdays / weekends) on all breakpoints; mobile strip toggles selection in bulk mode
- **Legend + strip dots:** compact dot-and-label legend (shared `CalendarDotLegend`) — Gigs: two centred rows (availability, then booking status); Events mobile: reserved empty top row + booking-status row (Today, Upcoming, Pending, Accepted); desktop Events pills unchanged
- **Past dates:** availability controls hidden (mobile panel + desktop cell menu); empty booking message and mobile helper text suppressed; historical availability badges and booking cards remain visible; mobile date-strip dots and overflow counts hidden before local today
- Shared strip component: `PlannerCalendarMobileDateStrip` accepts optional `getDateMarker` for DJ markers (`getDjAvailabilityDateStripMarker`)

## Booking / invite UX

- Default send button label mode: **Confirm N DJ(s)** (`SendBookingRequestsPanel`)
- Unavailable-DJ confirm modal uses Confirm wording
- Calendar-origin and standard create flows aligned on copy and validation
- **Calendar create workspace tab (2026-07-22):** Calendar-originated Create Event / Saved Event Plans on `/events` keep CALENDAR highlighted via `resolveEventsWorkspaceActiveHref` + `resolveActiveWorkspaceHref` calendar override (return/cancel unchanged); header Create event action uses invisible placeholder while calendar create is open so layout default action does not appear
- **Gigs History cards (2026-07-15):** `Fixed ·` / `Open offer` fee copy aligned with Incoming/Confirmed; tighter info-to-actions spacing; shorter View event (primary) + Open DM (subdued) buttons
- **Gigs Confirmed tab (2026-07-19):** received gigs reload after booking acceptance (`ftc-notifications-updated` + tab visibility) so accepted bookings appear in Confirmed without stale client state; gig date keys use shared `resolveEventDateKey` (legacy + ISO); `?tab=confirmed` URL alias maps to Confirmed
- **Gigs tab row (2026-07-19):** shared `DjGigsTabs` + `DjGigsTabRow` use compact content-width pills in a `shrink-0 gap-2` cluster (no `flex-1` stretch), reserved count slots, and a reserved History manage slot (`h-9 w-9`) so tabs, counts and bin match the reference layout at 390px
- **Gigs list loading (2026-07-19):** Incoming/Confirmed/History show `ReceivedBookingsListSkeleton` while the initial gigs fetch runs (toolbar stays visible; no blank list gap); tab switches with cached data skip the skeleton
- **Gigs tab counts (2026-07-19):** Incoming/Confirmed counts derive from the received-bookings + hidden-id snapshot as soon as those requests complete; sender profile fetch no longer blocks counts; reserved count slots stay stable before numbers appear (no fake zero)
- **Workspace sub-nav (2026-07-19):** shared `(planner-workspace)` layout keeps Events / Event Plans / Calendar / Gigs tabs mounted across route transitions; loading shells render content only below the persistent tab row; mobile tabs use horizontal scroll + `router.push` (no full reload)
- **Profile (2026-07-19):** removed redundant Calendar/Gigs navigation card from DJ profile — availability and bookings stay in Gigs nav only
- **Profile header/nav (2026-07-19):** removed back button from own-profile header (top-level nav destination); mobile bottom nav Profile tab uses same touch `pointerup` routing as other tabs and resolves user id synchronously from session/cache
- **Event Plans delete mode (2026-07-19):** trash and delete-selection toolbars share one fixed-height secondary row (`EVENT_PLANS_TOOLBAR_ROW_CLASS`) so plan cards no longer shift when entering or leaving selection mode; title-row Create button slot stays reserved on mobile; toolbar layers swap in place via absolute positioning with `embedded` selection controls (no flex-wrap growth)
- **History bulk selection (2026-07-19):** Events History and Gigs History delete-selection use full-card tap plus cyan ring only — no presentational checkboxes; cards expose `aria-pressed` and `aria-selected` for screen readers; cancel exits atomically with stable card shells (border stays on the list item, not a swapping inner button) to prevent white border flash
- **Event Plans selection cards (2026-07-19):** delete-selection uses full-card tap plus cyan ring only — no checkbox; layout-only action reserve (`EVENT_PLAN_ACTION_RESERVE_CLASS`) keeps text aligned when Use plan is hidden

## Event Plans

- **Event Plans load perf (2026-07-21):** session/local list cache + workspace prefetch (`ensureBookingPlansListPrefetched` from Events sub-nav) — stale-while-revalidate on mount; create/edit/delete update cache; avoids skeleton + duplicate wait on repeat Events ↔ Event Plans navigation
- **Mobile cards (2026-07-14):** compact layout below `sm` — title + vertically centred Use plan on one row; inline `Event` / `Venue` labels with `text-ftc-text-secondary` values and `text-ftc-text-muted` separator on one truncated line; NOTES label only when notes exist; tighter card padding and list spacing; desktop grid unchanged
- **Event Plans polish (2026-07-14):** removed redundant “Saved Event Plans” heading; stronger title/meta hierarchy; 2-line notes preview; weighted Use plan outline button; History-matched bulk delete rows (`FTC_SURFACE_ROW_CLASS`, checkbox, toolbar)
- **Use Plan flow polish (2026-07-14):** Event details step shows `Plan` label + plan name; Use Plan entry uses top-right Cancel (returns to Event Plans); header uses `ftc-form-card-header` spacing to match Create Event
- **Use Plan workspace tabs (2026-07-22):** while planner booking create is open on `/bookings` (Event Plans → Use Plan), workspace sub-nav intercept closes create via `resetCreateFlowState` then navigates (Gigs uses `router.replace("/bookings")` to clear plan deep link)

## Group chat

- Per-event crew chat for owner + accepted DJs
- Messages inbox Group tab with artwork tile, deduped by event_id
- Event edit posts one update message to group chat (booking-impacting fields)
- Planner does not get unread from own group messages
- Group chat page: header only (duplicate context card removed)
- **Crew chat UI polish (2026-07-15):** header shows event artwork + name + `Crew chat • N members` with inline participant avatars; compact centred system-message pills with friendlier display copy; sender names above first message in a sequence (DM-style); understated empty state; View event button matches DM booking cards (calendar icon + shared secondary button class); presentation-only — no messaging/realtime/DB changes
- **Messaging UI polish (2026-07-15):** crew chat header — text-only centre (event name + `Crew chat • N members`), avatars on dedicated row below subtitle (no clip); lighter compact View event button; tighter content-hugging system pills; updated empty-state copy; mobile Messages nav badge anchored to icon top-right

## Copy / UX polish (2026-07)

- "Create event" sentence case (not "Create Event")
- No trailing periods on several confirmation dialogs and empty states
- Desktop planner UX brought into parity with mobile (wording, validation, calendar cards, today/selected styling) without copying mobile layout

## Beta readiness (historical — resolved at GO 2026-07-16)

- **`docs/qa/`** — QA workspace including go-live record and known issues
- **Blocker-fix batch (2026-07-15):** bookings hooks, crew-chat auth, event ID safety, logging, AI disabled — all verified at GO
- **Security remediation (2026-07-15):** legacy `allow public insert messages` removed; audit 16/16 at GO

### Beta blocker fixes — detail (all Passed at GO)

| # | Issue | Root cause | Files |
|---|-------|------------|-------|
| 1 | `/bookings` hooks crash | `useMemo` after early `return null` when access denied | `app/bookings/page.tsx` |
| 2 | Crew-chat auto-start auth | RPC lacked participant check | `supabase/migrations/20250715180000_harden_crew_chat_auto_start_auth.sql`, `scripts/setupEventCrewChatUnlock.sql`, `scripts/supabaseSecurityAuditChecklist.sql` |
| 3 | `/events/create` + invalid IDs | Dynamic route treated `create` as UUID | `app/events/create/page.tsx`, `app/events/[eventId]/page.tsx`, `lib/events.ts` |
| 4 | Message metadata logging | Debug `console.log` in realtime handlers | `app/dm/page.tsx`, `app/dm/[conversationId]/page.tsx`, `lib/chatNewMessageHighlight.ts`, `lib/notifications.ts` |
| 5 | AI disabled for beta | Private beta scope | `lib/featureFlags.ts`, `app/api/generate-event/route.ts`, `app/page.tsx` |
| 6 | Legacy public message INSERT | Production-only policy `allow public insert messages` not in repo; `TO public` + `WITH CHECK (true)` allowed any role to insert rows that bypassed participant/crew checks | `supabase/migrations/20250715213000_remove_legacy_public_message_insert.sql`, `scripts/setupProductionRls.sql`, `scripts/supabaseSecurityAuditChecklist.sql` |

**Production gates at GO:** Security audit 16/16; migrations applied; production QA and iPhone smoke passed.

**Operational items still requiring Isaac confirmation before first invite:** tester list, controlled signup, feedback channel, support contact, Supabase backup, rollback procedure, monitoring, `QA-BETA-*` data cleanup/isolation.

**Re-enable AI after beta review:** set `NEXT_PUBLIC_FTC_AI_EVENT_GENERATION_ENABLED=true` and `FTC_AI_EVENT_GENERATION_ENABLED=true` in Vercel env; redeploy.

## Desktop workspace & performance (2026-07-12)

- **Shared planner shell:** `PlannerWorkspacePage` in `app/components/planner/PlannerWorkspaceLayout.tsx` — Events, Event Plans, Calendar, Gigs share title row (heading derived from active workspace href via `resolvePlannerWorkspaceTitle`), primary tabs, divider, secondary controls baseline on desktop (`md:max-w-5xl`)
- **Workspace sub-nav responsiveness (2026-07-14):** `PlannerEventsSubNav` prefetches all four workspace routes; compact `ftc-filter-pill` visuals restored with 44px hit area on outer link wrapper; touch tab switches use `window.location.assign` (iOS Safari); `/events/loading.tsx` and `/bookings/loading.tsx` show fixed workspace chrome instantly while dynamic RSC loads
- **Workspace Gigs tab (2026-07-22):** top Gigs sub-nav uses `buildGigsWorkspaceIncomingHref()` (`/bookings`, no query); `resolveGigsListTabForBookingsPage` only reads `?tab=` when the browser pathname is already `/bookings` (avoids Events `?tab=history` during the App Router transition when Next pathname is `/bookings` but `window.location` is still `/events`)
- **Desktop consistency tokens:** shared primary surface (`PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS`), list spacing (`PLANNER_WORKSPACE_LIST_CLASS`), title-row baseline alignment; Calendar reference shell — no duplicate in-card titles on desktop; loading skeletons match loaded layout
- **Events list cards (2026-07-14):** smaller list artwork (~14%), bolder title, compact status badge + booking stat chips, full-card tap target with chevron as visual cue only
- **Events list card polish (2026-07-20):** two-column Gigs pattern — artwork left, left-aligned body stack (GigCardHeader + GigCardMetaRows rhythm), status + chevron top-right, compact stat chips below time
- **Events Active/History tab row (2026-07-22):** Shared `EventsListTabControls` renders the same `EventsListTabRow` + pill links for `EventsPageLoadingShell` and `EventsPageClient`; `resolveEventsListTabRowChrome` keeps trash/placeholder parity through load; `eventsListTabPillClass` / `ftc-events-list-tab-pill` lock pill outer box; row height is uniform `2.375rem`; Create event uses the same disabled `<button>` markup in loading as on the loaded page (replacing loading-only `<Link>`).
- **Event detail page (2026-07-14):** shorter hero (~25%), icon-led event summary block, compact lineup booking cards aligned with DM cards, Invite DJs action label, cancel event moved below bookings, flat action cards, dashed run sheet empty state
- **Invite DJs sheet (2026-07-14):** full-card tap selection with avatar checkmark, icon search field, compact DJ row hierarchy, dynamic confirm button label
- **Event detail visual consistency (2026-07-14):** shared `eventDetailUi` tokens — unified section titles (`text-base font-bold`), card padding (`p-3.5 sm:p-4`), button heights (`min-h-10`), compact status badges (9px), feedback banners, Run Sheet / Bookings / Notes / Your booking headings aligned; Invite DJs modal matches same language
- **Calendar day selection:** desktop grid highlight tied to open day panel (`actionDate`); closing the panel clears the outline instantly (no transition fade) and blurs focus; Today styling unchanged
- **Page load speed:** optimistic auth in `OnboardingGuard` (cached session renders immediately); profile + nav role persisted to localStorage (userId-scoped) and seeded at module load; profile fetch starts immediately when session exists; auth guard runs profile fetch in parallel with session check; events list + group inbox caches survive hard refresh via localStorage; profile cache + deduped fetches in `lib/user/currentUser.ts`; nav skips redundant profile load when guard profile exists
- Desktop nav width aligned to page shell (`md:max-w-5xl`); `scrollbar-gutter: stable` on `<html>`
- **Navigation badges:** shared `NavBadgeProvider` with session/memory/localStorage cache — Gigs uses `ftc-gigs-pending-count` + runtime store; Messages uses matching `ftc-messages-unread-count` + runtime store (same sync-first pattern as Gigs sub-nav); both seeded at module load; main nav Messages badge reads cache via `getCachedNavMessagesCount` + `useSyncExternalStore`
- **Messages & Profile desktop:** Messages inbox uses `APP_DM_CONTENT_WIDTH_CLASS`; **Profile** uses matching `AppProfilePageShell` with single-column mobile flow (identity → social → cards), centred at `lg:max-w-[52rem]`
- **Profile photo viewer (2026-07-15):** tap avatar opens fullscreen photo with 220ms fade/scale; backdrop tap or X button closes; drag on image does not dismiss; Escape key supported
- **DM conversation desktop:** chat column `52rem` (~832px) at `lg+`, centered; mobile/tablet unchanged at `max-w-2xl`

## SQL / migrations Isaac may still need to run

See `SUPABASE.md` and `supabase/README.md`. Apply `supabase/migrations/` before deploying features that depend on them.

| Feature | Script / migration |
|---------|-------------------|
| Event history hide | `supabase/migrations/20250710120000_event_history_hide.sql` |
| Gig history hide (per-user) | `supabase/migrations/20250710130000_booking_request_history_hides.sql` |
| Planner Archived tab | `scripts/setupBookingRequestArchiving.sql` (sender `archived_at`) |
| Rate proposals | `scripts/setupBookingRateProposal.sql` |
| Booking cancellation | `scripts/setupBookingCancellation.sql` |
| Crew-chat auto-start auth | `supabase/migrations/20250715180000_harden_crew_chat_auto_start_auth.sql` |
| Remove legacy public message INSERT | `supabase/migrations/20250715213000_remove_legacy_public_message_insert.sql` |

## Recent commits (reference)

- `ed846e5` — fix persistent workspace tab label glitch
- `411f680` — fix workspace tab label swap during navigation
- `8fb0e89` — stabilise workspace navigation layout
- `71bfd47` — Fix Gigs Calendar intercepting workspace navigation
- `6c601e6` — fix workspace navigation from gigs calendar
- `75100cb` — Standardise event time validation with overnight support
- `f292825` — fix gigs default tab on workspace navigation
- `4f1a520` — open gigs on incoming from workspace navigation
- `0e7fd16` — fix workspace navigation during use plan flow
- `65d5589` — fix events tabs during create flow
- `d5c6e3f` — fix time defaults in scratch and event plan flows
- `9402a39` — apply event time defaults across create flows
- `525bc86` — improve event time picker defaults (today → current time; preserve selection on reopen)
- `a9f5fff` — fix calendar nested return and dm punctuation
- `3c43c73` — fix planner calendar event navigation
- `3462084` — open event details from planner calendar
- `0837921` — shorten calendar event plans button label
- `aeb9c24` — prevent current month calendar scroll shift
- `68df4d5` — stabilize calendar scroll position during tab switching
- `bc48393` — fix calendar workspace tab navigation (remove dual-tab `display:contents`; header z-index)
- `6a33797` — restore calendar layouts after performance optimisation (dual-tab `contents` wrappers preserve flex order)
- `3d4eab2` — improve events and gigs calendar performance (item/availability caches, prefetch, dual-tab keep-mounted, stop URL-only refetch)
- `9a685ce` — fix events history bulk removal failure (RLS update vs stale RPC)
- `2091463` — fix history delete database failure (past History hide + aligned hideable IDs)
- `28f079b` — document permanent phone/desktop parity rule (`FTC_WORKFLOW.md` §7)
- `7d36d55` — fix workspace tab row glitch during route transitions
- `76475cd` — batch Events lineup stats, event detail guard, Gigs skeleton, event-detail DM back navigation
- `414dbf5` — match Gigs filter row spacing to reference layout
- `c255bf5` — remove trailing period from Settings support copy
- `66cd287` — polish Settings password reset cooldown and sign out placement
- `850ab12` — polish fullscreen profile photo viewer (animation, dismissal, close button)
- `2403231` — final crew chat UI polish (header, avatars, empty state, system pills)
- `51f81d3` — tighten crew chat header layout and anchor mobile Messages badge to icon
- `ff324b0` — polish crew chat UI to match DM messaging quality
- `8227cf7` — fix booking card notes not expanding when Show more is tapped
- `90cdd58` — fix booking card timestamps being clipped in DM messages
- `897ea69` — unify DM booking card layout across all booking states
- restore compact workflow-first event cards (64px square `EventThumbnail`; hero/edit preview unchanged)
- `bb1d436` — unify premium event image system (16:9 hero, shared crop primitives)
- `46fa81b` — polish Invite DJs sheet selection, hierarchy, and confirm button
- `7625227` — fix invisible booking deep-link focus ring (absolute overlay, active/fading phases)
- `c9c9373` — polish booking deep-link focus ring (full card, 2s hold + 1s fade)
- `0018fe3` — deep-link Gigs Open conversation to matching DM booking card via bookingRequestId
- `829fb1d` — fix Gigs mobile availability pill layout shift; optimistic save with version guard
- `c1a0437` — restore compact workspace tabs; fix iOS touch nav with location.assign
- `d1f9dc0` — immediate workspace sub-nav feedback + route loading shells for Events/Gigs
- `05602b5` — fix intermittent iOS calendar tab taps via PlannerFilterPills pointerup
- `d90e49a` — fix Events Calendar initial mount blocking Messages nav (agenda transition settle)
- `2adcf2c` — raise mobile nav z-index; disable agenda transition descendant pointer events while fading
- `b29dd5a` — remove temporary Gigs calendar booking navigation diagnostics
- `975d743` — Gigs calendar booking cards navigate on pointerup for iPhone touch
- `e220ba2` — temporary Gigs calendar booked-card tap diagnostics (removed)
- `3bbf662` — fix Gigs calendar booked items opening blank event detail on mobile
- `9376d41` — fix Gigs mobile availability control flash on day change
- `64cd48d` — harden Gigs calendar booking cards against iOS Safari link preview
- `62e3578` — fix iOS Safari link preview on Gigs mobile booking cards
- `12bf20a` — calendar mobile polish pass (shared motion, hierarchy, compact cards)
- `a650ff2` — tighten Gigs Calendar legend-to-strip gap to mt-1
- `8ea03ac` — tighten Gigs Calendar mobile legend-to-day-strip spacing
- `c88189f` — fix Gigs Calendar Select dates layout shift on first load
- `f0c962d` — extract shared CalendarMobileChrome for Events and Gigs calendars
- `c32839c` — compact mobile Event Plan cards
- `744360c` — hide DJ availability controls on past dates
- `e8c6dc8` — align DJ calendar legend and strip dots with event calendar style
- `c2f7665` — DJ availability mobile date strip + selected-day controls
- `86eb697` — update handoff docs and agent workflow rules
- `93de0c2` — match planner heading to active workspace
- `0444eac` — speed up authenticated app cold start
- `9d1a5c7` — fix messages badge sync hydration like gigs tab
- `fbd1bbb` — fix messages badge first load timing
- `913efc4` — fix gigs badge hydration timing
- `78a2b5b` — remove calendar intro copy
- `d961180` — polish desktop planner workspace consistency
- `1943163` — speed up page loads (optimistic auth + profile caching)
- `daf08a2` — fix desktop workspace alignment drift
- `8e324f7` — desktop/mobile planner UX parity
