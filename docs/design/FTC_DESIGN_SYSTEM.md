# FTC Design System

Follow The Crowd (FTC) uses a **flat, dark, layered UI** — navy surfaces, subtle borders, solid accent colours. No neon glow, no gradients on controls, no cyberpunk styling.

This document is the single reference for spacing, typography, and component rules across **Events, Event Plans, Calendar, Gigs, History, Messages, Discover, and Profile**.

**Code exports:** `lib/design/ftcDesignSystem.ts`, `lib/design/ftcStatusBadge.ts`, `lib/ftcFlatStatus.ts`  
**CSS tokens:** `app/globals.css` (`:root` variables + `.ftc-*` classes)

---

## Design principles

1. **Mobile-first** — design and test at **390px** width minimum; also verify **~1280px** desktop parity per `FTC_WORKFLOW.md` §7.
2. **One product** — same padding, card radius, button heights, and badge sizes everywhere.
3. **Workflow-first** — information hierarchy over decorative imagery (compact list thumbs; flyer hero only on Event Details).
4. **Flat & readable** — high contrast text on dark surfaces; status colours are solid fills.
5. **Reuse shared components** — prefer `PlannerWorkspacePage`, `PlannerUi`, `ftc-*` classes, and design-system exports over one-off styles.

---

## Colour tokens

Defined in `app/globals.css` `:root`. Do not introduce new palette values without updating this doc.

| Token | Usage |
|-------|--------|
| `--ftc-color-bg-base` | App background |
| `--ftc-color-bg-surface` | Cards, rows |
| `--ftc-color-bg-elevated` | Nested panels, inputs hover |
| `--ftc-color-bg-input` | Form fields, stat chips |
| `--ftc-color-primary` | Primary actions, Today, active pills |
| `--ftc-color-text-primary` | Headings, primary body |
| `--ftc-color-text-secondary` | Meta, secondary body |
| `--ftc-color-text-muted` | Captions, hints |
| `--ftc-color-border-subtle` | Default card/row borders |
| `--ftc-color-success` | Accepted |
| `--ftc-color-warning` | Pending |
| `--ftc-color-danger` | Cancelled, destructive |
| `--ftc-color-upcoming` | Upcoming events, tentative availability |

---

## Border radius

| Token | Value | Usage |
|-------|-------|--------|
| `--ftc-radius-sm` | 8px | Small controls |
| `--ftc-radius-md` | 12px | Inputs |
| `--ftc-radius-lg` | 16px | Option cards, upload panels |
| `--ftc-radius-xl` | 20px | **Default cards**, buttons, list rows |
| `--ftc-radius-2xl` | 24px | Modals (mobile sheet top) |

**Rule:** Cards and list rows use **`var(--ftc-radius-xl)`** via `.ftc-card` or explicit `rounded-[var(--ftc-radius-xl)]`.

---

## Page layout

### Shell width

| Context | Class | Max width |
|---------|-------|-----------|
| Events workspace (Events, Plans, Calendar, Gigs) | `PLANNER_WORKSPACE_PAGE_SHELL_CLASS` | `max-w-2xl` mobile; `md:max-w-5xl` desktop |
| Messages / Profile | `APP_DM_CONTENT_WIDTH_CLASS` | `max-w-2xl`; `lg:max-w-[52rem]` |

### Horizontal padding

**Standard page inset:** `px-4 sm:px-6` — `PLANNER_WORKSPACE_PAGE_INSET_CLASS`

Apply to: page headers, body content, Event Details content, Messages inbox.

### Vertical spacing

| Area | Rule |
|------|------|
| Page header | `pt-4 pb-4` + bottom border — `PLANNER_WORKSPACE_HEADER_CLASS` |
| Sub-nav below title | `mt-4` — `PLANNER_WORKSPACE_SUBNAV_SLOT_CLASS` |
| Secondary controls row (tabs, filters) | `pt-4` band + `mb-4` row — `PLANNER_WORKSPACE_SECONDARY_BAND_CLASS`, `PLANNER_WORKSPACE_SECONDARY_CONTROLS_CLASS` |
| Page body bottom | `pb-4` — `PLANNER_WORKSPACE_BODY_CLASS` |
| Section gap (Event Details, profile) | `mt-8` — `EVENT_DETAIL_SECTION_SPACING` |
| List item gap | `space-y-3` — `PLANNER_WORKSPACE_LIST_CLASS` / `FTC_LIST_GAP_CLASS` |
| Filter pill row gap | `gap-2` — `FTC_PILL_ROW_GAP_CLASS` |

### Header spacing

- **Title row:** `flex flex-wrap items-start justify-between gap-3`
- **Page title:** `text-xl font-semibold leading-tight` — `PLANNER_WORKSPACE_TITLE_CLASS`
- **Header actions:** right-aligned; reserve width on desktop for alignment — `PLANNER_WORKSPACE_TITLE_ACTIONS_CLASS`

---

## Typography

| Role | Class / pattern | Example |
|------|-----------------|--------|
| **Page title** | `PLANNER_WORKSPACE_TITLE_CLASS` | Events, Calendar, Gigs |
| **Page section title** | `.ftc-page-section-title` | Discover section headers |
| **Section title** | `.ftc-section-title` | Bookings, Run sheet, Notes |
| **Card / form title** | `text-lg font-semibold text-ftc-text` | Edit event, Create plan |
| **List card title** | `text-[1.0625rem] font-bold leading-snug sm:text-lg` | Event list rows |
| **Body / meta** | `text-sm text-ftc-text-secondary` | Venue · date |
| **Caption / time** | `text-sm text-ftc-text-muted` | Set time, hints |
| **Label** | `.ftc-label` | Form field labels (11px uppercase) |
| **Section label (accent)** | `.ftc-planner-section-label` | Planner accent labels |
| **Inline error** | `.ftc-inline-error` | Validation messages |
| **Empty state title** | `text-base font-medium text-ftc-text-secondary` | Page empty |
| **Empty state body** | `text-sm text-ftc-text-muted` | Optional description |

---

## Cards

### Standard card

```html
<div class="ftc-card p-4 sm:p-5">…</div>
```

| Property | Value |
|----------|--------|
| Border | `1px solid` subtle |
| Background | `--ftc-color-bg-surface` |
| Radius | `--ftc-radius-xl` |
| Padding | `p-4 sm:p-5` |

### Raised card (rare)

`.ftc-card-raised` — surface-raised + shadow-md.

### Compact card (Event Details nested)

`p-3.5 sm:p-4` — `FTC_CARD_PADDING_COMPACT_CLASS` / `EVENT_DETAIL_CARD_CLASS`

### List row card

`.ftc-surface-row` + `rounded-[var(--ftc-radius-xl)] p-4 sm:p-5` — same padding as standard card; used for Events/Gigs list items.

### Desktop workspace surface

`PLANNER_WORKSPACE_PRIMARY_SURFACE_CLASS` = `ftc-card p-4 sm:p-5 md:p-6` — Calendar desktop panel only.

### Image sizes

| Context | Component | Size |
|---------|-----------|------|
| Event list thumb | `EventThumbnail` size `list` | 64×64px square |
| Context / inbox thumb | `EventThumbnail` size `context` / `inbox` | 44px / 48px |
| Event Details flyer | `EventDetailHeroImage` | Natural aspect; max ~430px height |
| Edit event preview | `EventCoverImageHeroPreview` | 16:9 cover |
| Profile avatar | `ProfileAvatar` | sm 32px, md 48px, lg 56px, xl 112px |

### Chevron placement (list rows)

- Container: `shrink-0 self-start`
- Offset: `mt-0.5`
- Icon: `h-4 w-4`, `text-ftc-text-muted`
- Reference: `EventsListCardChevron`

### Badge placement (list rows)

- Container: `shrink-0 self-start` in title row
- History tab: fixed column `w-[4.5rem] justify-end` for aligned Past/Cancelled badges
- Status badges: top-right of title row, never wrapping below title on mobile when avoidable

---

## Buttons

Base classes in `app/globals.css`. Prefer design-system exports for inline usage.

| Variant | Class | Height | Radius | Typography |
|---------|-------|--------|--------|------------|
| **Primary** | `.ftc-btn-primary` | `min-height: 2.5rem` | `--ftc-radius-xl` | 14px bold; workspace actions add `text-sm uppercase tracking-wide` |
| **Secondary** | `.ftc-btn-secondary` | `min-height: 2.5rem` | `--ftc-radius-xl` | 13px semibold |
| **Ghost** | `.ftc-btn-ghost` | auto | `--ftc-radius-lg` | 13px semibold, primary text |
| **Icon** | `.ftc-icon-btn` | 40×40 (`h-10 w-10`) | `--ftc-radius-xl` | — |
| **Icon sm** | History manage | 36×36 (`h-9 w-9`) | `rounded-lg` | — |

### Workspace header CTA

`FTC_BTN_WORKSPACE_PRIMARY_CLASS` — Create event, Create plan.

### Form / detail actions

`FTC_BTN_FORM_PRIMARY_CLASS`, `FTC_BTN_FORM_SECONDARY_CLASS` — Save, Cancel, Open DM.

### Destructive

Modal confirm: `bg-[var(--ftc-color-danger)]`, uppercase semibold, `min-h-[2.75rem]`, `rounded-xl`.

**Disabled:** `opacity-50` or `opacity-55`; `cursor-not-allowed`.

---

## Pills / status badges

### Filter pills

`.ftc-filter-pill` + `.ftc-filter-pill-active`

| Property | Value |
|----------|--------|
| Padding | `6px 12px` |
| Font | 11px semibold uppercase |
| Gap in row | `gap-2` |
| Active fill | Primary solid |

### Status badges (events + bookings)

Use `getFtcStatusBadgeSizeClass()` from `lib/design/ftcStatusBadge.ts` + semantic fill from `lib/ftcFlatStatus.ts`.

| Variant | Geometry |
|---------|----------|
| **compact** | `px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide` |
| **default** | `px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide` |

| Status | Fill class | Used for |
|--------|------------|----------|
| **Upcoming** | `FTC_STATUS_UPCOMING` | Future event dates |
| **Today** | `FTC_STATUS_TODAY` / primary | Event date = today |
| **Past** | `FTC_STATUS_MUTED` | Past event dates |
| **Pending** | `FTC_STATUS_PENDING` | Booking pending |
| **Accepted** | `FTC_STATUS_SUCCESS` | Booking accepted |
| **Declined** | `FTC_STATUS_MUTED` | Booking declined |
| **Cancelled** | `FTC_STATUS_DANGER` | Event/booking cancelled |

**Components:** `EventDateStatusBadge`, `BookingStatusBadge` — must stay identical geometry.

### Stat chips (lineup counts)

`.ftc-stat-chip` (default) or compact inline variant in `PlannerStatChip` — 11px uppercase, bordered, muted.

---

## Forms

| Element | Class | Notes |
|---------|-------|-------|
| Text input | `.ftc-input px-3.5 py-2.5` | `min-height: 2.75rem` |
| Textarea | `.ftc-input` on textarea | Event notes: `.ftc-event-notes-textarea` |
| Label | `.ftc-label` | 11px uppercase, secondary colour |
| Field error | `.ftc-inline-error` + `PlannerFieldError` | 12px below field |
| Form card header | `.ftc-form-card-header` | Title + Cancel link |
| Form vertical gap | `.ftc-event-edit-form` | `gap: 1.25rem` |
| Upload panel | `.ftc-event-cover-panel` | `rounded-lg`, input background |

**Mobile:** inputs use **16px** font on viewports `<640px` to prevent iOS zoom.

**Validation:** border `--ftc-color-danger` via `.ftc-input-error` or `aria-invalid="true"` — no red glow.

---

## Empty states

Two tiers — same dashed border shell (`.ftc-card-empty`):

| Tier | Class | Padding | Typography |
|------|-------|---------|------------|
| **Page empty** | `.ftc-empty-state-page` | `px-6 py-12` | Title `text-base font-medium`; optional description `text-sm muted` |
| **Panel empty** | `.ftc-empty-state-panel` | `px-6 py-8` | Message `text-sm text-ftc-text-secondary` |

**Components:** `PlannerEmptyState` (page), `PlannerEmptyPanel` (inline section).

---

## Modals

Shared pattern (History confirm, booking sheets, edit confirm):

| Property | Value |
|----------|--------|
| Overlay | `fixed inset-0 z-[60]` (or z-50), `bg-black` / `bg-black/60` |
| Sheet (mobile) | `rounded-t-2xl`, bottom-aligned |
| Dialog (sm+) | `rounded-2xl`, centred, `max-w-lg` |
| Header | `px-5 py-4`, border-bottom |
| Title | `text-base font-semibold text-ftc-text` |
| Body | `text-sm leading-relaxed text-ftc-text-secondary` |
| Footer | `px-5 py-4`, `gap-2`, stacked mobile / row desktop |
| Footer buttons | `min-h-[2.75rem]`, `rounded-xl`, full-width mobile |

**Body scroll lock:** `document.body.style.overflow = hidden` while open.

---

## Skeleton loaders

| Element | Pattern |
|---------|---------|
| Block | `.ftc-skeleton .ftc-skeleton-shimmer` + `rounded-lg` |
| Card shell | `.ftc-card p-4 sm:p-5` |
| List row | Match live row padding and avatar sizes |
| Shimmer | 1.5s ease-in-out infinite; **disabled** for `prefers-reduced-motion` |

**Rule:** Skeleton layout must match final content geometry (see `Skeleton.tsx` per route).

---

## Animations

| Property | Standard |
|----------|----------|
| Interactive surfaces | `transition duration-150 ease-out` |
| Buttons / borders | `0.15s ease` |
| Hover (desktop only) | `@media (hover: hover)` |
| Reduced motion | `motion-reduce:transition-none`; skeleton shimmer off |

---

## History (Events tab)

History uses the **same list card component and layout** as Active. Tab row height is locked via `EVENTS_LIST_TAB_ROW_CLASS`; Active reserves an invisible trash slot (`FTC_EVENTS_LIST_TAB_ACTION_PLACEHOLDER_CLASS`) so the first card Y position does not shift when switching tabs. History remove confirmation uses `EVENTS_LIST_TAB_FEEDBACK_CLASS` in the tab row (truncate, auto-dismiss ~3s); bulk selection swaps into the same row via `EventsListTabRow` + embedded `HistorySelectionToolbar` (no second toolbar row above cards).

---

## Workspace map

| Area | Shell | Key shared components |
|------|-------|------------------------|
| Events | `PlannerWorkspacePage` | `PlannerFilterPills`, `EventThumbnail`, `PlannerEmptyState` |
| Event Plans | `PlannerWorkspacePage` | `PlannerFormCard`, `PlannerFormField` |
| Calendar | `PlannerWorkspacePage` | `CalendarMobileChrome`, `PlannerWorkspacePrimarySurface` |
| Gigs | `PlannerWorkspacePage` | `BookingHistoryCard`, filter pills |
| History | Events/Gigs tabs | `HistoryBulkManage`, history card modifiers |
| Messages | `AppPageShell` | `MessagesInboxLayout`, `ftc-tab-pill` |
| Discover | `AppPageShell` | `DiscoverSectionHeader`, profile rows |
| Profile | `AppProfilePageShell` | `ProfileSectionCard`, `ProfileAvatar` |
| Event Details | Custom header + inset | `EventDetailHeroImage`, `eventDetailUi` tokens |

---

## Checklist for new UI

- [ ] Uses `px-4 sm:px-6` page inset
- [ ] Cards use `.ftc-card` + `p-4 sm:p-5` unless compact detail panel
- [ ] List gaps are `space-y-3`
- [ ] Status badges use `getFtcStatusBadgeSizeClass` + `FTC_STATUS_*` fills
- [ ] Primary buttons use `.ftc-btn-primary` with documented size variant
- [ ] Empty states use `PlannerEmptyState` or `PlannerEmptyPanel`
- [ ] No new colours; no glow; no raw UUIDs in UI
- [ ] Test at 390px width

---

## Related files

- `app/globals.css` — CSS implementation
- `app/components/planner/PlannerWorkspaceLayout.tsx` — page shell constants
- `app/components/planner/PlannerUi.tsx` — forms, pills, empty states
- `app/components/event-detail/eventDetailUi.ts` — Event Details tokens
- `lib/ftcFlatStatus.ts` — status fill classes
