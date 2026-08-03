# Multi-agent workflow (authoritative)

**This is the single source of truth for running more than one agent on FTC at once.**
If any other document disagrees with this one, this one wins.

Read this before starting work if *any* other session, agent or human might be
touching the repository at the same time.

---

## 1. Why this exists

Multiple Claude sessions were run inside the **same** working tree. The real
failures that produced:

- One session ran `git stash` and swallowed another session's uncommitted work.
- Edits vanished, then reappeared, because two sessions wrote the same file.
- `git diff` and `git status` showed a mixture of two tasks, so neither could be
  reviewed honestly.
- Work was committed from a tree that contained someone else's half-finished
  change.
- Nobody could say with confidence what had actually reached `main`.
- A "No target" / stale deployment was mistaken for a shipped feature.

None of these are Git bugs. They are all the same bug: **two writers, one tree.**

The fix is structural, not procedural: give every writing agent its own
checkout, so a collision becomes impossible rather than merely discouraged.

---

## 2. The worktree model

```
/Users/isaaccunningham/Projects/FTC                 ← PRIMARY. Integration only.
  └── .claude/worktrees/
        ├── crew-chat-badges/                       ← agent/crew-chat-badges
        ├── run-sheet-visual-polish/                ← agent/run-sheet-visual-polish
        └── planner-calendar-perf/                  ← agent/planner-calendar-perf
```

`.claude/worktrees/` is the convention **already in use** by Claude Code's own
worktree isolation, so we formalise it rather than inventing a second location.
It is gitignored.

### The primary worktree

`/Users/isaaccunningham/Projects/FTC` on `main` is reserved for:

- merging agent branches,
- pushing `main`,
- verifying production,
- genuine emergencies (a hotfix when no agent is active).

**No implementation agent may edit files, commit, or run `git stash` here.**
It is the one tree whose state everyone trusts; keeping it boring is the point.

### Agent worktrees

Each implementation task gets:

| Thing | Value |
|---|---|
| Branch | `agent/<task-name>` |
| Directory | `.claude/worktrees/<task-name>` |
| Base | `origin/main` at creation time |
| Writable sessions | **exactly one** |

`<task-name>` is lowercase letters, digits and dashes — it names the *task*, not
the agent, so the branch is still meaningful a week later.

### One writable session per worktree

This is the rule the whole model rests on. Enforcement is by convention plus one
mechanical check:

- A worktree is **owned** by whichever session created it (`ftc-worktree.sh new`
  prints the directory it just claimed — that session owns it).
- `ftc-worktree.sh list` marks every dirty worktree
  `DIRTY — do not touch if another agent owns it`. A dirty worktree you did not
  create is somebody else's live work.
- Before you write your first file, run `git status` in **your** directory and
  confirm it is clean. A dirty tree you did not dirty means you are in the wrong
  place — stop and report, do not "tidy up".
- Read-only sessions (Reviewer, QA) may look inside any worktree. They may not
  write to one they do not own, and they never run a command that mutates state.

Git itself provides the backstop: a branch can only be checked out in one
worktree, so two agents cannot end up on the same branch by accident.

---

## 3. Roles

Roles map onto `FTC_WORKFLOW.md` §1; this section says **where** each one works.

### Implementation Agent
- Owns one task, one branch, one worktree. Writable.
- Works only inside `.claude/worktrees/<task-name>`.
- Runs `npm run build` and `npx tsx scripts/test-regressions.mts` in its own
  worktree before committing.
- Commits and pushes **its own branch**. Never pushes `main`.
- Never merges. Never touches another agent's worktree or branch.
- Reports: branch, commit hash, files changed, what it verified.

### QA Reviewer
- **Read-only.** Verifies phone/desktop parity at 390px and 1280px
  (`FTC_WORKFLOW.md` §7), behaviour, and regressions.
- May run a dev server against an agent's worktree; may not edit it.
- Reports pass/fail with evidence, not opinions.

### Security Reviewer
- **Read-only.** RLS, auth, storage policies, data exposure, secrets.
- Explicitly reviews any SQL under `scripts/*.sql` before it is applied.
- Per `FTC_WORKFLOW.md` §2, SQL changes only exist when the task asked for SQL —
  an unrequested SQL diff is itself a finding.

### Release Agent
- The **only** role that works in the primary worktree.
- Merges reviewed agent branches into `main`, pushes, verifies production.
- Resolves merge conflicts on shared files (§5).
- Follows the checklist in §8.

### Product Coordinator (ChatGPT / human)
- Writes and sequences tasks. Decides what runs in parallel (§6).
- Does not touch the repository.
- Owns the call on whether two tasks are safe to run at once — that decision
  belongs to whoever can see both tasks, which is not either agent.

---

## 4. Collision rules (hard rules)

Inside a worktree **you do not own**, never run:

- `git stash` or `git stash -u` — `-u` sweeps up untracked files, which is how
  another agent's brand-new component disappears.
- `git reset` (any mode)
- `git clean` (any flags)
- `git checkout <branch>` / `git switch` — branch switching moves the tree under
  another agent
- `git rebase`, `git merge`, `git cherry-pick`
- `rm -rf .next` while another session has a dev server running there

In **any** worktree, never:

- `git push --force` / `--force-with-lease` to `main`
- `git branch -D` (force-delete) — use `-d` and let Git refuse if unmerged
- `git worktree remove --force`
- `git add -A` or `git add .` — stage **your own files by name**, always
- commit a file you did not intentionally change

### When something unexpected appears

If `git status`, `git diff` or the file contents do not match what you did:

1. **Stop.** Do not commit, stash, reset, or "clean up".
2. Run `git status`, `git diff --stat`, and `scripts/ftc-worktree.sh list`.
3. Report exactly what you see and which worktree you are in.
4. Wait for a human decision.

A surprising diff is evidence, not mess. Destroying it destroys the only record
of what went wrong.

---

## 5. Shared files

Worktrees prevent working-tree collisions. They do **not** prevent merge
conflicts on files that every task touches. Over the last 40 commits:

| File | Touched by |
|---|---|
| `docs/handoff/CURRENT-STATE.md` | 39 / 40 commits |
| `scripts/test-regressions.mts` | 34 / 40 commits |
| `app/events/[eventId]/chat/page.tsx` | 11 |
| `app/globals.css` | 10 |
| `app/components/EventRunSheetSection.tsx` | 10 |

The first two are the collision engine. Rules:

### `scripts/test-regressions.mts`
- **Append only.** Add your new test function at the end of the file and its
  call at the end of the runner list. Do not reorder, reformat, or re-wrap
  existing tests.
- Before staging it, check what you are actually about to commit:
  ```bash
  git diff scripts/test-regressions.mts | grep '^@@'
  ```
  You should see hunks only where *your* test lives. Hunks elsewhere mean your
  branch is stale and you are about to delete somebody's test — rebase on
  `origin/main` first.

### `docs/handoff/CURRENT-STATE.md`
- Write your entry **last**, immediately before committing, in its own commit.
- Add a new entry at the top of the recent-work list. Never rewrite or
  re-summarise existing entries.
- If two branches both edited it, the Release Agent keeps **both** entries. The
  conflict resolution is always "both", never "mine".

### `app/globals.css` and shared UI primitives
(`lib/dm/*`, `app/components/chat/*`, `lib/ui/*`, design tokens)

- Adding a token or a rule is fine. **Changing an existing one is a shared-file
  change** — it must be its own task, run alone, not smuggled into a feature
  branch.

### Anything under `scripts/*.sql`
- One agent at a time, full stop. SQL is applied to a live database and cannot be
  merged.

---

## 6. What is safe to run in parallel

Two tasks are safe when their file sets do not overlap **and** neither changes a
shared primitive.

### Safe together

- Different feature areas: Crew Chat ✕ Planner Calendar ✕ Profile ✕ Discover.
- Feature work ✕ documentation-only work.
- Feature work ✕ QA/Security review (review is read-only anyway).
- Two bug fixes in unrelated route trees.

### Not safe together

- Two tasks touching the same route (`app/events/[eventId]/chat/page.tsx` is a
  repeat offender).
- Two tasks changing shared chat primitives (`lib/dm/*`,
  `app/components/chat/*`) — DM and Crew Chat share these, so "DM work" and
  "Crew Chat work" are often the *same* files.
- Any task changing `app/globals.css` design tokens alongside anything visual.
- Two tasks running SQL migrations.
- A refactor ✕ a feature in the same area. Land the refactor first.
- Anything ✕ a release. Freeze while `main` is being merged and pushed.

When in doubt: run them sequentially. The cost of serialising two tasks is
minutes. The cost of untangling two interleaved branches is an afternoon, and
the cost of silently losing work is worse.

---

## 7. Helper script

`scripts/ftc-worktree.sh` — macOS bash 3.2, no dependencies.

```bash
scripts/ftc-worktree.sh new <task-name>      # branch + worktree from origin/main
scripts/ftc-worktree.sh list                 # every worktree, branch, clean/dirty
scripts/ftc-worktree.sh remove <task-name>   # only if clean AND fully pushed
```

It is deliberately conservative and will refuse rather than guess:

- `new` fetches `origin/main` first, so every task starts from real upstream —
  not from whatever the primary tree happened to be sitting on.
- `new` refuses if the directory exists, or if the branch exists locally or on
  `origin`.
- `remove` refuses if the worktree has **uncommitted or untracked** changes, and
  prints the offending files.
- `remove` refuses if the branch has unpushed commits.
- `remove` never passes `--force`, and **never deletes a branch** — it prints the
  `git branch -d` command for you to run deliberately.
- Nothing in the script pushes, merges, resets, stashes or cleans.

`list` marks the primary worktree `[PRIMARY — integration only]` and every dirty
worktree `DIRTY — do not touch if another agent owns it`.

---

## 8. Checklists

### Start of task — Implementation Agent (copy this)

```
1. cd /Users/isaaccunningham/Projects/FTC
2. scripts/ftc-worktree.sh list          # who else is active? which are DIRTY?
3. scripts/ftc-worktree.sh new <task-name>
4. cd .claude/worktrees/<task-name>
5. git status                            # MUST be clean. If not, stop and report.
6. Read FTC_WORKFLOW.md and docs/handoff/MULTI-AGENT-WORKFLOW.md.
7. Confirm back before writing code:
     - the worktree directory I own
     - my branch name
     - the files I expect to change
     - whether any of them are shared files (see §5)
```

Then, before every commit:

```
- npm run build
- npx tsx scripts/test-regressions.mts
- git status                 # only my files, nothing unexpected
- git diff --stat            # sizes match what I actually did
- git add <files by name>    # never -A, never .
- git diff --cached --stat   # verify once more
- git commit && git push -u origin agent/<task-name>
```

### Release Agent

```
1. cd /Users/isaaccunningham/Projects/FTC        # primary
2. scripts/ftc-worktree.sh list                  # confirm no agent is mid-task
3. git status                                    # primary MUST be clean
4. git fetch origin && git checkout main && git pull --ff-only
5. git merge --no-ff agent/<task-name>
     - CURRENT-STATE.md conflict  -> keep BOTH entries
     - test-regressions.mts conflict -> keep BOTH tests
     - any other conflict -> stop, hand back to the implementing agent
6. npm run build
7. npx tsx scripts/test-regressions.mts
8. git push origin main
9. Verify the deployment is the NEW commit — check the deployed commit hash.
   "No target" or a stale hash is NOT a successful deploy.
10. Confirm docs/handoff/CURRENT-STATE.md on main reflects what shipped.
11. scripts/ftc-worktree.sh remove <task-name>   # refuses if anything is unpushed
12. git branch -d agent/<task-name>              # -d, never -D
```

---

## 9. How many agents

Three writers is the practical ceiling for this codebase, plus read-only
reviewers, which cost nothing.

Suggested ownership zones — chosen so the boundaries fall where the *files* fall,
not where the features do:

| Zone | Owns |
|---|---|
| **Messaging** | `app/dm/`, `app/group-chats/`, `app/events/[eventId]/chat/`, `lib/dm/`, `lib/eventCrewChat.ts`, `lib/groupChat*`, `app/components/chat/`, `app/components/group-chat/` |
| **Events & planning** | `app/events/`, `app/event/`, `app/(planner-workspace)/`, `lib/events/`, `lib/booking*`, `lib/calendar*`, calendar + run-sheet components |
| **Identity & discovery** | `app/profile/`, `app/onboarding/`, `app/settings/`, `app/discover/`, `app/login/`, `app/signup/`, `lib/user/`, `lib/auth/` |

DM and Crew Chat sit in **one** zone on purpose — they share primitives, so
splitting them would manufacture exactly the conflicts this document exists to
prevent.

Beyond three, the bottleneck stops being the worktrees and becomes review,
merge order, and `CURRENT-STATE.md`. Adding a fourth agent adds coordination
cost faster than it adds throughput.
