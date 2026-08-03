# FOLLOW THE CROWD (FTC)
## Complete Project Handover / Product Vision
### Last Updated: August 2026

**Audience:** every Builder, Reviewer, QA agent, and ChatGPT planning session.  
**Status:** authoritative product philosophy. Prefer this over inventing goals.  
**Live build truth:** still `CURRENT-STATE.md`. This file is *why* and *how we choose*, not *what shipped*.

---

# Project Overview

Follow The Crowd is a premium event-management platform built specifically for independent promoters, DJs and event crews.

The objective is NOT to become another ticketing platform.

The objective is to become the operating system that runs an event before, during and after it.

Every feature should reduce friction between promoters and their crew.

The design philosophy is:

- minimal
- premium
- calm
- intuitive
- mobile-first
- zero unnecessary UI
- consistent across the entire application

Think:

Apple  
Linear  
Stripe  
Notion

Not:

Busy dashboards  
Enterprise software  
Generic admin panels

Every screen should feel intentional.

---

# Target Users

**Primary**

- Independent event promoters
- Underground promoters
- Festival organisers
- Club owners

**Secondary**

- DJs
- MCs
- Crew
- Photographers
- Performers

**Future**

- Venues
- Booking agencies
- Production companies

---

# Current Product Philosophy

FTC should become the operating system for an event.

Current workflow:

```
Create Event
  ↓
Invite DJs
  ↓
Accept Booking
  ↓
Direct Message
  ↓
Crew Chat opens
  ↓
Run Sheet
  ↓
Event
  ↓
Post-event
```

Every feature should support this flow.

---

# Current Core Features

## Authentication

- Email login
- Profiles
- Artist accounts
- Planner accounts

## Events

Planners can:

- Create events
- Edit events
- Cancel events
- Invite DJs

DJs can:

- View events
- Accept
- Decline

## Direct Messages

Production quality.

Supports:

- Messages
- Images
- Booking cards
- Read receipts
- Reactions
- Attachments

DM should always remain the reference implementation for messaging.

Whenever Crew Chat gains a feature it should reuse the DM implementation rather than creating another version.

## Crew Chat

Production quality.

Supports:

- Event context card
- Countdown
- Member list
- Event announcements
- Images
- Read receipts
- Empty state
- View Event
- Details toggle
- Manual collapse
- Automatic collapse on scroll
- Premium composer

Future additions should continue extending the shared messaging system rather than creating Crew Chat-specific implementations.

## Run Sheet

Production quality.

Supports:

- Planner editing
- DJ viewing
- Accordion
- Notes
- Stage
- Set time
- Collapse
- Completion
- Empty state
- Responsive

The Run Sheet should always feel lightweight.

Never clutter it.

---

# UI Philosophy

Less is almost always better.

Whenever deciding between more UI or less UI, choose less.

Avoid:

- icons
- badges
- labels
- decorations
- visual noise

Only add elements when they provide genuine value.

---

# Typography

Typography creates hierarchy.

Do not rely on:

- icons
- heavy borders
- large coloured sections

Use spacing instead.

---

# Buttons

Buttons should be short.

Examples: Create, Save, Cancel, Edit, Done

Avoid: Create Run Sheet, Save Run Sheet, Edit Run Sheet — unless context genuinely requires it.

---

# Empty States

Empty states should:

- Explain
- Guide
- Disappear

They should never feel like an error.

---

# Messaging Philosophy

Messages should always be the focus.

System UI should never compete with conversations.

System announcements should look like announcements.

User messages should look like user messages.

---

# Shared Components

Whenever possible reuse. Never duplicate.

Examples:

- DM image viewer → Crew Chat image viewer
- DM upload pipeline → Crew Chat upload pipeline
- DM composer → Crew Chat composer

One implementation. Two contexts.

---

# Product Principles

Every new feature must answer:

1. Does this reduce friction?
2. Does this remove work?
3. Does this help during an event?

If not — don't build it.

---

# Features NOT to build unless requested

Near-term messaging extras (unless Isaac asks):

- Typing indicators
- GIFs
- Polls
- Themes
- Custom chat colours
- Large emoji reactions

Social-network features (always avoid unless asked):

- Stories
- Feeds
- Followers
- Likes
- Trending
- Memes
- Random social features

FTC is a workflow product / event operating system. Not a social network.

---

# Long-term Vision

FTC should eventually replace almost every app a promoter opens before, during and after an event.

Instead of using Instagram, Messenger, WhatsApp, Google Docs, Notes, Excel, banking apps, Email, Dropbox, Drive, Calendars, and ticket reports — everything should happen inside FTC.

## North Star

One day, a promoter should be able to organise an entire event — from the first booking to the final payout — without ever leaving FTC.

## Design principles (feature gate)

Every new feature must satisfy at least one:

- Saves time
- Reduces stress
- Removes another app
- Helps during an event
- Helps after an event

If it doesn't — don't build it.

---

# Roadmap (Phases 1–12)

Phasing is directional product planning, not a build schedule. Ship only what Isaac tasks. Prefer Phase 1 depth over jumping ahead.

## Phase 1 (Current)

- Booking system
- Direct Messages
- Crew Chat
- Run Sheets
- Profiles
- Events
- Notifications

Geographic launch path (when relevant): Australia → New Zealand → UK → Europe → USA.

## Phase 2

**Push Notifications** — booking accepted/declined, crew announcements, Run Sheet updated, event tomorrow, DJ running late, promoter mentions you, unread messages.

**Calendar** — sync to Apple Calendar, Google Calendar, Outlook; availability; blackout dates; tour schedules.

**DJ Availability** — Available, Busy, Touring, Away; recurring availability.

**Saved DJ Lists** — Resident, House, Openers, Headliners, Emergency replacements, Local, Interstate.

**Favourite Venues** — save venues, venue notes, load in details, parking, contact numbers, sound restrictions, capacity, curfew.

## Phase 3

**Payments** — deposits, final payments, invoices, receipts, payment tracking, late payments, automatic reminders, Stripe.

**Contracts** — digital contracts, sign inside FTC, automatic reminders, version history, templates.

**Expenses** — venue hire, security, marketing, artists, accommodation, flights, production, profit calculator.

**Budget Dashboard** — income, expenses, profit, break-even, expected attendance, revenue projections.

## Phase 4

**Ticketing** — sell tickets, door sales, guest list, VIP, check-in, QR codes, capacity tracking.

**Marketing** — event artwork, poster builder, social media assets, email/SMS campaigns, countdown posts, automatic posting.

**Analytics** — most booked DJs, acceptance rate, best venues, revenue growth, repeat artists, attendance, popular event types, peak booking times.

## Phase 5

**Crew Management** — security, photographers, videographers, lighting, sound, stage managers, volunteers. Everyone works inside one event.

**Checklists** — before / during / after event; crew, venue, equipment checklists.

**Incident Reports** — problems, injuries, damage, lost property, notes, photos.

**Equipment** — microphones, CDJs, mixers, lighting, cables, inventory, maintenance history.

## Phase 6

**Venues** — profiles, dashboard, bookings, staff, calendar, availability, analytics.

**Agencies** — agency accounts, artists, bookings, contracts, payments, availability.

**Production Companies** — sound, lighting, visuals, stage, equipment hire, crew.

## Phase 7

**Mobile Event Mode** — one-tap interface, large buttons, dark UI, quick access; designed for a loud nightclub.

**Offline Mode** — messages queue; Run Sheets and event details cached; no signal required.

**Emergency Mode** — call security/venue, medical contacts, emergency procedures, evacuation plan.

## Phase 8

**AI** — Run Sheet builder, budget/staffing suggestions, event checklist, announcement writer, contract summaries, post-event reports, analytics insights.

**Smart Suggestions** — DJs, venues, crew, pricing, set times, event timings.

## Phase 9

**Community** — verified DJs / promoters / venues, reviews, references, portfolio, media galleries, achievements.

**Discovery** — find DJs, venues, crew, photographers, agencies.

## Phase 10

**Marketplace** — equipment hire, venue hire, graphic designers, photographers, production companies, security, marketing agencies. Everything bookable.

## Phase 11

**Finance** — revenue dashboard, tax exports, BAS/GST reports, payout history; accounting integrations (Xero, MYOB, QuickBooks).

## Phase 12

**Enterprise** — multi-user promoter teams, permissions, staff accounts, organisation accounts, multiple venues, multi-city management, white label.

---

# Product Standards

Never ship:

- temporary UI
- developer placeholders
- duplicate actions
- duplicate buttons
- duplicate wording

Every screen should feel finished.

---

# Engineering Standards

Before every task:

1. Inspect existing implementation
2. Understand current architecture
3. Reuse existing systems
4. Avoid duplicate state
5. Avoid duplicate components
6. Avoid duplicate business logic

Every task must end with:

- Typecheck
- Build
- Regression tests
- Live verification (desktop + mobile)
- Update `CURRENT-STATE.md`
- Commit
- Push

---

# Design Standards

FTC should feel:

Premium · Fast · Calm · Confident · Minimal · Professional · Commercial

Never hobby project. Never bootstrap looking. Never "good enough."

Visual / spacing tokens live in `docs/design/FTC_DESIGN_SYSTEM.md` — this vision doc does not replace that file.

---

# Final Rule

Whenever making design or engineering decisions:

Choose the option that makes FTC feel like software people would happily pay for every month.

Every screen should answer one question:

> Does this feel like a premium SaaS product?

If the answer is no — keep refining.
