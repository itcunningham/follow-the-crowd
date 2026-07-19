<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Session handoff

For new chats or lost context, read `docs/handoff/` first (start with `README.md` and `USER-PREFERENCES.md`).

# Handoff on task completion

When you finish a shipped task, update `docs/handoff/` per `docs/handoff/HANDOFF-UPDATE.md` (at minimum `CURRENT-STATE.md`). Mention updated handoff files in your summary.

# Phone / desktop parity (permanent)

Every UI, loading, or navigation change must pass **390px** and **1280px** verification with behavioural parity. Authoritative rule: `FTC_WORKFLOW.md` §7.

# Pre-code decision ladder

Before writing code, walk this ladder top to bottom and **stop at the first rung that holds**. Do not drop to a lower rung unless the higher rung does not apply.

1. **Does this need to exist?** → No: skip it.
2. **Already in this codebase?** → Reuse it; do not duplicate.
3. **Stdlib does it?** → Use stdlib.
4. **Native platform feature?** → Use it (Next.js, Supabase client, browser APIs).
5. **Installed dependency?** → Use an existing package from `package.json`.
6. **One line?** → One line — no wrapper, helper, or abstraction.
7. **Only then:** the minimum that works.

Do not add packages, files, or helpers when a higher rung already solves the problem.
<!-- END:nextjs-agent-rules -->
