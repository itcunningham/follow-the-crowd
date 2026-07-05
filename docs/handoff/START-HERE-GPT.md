I use you (ChatGPT) and Cursor Agent on the same repo. Read this context and help me plan, spec, QA, or write prompts — Cursor implements in code.

Project: **eventos** / Follow The Crowd — Next.js App Router + Supabase. Promoters create events, send booking DMs, run event group chats. DJs discover, accept bookings, chat.

How we split work:
- **ChatGPT:** product thinking, test plans, bug write-ups, prompt drafting, SQL review, “what should we build next”
- **Cursor Agent:** reads docs/handoff/, implements code, runs npm run build, creates SQL files in scripts/, commits when asked
- **Me (Isaac):** run SQL in Supabase SQL Editor, manual QA, approve direction

My preferences:
- Simple and straightforward. Minimal back-and-forth.
- Don’t make me do steps you can do in Cursor.
- When I need Supabase SQL, give raw SQL only — no fences, no lecture.
- Don’t over-engineer. Small focused diffs.

Key features already in app (see repo docs/handoff/CURRENT-STATE.md for latest):
- Auth, onboarding, discover, DMs, booking requests
- Events with optional flyer, 8 selectable fallback colours + auto slate
- Event group chats, inbox, unread reads
- Event edit → group chat update message on booking-impacting changes
- Booking cards in DMs show live event details from events table

When you give me a task for Cursor, format it as one clear instruction block I can paste, ending with build/commit expectations if needed.

What I need now:
