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

- Typing indicators
- GIFs
- Polls
- Themes
- Custom chat colours
- Large emoji reactions
- Social media style features

FTC is an event operating system. Not a social network.

---

# Future Roadmap

**Priority 1 — Notifications**

Push notifications, reminder notifications, booking reminders, Run Sheet updates, crew announcements.

**Priority 2 — Venue management**

Venue profiles, venue history, venue equipment, venue contacts.

**Priority 3 — Analytics**

Attendance, bookings, revenue, acceptance rate, popular DJs.

**Priority 4 — Payments**

Deposits, invoices, payouts, settlement.

**Priority 5 — Global launch**

Australia → New Zealand → UK → Europe → USA

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

# Long-term Vision

FTC should become the platform every promoter opens before an event.

Eventually: Bookings, Crew, Run Sheets, Messages, Payments, Venues, Analytics, Notifications — everything happens inside FTC.

Promoters should never need Facebook Messenger, Instagram, Notes, Excel, Google Docs, or WhatsApp for event ops.

FTC should replace all of them with one beautiful workflow.

---

# Final Rule

Whenever making design or engineering decisions:

Choose the option that makes FTC feel like software people would happily pay for every month.

Every screen should answer one question:

> Does this feel like a premium SaaS product?

If the answer is no — keep refining.
