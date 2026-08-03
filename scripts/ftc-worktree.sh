#!/usr/bin/env bash
#
# ftc-worktree.sh — create / list / remove isolated agent worktrees.
#
# Why this exists: two Claude sessions sharing one working tree caused stashed
# work, vanishing edits and incoherent `git status`. One worktree per agent is
# the fix. See docs/handoff/MULTI-AGENT-WORKFLOW.md for the full working model.
#
# Usage:
#   scripts/ftc-worktree.sh new <task-name>      # branch + worktree from origin/main
#   scripts/ftc-worktree.sh list                 # every worktree, branch, clean/dirty
#   scripts/ftc-worktree.sh remove <task-name>   # only if clean AND fully pushed
#
# Safety guarantees (all enforced below, none optional):
#   - never force-anything: no --force, no -D, no push
#   - refuses to remove a worktree with uncommitted OR untracked changes
#   - refuses to remove a worktree holding unpushed commits
#   - never deletes a branch (prints the command for you to run deliberately)
#   - refuses to touch the primary worktree
#
# Targets macOS's stock bash 3.2 — no associative arrays, no mapfile.

set -euo pipefail

WORKTREE_ROOT=".claude/worktrees"
BRANCH_PREFIX="agent/"

die() { printf '\nERROR: %s\n\n' "$1" >&2; exit 1; }
note() { printf '%s\n' "$1"; }

repo_root() {
  git rev-parse --show-toplevel 2>/dev/null || die "not inside a git repository"
}

# The primary worktree is the one git lists first; it must never be removed
# here, and agents must not implement in it.
primary_root() {
  git worktree list --porcelain | awk '/^worktree /{print $2; exit}'
}

validate_task_name() {
  local name="$1"
  [ -n "$name" ] || die "task name required, e.g. crew-chat-badges"
  case "$name" in
    *[!a-z0-9-]*) die "task name must be lowercase letters, digits and dashes only: '$name'" ;;
    -*|*-) die "task name must not start or end with a dash: '$name'" ;;
  esac
}

cmd_new() {
  local name="$1"
  validate_task_name "$name"

  local root branch dir
  root="$(repo_root)"
  branch="${BRANCH_PREFIX}${name}"
  dir="${root}/${WORKTREE_ROOT}/${name}"

  [ ! -e "$dir" ] || die "directory already exists: $dir"

  git -C "$root" show-ref --verify --quiet "refs/heads/${branch}" \
    && die "branch already exists locally: ${branch} (pick another name, or remove it deliberately)"

  note "Fetching origin/main…"
  git -C "$root" fetch origin main --quiet

  git -C "$root" show-ref --verify --quiet "refs/remotes/origin/${branch}" \
    && die "branch already exists on origin: ${branch}"

  mkdir -p "${root}/${WORKTREE_ROOT}"
  git -C "$root" worktree add -b "$branch" "$dir" origin/main

  local base
  base="$(git -C "$root" rev-parse --short origin/main)"

  printf '\n'
  note "Worktree ready."
  note "  branch:    ${branch}"
  note "  directory: ${dir}"
  note "  based on:  origin/main @ ${base}"
  printf '\n'
  note "Work ONLY inside that directory:"
  note "  cd ${dir}"
  printf '\n'
}

cmd_list() {
  local root primary
  root="$(repo_root)"
  primary="$(primary_root)"

  printf '\n%-34s %-30s %s\n' "DIRECTORY" "BRANCH" "STATE"
  printf '%-34s %-30s %s\n' "---------" "------" "-----"

  git -C "$root" worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r wt; do
    local_branch="$(git -C "$wt" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"

    if [ -n "$(git -C "$wt" status --porcelain 2>/dev/null)" ]; then
      state="DIRTY — do not touch if another agent owns it"
    else
      state="clean"
    fi

    if [ "$wt" = "$primary" ]; then
      state="$state  [PRIMARY — integration only]"
    fi

    printf '%-34s %-30s %s\n' "$(basename "$wt")" "$local_branch" "$state"
  done
  printf '\n'
}

cmd_remove() {
  local name="$1"
  validate_task_name "$name"

  local root branch dir primary
  root="$(repo_root)"
  branch="${BRANCH_PREFIX}${name}"
  dir="${root}/${WORKTREE_ROOT}/${name}"
  primary="$(primary_root)"

  [ -d "$dir" ] || die "no such worktree: $dir"
  [ "$dir" != "$primary" ] || die "refusing to remove the primary worktree"

  # Uncommitted OR untracked work — either means someone is mid-task.
  if [ -n "$(git -C "$dir" status --porcelain)" ]; then
    printf '\n'
    git -C "$dir" status --short
    die "worktree is DIRTY — commit or deliberately discard before removing: $dir"
  fi

  # Unpushed commits would be destroyed with the worktree's branch tip.
  local wt_branch
  wt_branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD)"
  if git -C "$root" show-ref --verify --quiet "refs/remotes/origin/${wt_branch}"; then
    local unpushed
    unpushed="$(git -C "$root" rev-list --count "origin/${wt_branch}..${wt_branch}" 2>/dev/null || echo 0)"
    [ "$unpushed" = "0" ] || die "${wt_branch} has ${unpushed} unpushed commit(s) — push before removing"
  else
    local has_commits
    has_commits="$(git -C "$root" rev-list --count "origin/main..${wt_branch}" 2>/dev/null || echo 0)"
    [ "$has_commits" = "0" ] \
      || die "${wt_branch} has ${has_commits} commit(s) and no remote branch — push it before removing"
  fi

  git -C "$root" worktree remove "$dir"

  printf '\n'
  note "Removed worktree: ${dir}"
  note "Branch ${branch} was KEPT (this script never deletes branches)."
  note "Delete it yourself once it is merged:"
  note "  git branch -d ${branch}"
  printf '\n'
}

case "${1:-}" in
  new)    shift; cmd_new "${1:-}" ;;
  list)   cmd_list ;;
  remove) shift; cmd_remove "${1:-}" ;;
  *)
    printf '%s\n' "Usage:"
    printf '%s\n' "  scripts/ftc-worktree.sh new <task-name>"
    printf '%s\n' "  scripts/ftc-worktree.sh list"
    printf '%s\n' "  scripts/ftc-worktree.sh remove <task-name>"
    printf '\n%s\n' "See docs/handoff/MULTI-AGENT-WORKFLOW.md"
    exit 1
    ;;
esac
