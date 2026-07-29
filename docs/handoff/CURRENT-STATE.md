# Current state (last updated: 2026-07-29)

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

**Beta readiness QA reset (2026-07-28):** reusable CLI `npm run qa:reset` + hardened `scripts/resetQaEnvironment.sql` removes **QA account data only** (non-QA users untouched). Runbook: `docs/qa/FTC-BETA-ENVIRONMENT-RESET.md`. Review commit hardens message_reads scope and verification queries.

**Pause rule:** new Critical/High production defect pauses tester onboarding.

## Core product

- Auth, signup, onboarding, roles (promoter / dj / both)
- Discover, profiles, DM conversations
- Booking requests via DM (pending / accepted / declined / cancelled)
- Rate proposals: open offers, fixed offers, DJ counter-proposals, accept/decline RPCs
- **Propose rate modal copy (2026-07-26):** notes field label `Notes (optional)`; placeholder `Notes`; description sentence without trailing full stop; notes textarea modal standard (~3 visible lines, internal scroll) with **3 explicit newline rows max** + 250 chars via `applyCappedMultilineInputLimit`; primary action **Send** (loading **Sending** + spinner); rate validation under Proposed rate field via `PlannerFieldError`
- **Propose rate helper (2026-07-27):** onboarding description shows for first 3 modal opens per user (localStorage), then header compacts automatically — no manual dismiss
- **Booking rate proposal actions (2026-07-28):** planner review panel — equal-width side-by-side row **Accept** + **Decline** (ask-for-rate) or **Keep offer** (fixed-rate); proposal card holds rate/notes/decision only; full-width **Cancel request** sits below **View event** at booking level (not paired with proposal actions); collapsed DM urgent label **Proposed** (amount shown separately); Event Details lineup badge **Proposed**
- **DM booking pending event actions (2026-07-26):** pending open-offer cards with linked event use paired row — `View event` (left, outlined) + `Cancel` (right, destructive); `min-h-8` / `gap-2` matches proposal + lineup paired buttons; standalone cancel when no event link unchanged
- **DM booking proposed-rate copy (2026-07-26):** planner review panel shows proposed amount only (no duplicate `Rate proposed` label); proposal notes reuse shared `BookingCardExpandableNotes`; amounts formatted with `formatIntegerRateDisplay` (en-AU grouping)
- **DM booking proposal card polish (2026-07-27):** when a pending proposal exists, expanded cards hide duplicate `Booking type` row; proposal card uses sentence-case **Proposed rate** label + amount; declining an ask-for-rate proposal clears the proposal, posts **Rate declined** system message, and returns DJ to propose-again state; collapsed planner review uses label + amount; shared `BookingProposalCardShell` / `BookingProposalCardAmount` exports in `BookingRateProposalPanel.tsx`
- **Ask for rate DM terminology (2026-07-26):** planner DM booking cards (collapsed + expanded + history rows) always show `Ask for rate` for open-offer bookings via `getDmBookingCardOfferSummary`; `Open offer` removed from planner DM summaries; DJ Gigs list copy unchanged
- **DM booking expand scroll (2026-07-28):** asymmetric policy — **expand** runs no bottom-pinned transition scroll; after open, one conditional header align when the card top would be clipped; **collapse** restores captured mode (bottom-pinned → `maxScrollTop`, anchor-preservation → viewport anchor during animation); `captureBookingCardExpandScrollContext` records near-bottom state for collapse only
- **DM booking card booking type (2026-07-27):** expanded cards show status badge only in header; booking type appears once in details as labelled metadata (`Booking type` + secondary body text) after venue/date/time — no duplicate header pill
- **DM booking system messages (2026-07-28):** timeline notices suppressed in UI when a visible booking card already reflects the same live state (`shouldSuppressDmBookingTimelineNotice` in `dmChatTimestampVisibility`); historical negotiation steps (e.g. prior proposed rates) still show; timeline copy uses smaller muted typography so booking cards draw attention first; consecutive timeline events use subtle extra padding (`pb-1`); timeline events share one conversation timestamp cluster with chat/booking cards via `buildDmConversationTimestampLayout` (5 min gap rule); booking card notes expand/collapse with measured-height animation (`duration-200`, `prefers-reduced-motion` respected), default to truncated `line-clamp-3` until Show more, and after expand use dedicated bottom-reveal scroll (`scheduleBookingCardNotesRevealScroll`) so Show less and action buttons stay above the DM scroller; notes reset collapsed when booking card hides details; booking card remains source of truth for current state
- **DM history booking expand (2026-07-27):** cancelled/accepted/declined cards stay on `BookingRequestCard` when collapsed so View details uses the same grid expand animation as pending cards
- Events: create, edit, cancel, delete, lineup, send bookings, run sheet
- Event Plans (`/booking-plans`), Calendar (`/calendar`), Gigs (`/bookings`)
- **Event Plans create deep link (2026-07-27):** empty-state **Create event plan** CTA from Events/Bookings create flows opens `/booking-plans?create=plan` form immediately; cancel returns to originating pick-plan step via `returnTo`; successful create returns to Create Event/Bookings pick-plan with new plan preselected via `planId` + list cache refresh
- Notifications, settings, account deletion
- DJ availability calendar

## Events

- **Events empty state (2026-07-26):** planner Active tab shows `No events`; Event Plans: `No saved event plans`. Gigs tab empty copy: Incoming `No incoming gigs`, Confirmed `No confirmed gigs`, History `No gig history`. Events History: `No event history`.
- Optional event flyer upload (JPEG/PNG/WebP, 5 MB, bucket `event-covers`)
- **Event cover images (2026-07-14):** Event Details centred natural-aspect flyer hero (~430px max-height); status badge overlaps flyer foot; tighter flyer→title spacing; coloured fallback header unchanged; edit preview + list thumbs unchanged
- **Event edit flyer remove (2026-07-26):** Remove on Event Details edit form clears preview immediately (non-destructive until Save), re-enables event colour; Cancel restores original image; Save clears `cover_image_url` and storage via existing `updateEventWithCover` flow
- Event colour: 8 selectable + Auto (slate neutral when Auto or legacy slate)
- Flat solid artwork tiles (no glow)
- Event list: Active + History tabs; whole card links to detail
- **Create event tab pills (2026-07-21):** while Create event flow is open, Active/History pills show neutral styling; tapping a tab closes create and lands on that list (URL updates synchronously before create closes — no Active/History flash); Cancel restores the tab from URL (`?tab=history` preserved)
- **Events History tab perf (2026-07-21):** Active/History switches use `history.pushState` only (no Next `router.push`) so `EventsPageClient` stays mounted — avoids Suspense/`loading.tsx` remount and duplicate `listOwnedEvents` + lineup-stats fetch on every History click
- **Events History return tab (2026-07-26):** returning from event detail to Events History uses `?tab=history` in the URL; Active/History switches within Events use `history.pushState` only (Events page stays mounted). Entering `/events` from another workspace ignores legacy session tab cache and defaults to Active.
- **Events list load (2026-07-19):** lineup stat chips load via one batched `booking_requests` query per page fetch (minimal fields), not one query per event
- **History UX (2026-07-14):** History tab matches Active list layout/spacing; locked tab row height + reserved trash slot prevents layout jump on tab switch
- **Event detail (2026-07-19):** single `OnboardingGuard` wrapper; Open DM from event detail returns Back to same event via `from=event-detail&eventId=…`
- **Event detail load (2026-07-21):** parallel `getEventById` + lineup + crew-chat unlock; seed hero/title/meta from Events list cache; lower sections skeleton until lineup resolves; loading shell mirrors hero, summary meta rows, Invite DJs, Run Sheet, and Bookings geometry; route `loading.tsx` + scroll-reset shell gate (no `invisible` blank frame)
- **Event detail mobile nav clearance (2026-07-28):** scrollable Event Details body uses shared `EVENT_DETAIL_PAGE_CONTENT_CLASS` with `ftc-mobile-nav-offset` on the content wrapper (not only the page shell) so Bookings lineup cards and proposal actions scroll fully above the fixed mobile nav + safe area; DJ sticky bottom bar keeps `pb-28` override
- **History event detail (2026-07-14):** past/cancelled events read-only on detail — no Edit, Invite DJs, lifecycle delete/cancel, run sheet edit, booking cancel/hide/proposal actions; Open DM and existing group chat link kept; historical empty copy for run sheet and bookings
- **History bulk select (2026-07-14):** Select all operates on full History list (`filterPlannerHistoryTabEvents`), not cancelled-only subset
- **Design system (2026-07-14):** `docs/design/FTC_DESIGN_SYSTEM.md` + `lib/design/ftcDesignSystem.ts` — shared tokens; standardised status badges, empty states, section titles, button min-heights
- **History hide:** bulk remove from History view sets `history_hidden_at` on owned `events` rows via authenticated RLS update (does not delete records). Optional RPC hardening: `20250720120000_event_history_hide_past.sql` (not yet applied on production as of 2026-07-20 — legacy RPC only hid `cancelled`). Hidden events are excluded from Events Calendar (`isPlannerEventVisibleOnCalendar`) and removed from planner calendar item cache immediately via `syncPlannerEventsHiddenFromHistoryClientCaches` on History delete success
- **Create/edit validation:** inline field errors after Save / Continue; date and time triggers share red invalid border via `aria-invalid` on `.ftc-field-trigger`; finish time shows "Finish time must be later than the start time." under Finish Time; errors clear live when fixed; start + finish time both required; notes length/line limits disable save
- **Event create/edit time pickers (2026-07-22):** empty start/finish wheels open at current local time via `defaultEventStartWheelTime` / `resolveEventTimePickerOpenValue`; past-time floor only when event date is today; shared `getEventSetTimeValidationErrors` enforces finish-after-start (overnight PM→AM only), zero duration, 24h max, and today start-in-past across Events create/edit, Use Plan booking create, and booking request modal via `BookingSetTimeRangeField` + `eventFormFieldValidation` + `lib/events.ts` server asserts
- **Booking date/time field placeholders (2026-07-25):** shared `isBookingFieldTriggerPlaceholder` / `hasBookingFieldTriggerLabelValue` + `.ftc-field-trigger-label.is-placeholder` CSS so empty Event Date, Start Time, and Finish Time labels share one placeholder detection path (`FtcDatePicker`, `BookingDateTimeFields`, run sheet compact time); selected values unchanged
- **Event detail booking cancel feedback (2026-07-25):** successful pending booking-request cancellation shows `Booking request cancelled` via global `PlannerTitleFeedbackProvider` + `useInlineTabFeedbackDismiss` — same typography, timing (2700ms visible + 300ms fade), and fixed overlay as Events/Gigs History removal; heavy in-content card removed for this case only
- **Event detail active lineup (2026-07-26):** planner-cancelled booking requests disappear from the active Event Details Bookings list immediately after cancel (All filter uses active lineup, not visible lineup); record preserved in DB; Gigs History still shows cancelled sent bookings with existing status labels; History event detail still shows cancelled bookings for archival read-only view
- **Event detail lineup cards (2026-07-26):** DJ avatar + name open profile with `from=event-detail` return context (Back restores exact Event Details URL incl. calendar/history params via `Link replace scroll={false}`); profile CTA shows `Message` (not Message / Book DJ) when opened from Event Details; loading label `Opening` without ellipsis; Message opens DM with forwarded event-detail context (`buildProfileDmThreadHref`) so DM → Back restores the same profile CTA and Back chain to the originating event (no generic profile fallback); lineup card actions use compact equal-width row — `Message` (left, outlined) + `Cancel` (right, destructive); `min-h-8` / tight padding with `mt-1.5` action row (mobile-safe touch target)
- **Send bookings modal scroll lock (2026-07-26):** Event Details + Events create Send bookings modal locks background scroll on mobile Safari (`position: fixed` body lock + restore scroll position on close); backdrop/outside touch does not dismiss or scroll the page; modal DJ list remains scrollable; Cancel and successful send still close the modal
- **Send bookings iOS scroll containment (2026-07-26):** boundary-aware touchmove containment blocks rubber-band transfer at DJ list/dialog scroll edges; locks `html` + `body`; nested scroll areas use `overscroll-contain` + `touch-pan-y`
- **Send bookings DJ cards (2026-07-26):** hide Unknown availability pill in invite list; genre line single-row truncate with full text in `title`; Already Invited and other availability pills unchanged
- **Event detail booking send feedback (2026-07-25):** successful Invite DJs send uses the same global title feedback host (`buildBookingSendResultMessage` copy: `Sent booking request to 1 DJ` / `Sent booking requests to {n} DJs`; post-create invite stash on first load too); heavy in-content card removed for send success
- **Notes** section on event detail (heading "Notes", muted section label); read-only notes use `ftc-event-detail-notes-text` — full text with `pre-wrap` line breaks, safe wrap for long URLs/unbroken strings, no horizontal overflow
- Edit with confirmation when booking-impacting fields change + group chat update message
- **Edit event form polish (2026-07-14):** unified form control height/radius/focus; settings-panel card header; intentional flyer upload panel; aligned colour chips + preview row; subtle notes counter
- Run sheet: single planner view for assigned DJs; table on `lg+`, cards below
- Run sheet rows auto-created when DJ accepts
- Accepted bookings cancellable by planner or DJ with reason + group chat update
- Booking cards in DMs show **live** event fields from `events` when `event_id` set; expanded card uses compact icon metadata rows (venue/date/time/rate), no event initials thumb, expandable notes, tighter spacing
- **DM photo picker (2026-07-14):** media icon opens native OS chooser (Photo Library / Take Photo on iOS); no forced camera via `capture`
- **DM message reactions (2026-07-25):** persistent `React` label removed; press-and-hold (~500ms) or right-click opens existing picker on text/image messages; desktop hover/focus-visible `+` affordance; keyboard-accessible `React to message` button; booking/system cards unchanged; DM image attachments use button open surface (not `<a>`) with scoped `-webkit-touch-callout: none` so iPhone Safari long-press opens FTC picker instead of native link preview; reaction picker no longer uses a full-screen blocking backdrop — outside tap or scroll dismisses it without trapping chat scroll
- **Chat reaction gestures (2026-07-29):** double-tap message bubble toggles ❤️ (Instagram-style, touch-only); long-press still opens full emoji tray; picker portaled to `document.body` with measured flip/clamp inside visual viewport + safe-area + composer/header bounds; same gestures on event group chat text messages; group chat reactions reuse `toggleDmMessageReaction` + optimistic/realtime sync — **SQL:** run `scripts/setupEventCrewChatReactions.sql` on Supabase for crew-chat RLS
- **Mobile bottom nav + keyboard (2026-07-21):** on viewports below `md`, text-field focus latches a keyboard session from `visualViewport` height gap; nav stays hidden while focused (including iOS scroll) until height gap shows dismissal or focus leaves; offset padding clears with the bar
- **DM header (2026-07-29):** private beta removes three-dot overflow menu and profile action sheet from conversation header; profile via avatar link unchanged; per-message report modal and block status/banner logic retained in codebase
- **DM composer focus (2026-07-28):** after send, input stays focused and keyboard remains open when it was already open at send time; `shouldKeepComposerFocusedAfterSend` gates restore; no post-send blur; send button uses pointerdown focus retention; mobile focus ring follows `data-mobile-keyboard-open`
- **DM keyboard dismiss (2026-07-28):** scroll interception while composer focused; manual scrollTop + rAF momentum coast after flick; blur only after downward pull at newest-message edge — see `composerKeyboardDismissPolicy.ts` + `composerMessageListMomentumScroll.ts`
- **DM return composer layout (2026-07-28):** Event Details Back adds `bookingRequestId` + `bookingFocus=scroll-only`; booking-target scroll now uses container `scrollTop` math (same pattern as booking-card expand scroll) instead of `scrollIntoView`, which on iPhone Safari shifted the document/visual viewport and mispositioned the fixed chat shell above the bottom nav; `traceDmChatLayout()` logs mount/ready/booking-scroll geometry in dev for path comparison; document scroll lock + `h-[100dvh]` shell unchanged

## Calendar

- **Calendar action CTA (2026-07-22):** mobile/desktop date actions show **Event Plans** (not “Saved Event Plans”) on the second pill; workspace tab and Event Plans page copy unchanged
- **Calendar action row layout (2026-07-26):** Events Calendar Create Event / Event Plans use a stable two-column grid; when Event Plans is hidden the right slot stays reserved so Create Event position, width, and styling do not shift
- **Planner Event Calendar cards (2026-07-22):** mobile agenda cards use `usePlannerCalendarItemNavigation` (touch `pointerup` + `location.assign`) to open Event Details with `from=calendar` return params — never DM; calendar origin is forwarded through Event Details → lineup DM → Back → Event Details → Back via `buildEventDetailDmThreadHref` + `resolveDmThreadBackHref` + existing `resolveEventDetailBackHref`
- **Planner pending calendar navigation (2026-07-26):** pending sent-booking cards resolve Event Details hrefs when `event_id` is missing by linking to the sole owned event on that date (after name/date match); planner calendar item cache bumped to v3
- **Planner calendar pending event deletion (2026-07-26):** deleting an event from Event Details cancels calendar-linked orphan sent bookings (pending rows without `event_id`) before `delete_empty_event`, then removes the event and related calendar/events list cache entries so yellow Pending cards disappear immediately
- Desktop: month grid + day modal (wider layout, same behaviour)
- No intro/description copy under the page title (planner event calendar)
- **Status dot priority per date:** Accepted (green) → Pending (amber) → Upcoming (dark blue); Today uses tile outline, not dot colour
- **Cancelled events hidden** from calendar items, dots, and counts (History unchanged)
- Agenda/grid ordering: Today → Pending → Upcoming/Accepted → Past, then chronological within each group (`sortPlannerCalendarAgendaItems`)
- **Events Calendar data scope (2026-07-26):** planner Events Calendar loads owned `events` rows only — no sent/received booking-request cards; pending/accepted booking activity stays on Gigs Calendar; Both-role accounts no longer see duplicate UPCOMING + PENDING cards for the same owned event; planner calendar item cache bumped to v5
- **Events Calendar legend (2026-07-26):** mobile and desktop legends show Today + Upcoming only; Pending and Accepted removed from Events Calendar legend (remain on Gigs Calendar)
- Event cards: title with status pill top-right on mobile agenda; venue on a dedicated secondary line; time below venue; desktop month-grid and date-modal items use the same hierarchy with status top-right; event fallback colour accent strip removed from agenda cards (colour remains on list/detail surfaces)
- **Shared mobile chrome:** `CalendarMobileChrome` owns month nav, legend row, and day-strip spacing for Events and Gigs calendars (standalone + dual-mode); both calendars reserve the Select Dates secondary row and use `CALENDAR_MOBILE_CHROME_GIGS_DAY_STRIP_CLASS` (`mt-1`) for identical legend-to-strip rhythm; day-strip chips use content-height `PlannerCalendarMobileDateStrip` markup (no fixed live chip height; `h-[3.75rem]` skeleton-only)
- **Calendar route loading (2026-07-23):** `/calendar` `loading.tsx` keeps workspace secondary controls (Events/Gigs calendar tabs when role is both) but **does not** render `PlannerCalendarLoadingCard` / `DjCalendarLoadingCard`; persistent layout header + real calendar components (cache-backed internal loading only). Events Calendar uses session/local item cache + workspace prefetch (`ensurePlannerCalendarItemsPrefetched`) with stale-while-revalidate on mount; no refetch on `date`/`month` URL-only changes; saved-plans hint reads Event Plans list cache when warm. Gigs Calendar uses matching cache/prefetch (`ensureDjGigsCalendarPrefetched`). Dual-role Events ↔ Gigs calendar tabs remount on switch (avoids `display: contents` hit-testing bugs); caches keep repeat opens fast. Workspace header uses `sticky top-0 z-50 isolate bg-ftc-bg` so primary tabs stay the top interactive layer on `/calendar`. Mobile agenda does not call `scrollIntoView` (month changes no longer shift document scroll); date strip centring uses horizontal `scrollLeft` only; dual calendar sub-tab switches preserve `window.scrollY`; active workspace and filter pills are no-ops on tap. Repeat Events ↔ Calendar workspace navigation shows cached grid immediately while background revalidate runs.
- **Gigs workspace fresh entry (2026-07-24):** Top workspace Gigs link uses canonical `/bookings` (`buildGigsWorkspaceIncomingHref`). Tab resolver prefers browser URL on `/bookings`; cross-workspace `?tab=` (e.g. Events History) no longer maps to Gigs History. Contextual returns from Event Details/DM (`from=bookings`) still resolve History/Confirmed on first frame. Stale optimistic tab pending is cleared on workspace Gigs navigation and ignored when route is canonical Incoming.
- **Workspace sub-nav layout (2026-07-23):** Shared row `flex-nowrap`, stable `ftc-workspace-subnav-pill` border box, `key={tab.id}` on **`WORKSPACE_SUB_NAV_TABS`**. Gigs workspace pill is label-only when pending count is zero; count badge mounts only when `shouldRenderGigsTabCount` is true; **`workspaceGigsDisplaySession`** in `navigationBadgeCache` preserves last confirmed count through workspace tab transitions (no transient provider-zero flicker).
- **Workspace secondary row rhythm (2026-07-23):** Sub-nav → filter row gap uses header `pt-4` + secondary band `pt-4` only (removed stacked header `pb-4`). All planner pages wrap secondary UI in `PlannerWorkspaceSecondaryControls` (`mb-4` once); Events/Gigs/Event Plans row tokens no longer duplicate `mb-4` or a fixed 38px Events-only row height on mobile.
- **Events History delete-selection row (2026-07-23):** `EventsListTabRow` is `w-full` with filters left, flex-1 middle (feedback/spacer), and a right `shrink-0` action column (bin / outlined delete toolbar expanding left); row height unchanged.
- **Gigs `Select dates` row:** secondary action reserves space from first frame — disabled real button while calendar data loads; dual-mode parent always reserves row via `reserveSecondaryRow` (Events tab leaves row empty); standalone Events calendar reserves same row
- **Calendar mobile polish (2026-07-14):** shared `calendarMobileUi` — selected-day header, dashed empty state with muted calendar icon, agenda fade/slide transition (175ms, `motion-reduce`), `active:scale-[0.98]` press on day chips/cards/arrows; month title `text-base`; nav arrow gap `gap-0`; shared `CalendarMobileAgendaCard` layout for Events and Gigs mobile agenda cards (min height, padding, title/badge/time slots); mobile bottom nav uses `z-50` so fixed nav wins hit testing over overlapping agenda card buttons; agenda transition hook settles immediately on first mount (no fade/`inert` stuck state) and clears `translate-y`/`inert` once date keys match so initial Events Calendar load does not block Messages nav taps; **Events/Gigs calendar tab pills** use touch `pointerup` activation in `PlannerFilterPills` (same iOS Safari pattern as Gigs booked-card nav) so tab switches commit when `click` is dropped during layout/scroll
- **Calendar empty-day copy (2026-07-26):** Events Calendar: `No events scheduled` (mobile agenda + desktop date modal); Gigs Calendar mobile agenda: `Nothing scheduled for this date`
- **Calendar production polish (2026-07-14):** today vs selected hierarchy on strip/desktop; centred strip scroll; compact empty state + agenda cards; tighter legend; month picker grid/button/Confirm CTA polish; 150–175ms transitions
- **Calendar today label (2026-07-15):** fixed-height status row under selected-date heading prevents layout jump when toggling today vs other dates (Events + Gigs mobile)
- **Calendar past-date strip indicators (2026-07-15):** shared `shouldShowCalendarDateStripIndicators` in `PlannerCalendarMobileDateStrip` hides dots and `+N` counts on dates before local today; past dates remain tappable with full agenda/booking content unchanged (Events + Gigs)
- **Gigs booked-card navigation (2026-07-14):** mobile agenda cards navigate on touch `pointerup` via `window.location.assign` (iOS Safari does not commit App Router `router.push`); desktop mouse and keyboard use `router.push`; booked items validate UUID `event_id` before navigation; calendar return query params preserved on event/DM links; calendar-origin DMs return to Gigs Calendar via `buildCalendarOriginReturnHref` (not Messages)
- **Gigs calendar day agenda ordering (2026-07-26):** Pending → Booked/Confirmed → Past, then chronological within each group (`sortDjGigsCalendarAgendaBookings`)
- **Gigs → DM booking deep link (2026-07-14):** `Open conversation` passes `bookingRequestId` query param; DM scrolls target booking card into view; absolute overlay focus ring (2px primary) holds ~2s then fades ~1s via active/fading phases
- **DM → event → Back (2026-07-14):** `View event` from DM booking card passes `from=dm&conversationId&bookingRequestId`; event detail Back returns to `/dm/{conversationId}?bookingRequestId=…&bookingFocus=scroll-only` — scrolls to booking without blue highlight; Gigs/Calendar deep-links omit `bookingFocus` and keep scroll + highlight
- **Gigs → DM → event return chain (2026-07-25):** Opening DM from Incoming/Confirmed forwards `from=bookings` (+ tab when not Incoming); View event encodes `dmReturnFrom=bookings` on event detail; Event Back restores DM with bookings origin; DM Back returns to canonical `/bookings` or `/bookings?tab=…`; Messages-origin DMs unchanged (`bookingFocus=scroll-only`, Back → `/dm`)
- Create-from-calendar: Save event + **Confirm N DJ(s)** invite flow
- Today highlight on date strip; selected + today states on desktop grid cells

## DJ availability calendar

- Mobile (`< md`): horizontal date strip + selected-day panel — status buttons (Available / Maybe / Unavailable / Clear), booking list, today/selected chip styling aligned with planner event calendar strip
- **Mobile availability pills (2026-07-14):** optimistic save with per-date version guard; active pills keep 1px transparent border (no layout shift on select/save); buttons stay interactive during save; subtle opacity on active pill only; rollback + inline error on failure
- Desktop (`md+`): month grid with per-date overflow menu unchanged
- Bulk select + quick select (Fridays / Saturdays / weekends) on all breakpoints; mobile strip toggles selection in bulk mode
- **Legend + strip dots:** compact dot-and-label legend (shared `CalendarDotLegend`) — Gigs: two centred rows (availability, then booking status: Today, Pending, Accepted); Events mobile: reserved empty top row + event-status row (Today, Upcoming only); desktop Events pills match (Today, Upcoming)
- **Past dates:** availability controls hidden (mobile panel + desktop cell menu); empty booking message and mobile helper text suppressed; historical availability badges and booking cards remain visible; mobile date-strip dots and overflow counts hidden before local today; Gigs bulk / Quick Select cannot select dates before local today (`isDjGigsCalendarBulkSelectableDateKey`)
- **Gigs Calendar availability feedback (2026-07-26):** bulk availability success uses global `PlannerTitleFeedbackProvider` + `useInlineTabFeedbackDismiss` + `formatGigsCalendarAvailabilityMarkedMessage` / `formatGigsCalendarAvailabilityClearedMessage` — same centred fixed overlay, typography, and 2700ms + 300ms fade lifecycle as Gigs History removal; removed month-nav overlay pill that overlapped the calendar heading
- **Gigs Calendar card status pills (2026-07-26):** mobile agenda booking cards use shared `BookingStatusBadge` compact (`Accepted` / `Pending`)
- **Gigs Calendar legend labels (2026-07-26):** booking legend uses `Pending` / `Accepted` (matches Events Calendar and card pills)
- **Gigs Calendar card event banners (2026-07-26):** mobile agenda booking cards use shared `CALENDAR_MOBILE_AGENDA_CARD_LEADING_CLASS` + `getPlannerCalendarAgendaAccentClass` with planner `fallback_colour` from `getEventArtworkByIds` (same source as Events Calendar); status pills unchanged
- **Gigs Calendar card dimensions (2026-07-26):** booking agenda cards use the same `CalendarMobileAgendaCard` layout as Events Calendar (`CompactCalendarEventVenueTitle`, matching badge geometry, shared shell padding/min-height); popover cards no longer use a separate compact layout
- **Events Calendar card dimensions (2026-07-26):** Events mobile agenda cards now use shared `CALENDAR_MOBILE_AGENDA_CARD_TIME_CLASS` and `CALENDAR_MOBILE_AGENDA_CARD_STATUS_BADGE_BASE_CLASS` (Gigs reference geometry); desktop month-grid badges use matching `px-1 py-1` padding
- **Gigs Calendar workspace navigation (2026-07-26):** memoized dual-mode `secondaryRowAction` chrome registration to stop re-render loop blocking workspace tab navigation after switching to Gigs Calendar
- Shared strip component: `PlannerCalendarMobileDateStrip` accepts optional `getDateMarker` for DJ markers (`getDjAvailabilityDateStripMarker`)

## Booking / invite UX

- Default send button label mode: **Confirm N DJ(s)** (`SendBookingRequestsPanel`)
- Unavailable-DJ confirm modal uses Confirm wording
- Calendar-origin and standard create flows aligned on copy and validation
- **Calendar create workspace tab (2026-07-23):** Calendar Create Event / Event Plans open on `/calendar?create=…` via `EventsCalendarOriginCreateClient` (no intermediate `/events` list); legacy `/events?create=calendar` redirects to calendar; CALENDAR tab stays highlighted; cancel/save return unchanged
- **Calendar create workspace navigation (2026-07-26):** leaving `/calendar?create=…` uses `navigateAwayFromCalendarCreateWorkspace` (`location.assign` — App Router client nav is unreliable here); workspace routes prefetch on create open to warm the reload; intercept only blocks tabs while saving
- **Gigs History cards (2026-07-15):** `Fixed ·` / `Open offer` fee copy aligned with Incoming/Confirmed; tighter info-to-actions spacing; shorter View event (primary) + Open DM (subdued) buttons
- **Gigs Confirmed tab (2026-07-19):** received gigs reload after booking acceptance (`ftc-notifications-updated` + tab visibility) so accepted bookings appear in Confirmed without stale client state; gig date keys use shared `resolveEventDateKey` (legacy + ISO); `?tab=confirmed` URL alias maps to Confirmed
- **Gigs tab row (2026-07-23):** `DjGigsTabs` — Incoming/Confirmed use compact `ftc-gigs-tab-pill` (`0.375rem 0.5rem`, `min-height: 1.875rem`); counts cap at **99+** via `formatGigsTabCountDisplay`; label/count row and **`2.5ch`** count slot mount only when count &gt; 0 via shared **`shouldRenderGigsTabCount`**; label/count gap **`gap-1.5` (~6px)**; **History** reuses **`eventsListTabPillClass`**. **`gigsTabCountsCache`** + **`gigsListSnapshotPrefetch`** (from workspace sub-nav) warm tab counts before first Gigs visit.
- **Gigs History delete-selection row (2026-07-24):** bulk-delete toolbar reuses shared `HistorySelectionToolbar` (`tabRowEmbedded`, back/ALL/Delete) inline in `DjGigsTabRow` — History pill + trash swap to toolbar in the same row (`Incoming | Confirmed | ← ALL Delete`); Incoming/Confirmed stay tappable; leaving History (tab or workspace nav) exits selection and clears picks; no second toolbar row or card layout jump
- **Withdrawal Other reason field (2026-07-25):** DJ withdraw / planner cancel “Other” details — 80 chars max, 3 explicit `\n` lines; fixed ~3-row scroll textarea; DM booking card Reason uses `ftc-dm-booking-cancellation-reason-text` (3-line clamp + `max-height` fallback, `pre-line`, safe wrap); Event Details `Your booking` + lineup cards use `EventDetailBookingCancellationDetails` + `ftc-event-detail-cancellation-reason-text` (full reason, safe wrap, `min-w-0` flex children)
- **Cancelled DM booking cards (2026-07-25):** no View event action — cancelled bookings render as a completed receipt (event meta + cancellation info only); pending/accepted unchanged
- **Gigs sub-tab switching (2026-07-24):** Incoming/Confirmed/History pills use `history.pushState` + `bumpGigsListRouteRevision` (Events pattern) so active pill and list filter update immediately without waiting for Next `searchParams` or App Router navigation
- **Gigs list loading (2026-07-19):** Incoming/Confirmed/History show `ReceivedBookingsListSkeleton` while the initial gigs fetch runs (toolbar stays visible; no blank list gap); tab switches with cached data skip the skeleton
- **Gigs tab counts (2026-07-19):** Incoming/Confirmed counts derive from the received-bookings + hidden-id snapshot as soon as those requests complete; sender profile fetch no longer blocks counts; reserved count slots stay stable before numbers appear (no fake zero)
- **Workspace sub-nav (2026-07-19):** shared `(planner-workspace)` layout keeps Events / Event Plans / Calendar / Gigs tabs mounted across route transitions; loading shells render content only below the persistent tab row; mobile tabs use horizontal scroll + `router.push` (no full reload)
- **Profile (2026-07-19):** removed redundant Calendar/Gigs navigation card from DJ profile — availability and bookings stay in Gigs nav only
- **Profile header/nav (2026-07-19):** removed back button from own-profile header (top-level nav destination); mobile bottom nav Profile tab uses same touch `pointerup` routing as other tabs and resolves user id synchronously from session/cache
- **Profile back from DM (2026-07-26):** profiles opened via `buildProfileHref` (`from=chat&returnTo=…`) show top-left Back in `ProfilePageHeader`; Back uses `Link replace` to return directly to the encoded DM URL (preserves query params, no Messages detour); DM details panel View profile uses the same return context; Event Details lineup cards use `buildEventDetailProfileHref` (`from=event-detail&eventId=…`) for the same Back pattern to the originating event; DM back from event-detail profile uses `buildProfileDmThreadHref` / `resolveDmThreadBackHref` with `profileFrom=event-detail` so profile state survives DM round-trip (`Link replace scroll={false}` on DM header)
- **Profile from active DM (2026-07-29):** `isProfileOpenedFromDmConversation(from=chat, returnTo=/dm/…)` hides the bottom Message/Book DJ CTA; group-chat profile opens (`returnTo=/events/…/chat`) and Discover/event/booking entry points keep the CTA; DM saves/restores message-list `scrollTop` in sessionStorage when opening a profile and returning via Back
- **Event Plans delete mode (2026-07-19):** trash and delete-selection toolbars share one fixed-height secondary row (`EVENT_PLANS_TOOLBAR_ROW_CLASS`, same 1.875rem / md:2.375rem rhythm as Events/Gigs tab rows) so plan cards no longer shift when entering or leaving selection mode; title-row Create button slot stays reserved on mobile; toolbar layers swap in place via `EventsListTabRow` + embedded `HistorySelectionToolbar` (no flex-wrap growth)
- **Event Plans empty-state alignment (2026-07-26):** removed legacy 3.125rem toolbar wrapper above empty state — Event Plans empty card now shares the same content baseline as Events (secondary band + tab-row height only)
- **Event Plans selection toolbar stability (2026-07-25):** `SavedEventPlansSectionHeader` always renders trash and Back/All/Delete inside the same `EventsListTabRow` + `EventsListTabPillWidthSpacer` slot — removes conditional alternate DOM that caused card list jump on mode toggle
- **History bulk selection (2026-07-19):** Events History and Gigs History delete-selection use full-card tap plus cyan ring only — no presentational checkboxes; cards expose `aria-pressed` and `aria-selected` for screen readers; cancel exits atomically with stable card shells (border stays on the list item, not a swapping inner button) to prevent white border flash
- **Event Plans selection cards (2026-07-25):** delete-selection uses full-card tap plus inset cyan ring only — no checkbox; hidden `Use plan` button (`EVENT_PLAN_USE_BUTTON_SELECTION_HIDDEN_CLASS`) preserves CTA footprint in mobile + desktop slots so content width and card height stay stable when selection mode opens
- **Event Plans Use plan placement (2026-07-25):** `Use plan` CTA matches Gigs `Open DM` placement — mobile inline beside event/venue meta row; desktop bottom-right row (`hidden sm:flex justify-end`); button styling and tap target unchanged

## Event Plans

- **Event/plan short text limits (2026-07-22):** Event name, venue, and plan name share **`PLANNER_EVENT_PLAN_SHORT_TEXT_MAX_LENGTH` (30)** via `eventFormFieldValidation` + `bookingPlanFormFieldValidation`; `PlannerFormField` uses `applyTextInputLimit` on single-line inputs; save blocked when over limit (legacy longer DB values display until shortened).
- **Event Plans load perf (2026-07-21):** session/local list cache + workspace prefetch (`ensureBookingPlansListPrefetched` from Events sub-nav) — stale-while-revalidate on mount; create/edit/delete update cache; avoids skeleton + duplicate wait on repeat Events ↔ Event Plans navigation
- **Mobile cards (2026-07-14):** compact layout below `sm` — title + vertically centred Use plan on one row; separate Event and Venue label/value rows with single-line ellipsis truncation so max-length unbroken strings cannot overlap the Use plan button; NOTES label only when notes exist; tighter card padding and list spacing; desktop grid unchanged
- **Event Plan save button copy (2026-07-26):** create/edit form submit shows `SAVING` while saving (no trailing ellipsis; `uppercase` button class)
- **Event Plans delete confirmation copy (2026-07-26):** bulk/single delete dialog body uses sentence case without trailing full stops; loading primary shows `DELETING` (no ellipsis)
- **Use Plan DJ confirm loading copy (2026-07-26):** confirmation step primary button shows `CONFIRMING` while sending (no trailing ellipsis; same on unavailable-DJ confirm modal in this flow)
- **Event Plans polish (2026-07-14):** removed redundant “Saved Event Plans” heading; stronger title/meta hierarchy; 2-line notes preview; weighted Use plan outline button; History-matched bulk delete rows (`FTC_SURFACE_ROW_CLASS`, checkbox, toolbar)
- **Use Plan flow polish (2026-07-14):** Event details step shows `Plan` label + plan name; Use Plan entry uses top-right Cancel (returns to Event Plans); header uses `ftc-form-card-header` spacing to match Create Event
- **Use Plan workspace tabs (2026-07-25):** while planner booking create is open on `/bookings` (Event Plans → Use Plan), Gigs Incoming/Confirmed/History sub-tabs are not mounted (`plannerBookingCreateOpen` synced via `GigsWorkspaceChromeState` after deep link clears `planId` from URL); workspace sub-nav intercept closes create via `resetCreateFlowState` then navigates; Event Plans stays highlighted
- **Use Plan cancel on DJ step (2026-07-26):** Cancel on step 1 or 2 returns to Event Plans without resetting `createOpen` first — bookings create UI and Event Plans workspace highlight stay mounted until `router.replace("/booking-plans")`; no transient Gigs Incoming/Confirmed/History render
- **Use Plan event creation (2026-07-26):** sending booking requests from Event Plans → Use Plan now creates an `events` row first (same `createEvent` path as Events → Create event), links booking requests via `event_id`, prepends Events Active cache, and clears planner calendar cache so new events appear immediately in Events → Active and on Calendar; saved Event Plan unchanged

## Group chat

- Per-event crew chat for owner + accepted DJs
- Messages inbox Group tab with artwork tile, deduped by event_id
- **Messages inbox empty state (2026-07-26):** DM tab: `No messages` + `Your conversations will appear here`; Group tab: `No group chats` + `Event group chats will appear here`; no DM/GC badge icons above headings
- **Messages inbox search (2026-07-26):** placeholder `Search` (was `Search conversations...`)
- **Messages inbox tab spacing (2026-07-29):** Messages/Groups segmented control uses `mb-3` above the sticky header divider so the pill border does not merge with the page divider
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
- **Desktop consistency tokens:** shared primary surface (`PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS`), list spacing (`PLANNER_WORKSPACE_LIST_CLASS`), title-row baseline alignment; Calendar reference shell — no duplicate in-card titles on desktop; loading skeletons match loaded layout. **Layout class strings live in `lib/design/plannerWorkspaceTokens.ts` (leaf module, no imports)** — `ftcDesignSystem` must not re-export from `PlannerWorkspaceLayout` / `AppPageLayout` (prevents route TDZ crash).
- **Events list cards (2026-07-14):** smaller list artwork (~14%), bolder title, compact status badge + booking stat chips, full-card tap target with chevron as visual cue only
- **Event title display (2026-07-26):** shared `FTC_EVENT_TITLE_CLAMP_CLASS` (`ftc-event-title-clamp-2`) on Events list cards and Event Details heading — up to 2 lines with ellipsis, `overflow-wrap: anywhere` for long unbroken names; single-line titles keep compact card height
- **Events list card polish (2026-07-20):** two-column Gigs pattern — artwork left, left-aligned body stack (GigCardHeader + GigCardMetaRows rhythm), status + chevron top-right, compact stat chips below time
- **Events loading boundary (2026-07-23):** Route loading uses **`EventsPageLoadingShell`** with **`resolveEventsWorkspaceChromeRole`** (nav cache + **cached profile role**, same merge as loaded **`EventsPageClient`**) — **`resolveEventsListActiveTabLabel`** shows **Active**/History for planners from first frame; list skeleton only.
- **Event detail page (2026-07-14):** shorter hero (~25%), icon-led event summary block, compact lineup booking cards aligned with DM cards, Invite DJs action label, cancel event moved below bookings, flat action cards, dashed run sheet empty state
- **Invite DJs sheet (2026-07-14):** full-card tap selection with avatar checkmark, icon search field, compact DJ row hierarchy, dynamic confirm button label
- **Event detail edit mode (2026-07-26):** opening Edit event hides read-only hero, title, summary, notes, bookings, and run sheet — edit form is the sole content until Cancel or successful Save restores the read-only view; successful save scrolls document to top after read-only content renders (`useLayoutEffect` + `scrollDocumentToTop`); save success shows `Event updated` via inline `PlannerTitleFeedbackSlot` in the Event Details header band (`placement="in-row"`) — same component and shared styles as Gigs workspace title-row slot; provider holds state only (no global viewport host); edit form primary submit label `Save event` (loading `Saving event`)
- **Event detail status badge (2026-07-26):** removed redundant `UPCOMING` (and related) date badge from the full Event Details hero image; status badges unchanged on Events list cards, Calendar, Gigs, and other surfaces
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
| **QA beta data reset** | `scripts/resetQaEnvironment.sql` — see `docs/qa/FTC-BETA-ENVIRONMENT-RESET.md` |

## Recent commits (reference)

- `67d63a1` — add breathing room below Messages inbox segmented control
- `8b2efd6` — hide profile CTA when opened from active DM + restore chat scroll on Back
- `dcf183d` — intercept native scroll to fix premature DM keyboard dismiss on iOS
- `81069a9` — fix immediate DM keyboard dismiss; require 120px downward drag
- `4307ee7` — improve DM keyboard dismiss with downward-drag gesture
- `7c3416a` — sync DM composer focus styling with keyboard session after send
- `43bb356` — dismiss DM composer keyboard on intentional mobile scroll
- `0f3be16` — keep DM composer focused after send
- `f663dab` — show inline finish time validation on bookings DJ selection step (shared set-time errors + aria-invalid trigger styling)
- `0deb822` — fix DM booking card expand positioning (asymmetric expand/collapse scroll policy)
- `7869cf4` — preserve DM bottom position through booking accordion
- `06d1af8` — remove final DM collapse scroll adjustment
- `99bf565` — refactor DM booking accordion scroll coordination
- `fc453da` — restore smooth booking details transition (viewport anchor — superseded by refactor above)
- `a37270c` — fix booking card collapse scroll position (restore pre-expand capture — superseded)
- `1ac85ec` — fix Event Details content overlap with mobile nav
- `f76101a` — final proposal hierarchy polish (Cancel at booking level; Proposed pill)
- `aba9889` — polish proposal action buttons (Accept/Decline side-by-side)
- `ef27346` — fix DM composer return layout root cause (container-only booking-target scroll; no scrollIntoView on return)
- `087b261` — fix DM return composer position and placeholder (superseded by document scroll lock)
- `74aab82` — final DM booking negotiation polish (timeline suppression + muted hierarchy)
- `743ea18` — add first-time helper behaviour to propose rate modal
- `4d1ef05` — limit proposal notes textarea growth
- `d2f2608` — refine booking type presentation in booking cards
- `cf374fb` — implement booking notes reveal scroll
- `9e34a05` — restore booking notes Show more behaviour
- `b2f16b7` — restore collapsed booking notes default state
- `652c645` — smooth booking notes expansion
- `78195bd` — improve booking timeline event spacing
- `a6a82ff` — unify booking timeline timestamp behaviour
- `d308e18` — improve booking timeline timestamp grouping
- `52a7037` — polish booking timeline system messages
- `9ecf6e4` — replace booking event pills with system messages
- `6df8c87` — smooth DM booking card alignment scroll
- `92b189d` — smoothly expand DM history booking cards
- `c42d3f5` — implement standard chat scroll model (Option B-lite)
- `53e9a7d` — prevent latest-message scroll during booking expansion
- `bc03e3a` — reset Events tab to Active when returning from other workspaces
- `bb40ce3` — prevent DM auto-scroll on booking card layout changes
- `1bf0e63` — fix DM booking card scroll target identity
- `fabeaf5` — remove DM booking card scroll spacer regression
- `84b53f4` — fix DM booking card collapse scroll anchoring
- `5b10980` — fix bottom DM booking card scroll anchoring
- `91979b7` — improve booking card expand/collapse scroll anchoring
- `67fe621` — unify Ask for rate booking terminology
- `5c82f2f` — simplify proposed rate booking card
- `bc47f1a` — refine DM booking action layout
- `55160bb` — polish booking proposal action layout
- `783e565` — refine propose rate modal copy
- `65c8601` — remove permanently deleted events from calendar
- `8729db6` — prevent Active tab flash when returning to Events History
- `1bf70a9` — simplify Edit Event primary button copy
- `9e9acfe` — polish Event Plans delete confirmation copy
- `fbc1382` — final planner booking button polish
- `5bc9cd9` — polish planner booking action buttons
- `9f67e5a` — preserve Event Details profile context through DMs
- `465b3a1` — fix DJ profile return navigation and CTA copy
- `be65609` — planner booking card polish and profile navigation
- `8785062` — polish Send Bookings DJ cards
- `eba6498` — contain Send bookings modal scrolling on iOS
- `14b749c` — lock background interaction behind Send bookings modal
- `7e1287e` — polish send bookings modal copy
- `5dce023` — hide planner-cancelled bookings from active list
- `cffce57` — improve Event Details notes wrapping
- `4b5f194` — simplify Events Calendar legend
- `7d2a59f` — separate planner events from DJ bookings in calendars
- `7915e79` — remove ellipsis from DJ confirmation loading state
- `e1c615b` — fix Event Plan Use Plan event creation flow
- `8364a0c` — Improve long event title wrapping and truncation
- `36132c8` — Improve Event Calendar agenda card hierarchy
- `bc339db` — Unify Event Details with shared notification system
- `2ba503a` — Match Event Details notification position to Gigs
- `e9d82d6` — Refine Event Details status and success notification
- `88cd2e0` — Use shared notification system for Event Details
- `fbb04f5` — Restore Event Details header after toast regression
- `8c4454c` — Use shared success notification for Event Details
- `97b098c` — Match Event Details toast to shared Gigs notification
- `f0f6403` — Correct Event Details toast placement
- `60e02a1` — Fix app startup regression from shared toast refactor
- `f737431` — Refactor Event Details to shared success toast
- `1a74cc5` — Use shared success toast for Event Details
- `8b8a369` — Match Event Details success toast styling
- `52d2e1a` — Scroll Event Details to top after save
- `996921e` — Simplify Event Details edit mode
- `c93f009` — Refine Gigs Calendar empty state copy
- `6a3c003` — Align Event Plans empty state spacing
- `626c054` — Simplify Messages search placeholder
- `624563d` — Simplify Messages empty states
- `ab67c05` — Refine Messages empty state copy
- `c94d0e9` — Remove redundant empty state helper text
- `53d35d2` — Simplify empty state copy and remove duplicate CTAs
- `da859d3` — Refine Events empty state
- `dfa13b8` — Scope QA reset to QA accounts only
- `3654455` — Simplify FTC QA reset process
- `567fedc` — Automate FTC beta environment reset
- `cbaf7aa` — Prepare clean QA environment for beta readiness testing
- `4f82297` — add profile Back button when opened from DM
- `8e00b42` — align Events Calendar agenda card height with Gigs reference
- `5979f2f` — fix Use Plan cancel flicker through Gigs workspace
- `79be94a` — fix Use Plan step-2 cancel return to Event Plans
- `c2e54d0` — fix(gigs-calendar): use shared title-row feedback for availability updates
- `b89ecd3` — fix(gigs-calendar): prevent selecting past dates
- `b1d4172` — feat(gigs-calendar): prioritise actionable bookings in daily agenda
- `8cc6a71` — feat(calendar): prioritise actionable events in daily agenda
- `e8120ab` — fix(calendar): sort daily agenda chronologically by start time
- `0105b83` — fix planner calendar pending booking navigation to Event Details
- `5e9adae` — fix Calendar create workspace tab requiring two taps
- `34154ca` — fix workspace navigation during Calendar create event flow
- `308c4a1` — hide Gigs sub-tabs during Event Plan Use Plan flow
- `95f5d1d` — preserve Event Plan card dimensions in bulk-selection mode
- `56b0234` — fix Event Plans card list shift when bulk-selection opens
- `2b2311a` — align Event Plans Use plan button with Gigs Open DM placement
- `960ee70` — use shared transient feedback for booking send success on event detail
- `a02e788` — use shared transient feedback for booking request cancellation on event detail
- `c7d79df` — hide View event on cancelled DM booking cards
- `2297ff2` — fix cancellation reason layout in DM cards and event detail
- `e6f52ba` — preserve Gigs Incoming return chain through DM and event detail
- `14e5194` — shrink Gigs nav pills when count is zero
- `6be58e5` — unify DatePicker and TimePicker placeholder styling
- `3441eb4` — fix date picker placeholder colour consistency
- `1ee1980` — fix DM reaction picker blocking chat scroll after open
- `c278601` — fix iPhone Safari image long-press opening native link preview
- `7a9426b` — replace persistent DM React action with press-and-hold picker
- `8cc6f55` — clear image selection styling after successful send
- `57ef874` — clear DM composer photo preview after successful send
- `fe75fad` — polish withdrawal Details textarea scroll padding and caret visibility
- `196e254` — align History removal toast with Event Plans `useInlineTabFeedbackDismiss` lifecycle
- `4273ff7` — polish History removal toast: below title row, smoother 350ms fade
- `97b9488` — unify Events + Gigs History removal feedback in planner title row with shared fade lifecycle
- `0b753d6` — move Gigs History success feedback to centred planner title row (tab row stays controls-only)
- `b249e6a` — align Gigs History feedback with Events tab-row pattern
- `23b4789` — move Gigs History success message to title row
- `2b3c989` — Gigs History inline feedback + instant sub-tab switching
- `08815fb` — inline Gigs History delete-selection toolbar in tab row
- `888b4f2` — open Gigs Incoming on fresh workspace entry
- `72888d4` — fix Gigs Calendar workspace navigation from calendar
- `845b91c` — preserve gigs filter counts during loading
- `29546e8` — Refine Gigs filter tab visual balance
- `f3e5e8b` — preserve workspace gigs badge count during navigation
- `070e397` — stabilise workspace gigs badge during navigation
- `754d14b` — Polish Gigs filter pill count spacing
- `fd9bc65` — balance Gigs Incoming/Confirmed pill padding
- `3a802a6` — Gigs tabs: add ~6px gap between label and count
- `3835957` — standardise planner workspace vertical spacing between sub-nav and secondary controls
- `58f63af` — align events loading filter label
- `a80058a` — fix circular workspace dependency causing route crash
- `b43e2bf` — show cached events list on tab return without skeleton flash
- `2a0f98d` — stabilise events filters and card skeletons
- `e517c08` — final polish compact calendar titles
- `9e77fe5` — simplify compact calendar title layout
- `16c1ba6` — enforce 30 character event and plan field limits
- `7b0268e` — Polish gigs filter tabs
- `591ecd2` — revert broken events loading refactor
- `caa405d` — limit events loading state to event list
- `ee191d6` — fix events route regression
- `f927644` — fix events loading chrome layout shift (reverted in next commit — TDZ circular import)
- `eb70e53` — stabilise events active history filters during loading

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
