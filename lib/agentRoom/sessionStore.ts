/**
 * FTC Agent Room — development-only persistence.
 *
 * One JSON file per session under `.agent-room/`, which is gitignored. No
 * Supabase table, no migration, nothing that outlives a `rm -rf .agent-room`.
 *
 * Also owns the per-session execution lock. The lock is in-process, which is
 * exactly right for a single local dev server and is the whole reason two
 * clicks cannot start two provider calls against one session.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AGENT_ROOM_LIMITS } from "./config";
import type { AgentRoomSession, AgentRoomSessionSummary } from "./types";
import { toSessionSummary } from "./types";

const STORE_DIRNAME = ".agent-room";

function storeDir(): string {
  return path.join(process.cwd(), STORE_DIRNAME);
}

/** Session ids are ours, but they arrive from the URL — never trust the shape. */
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isValidSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(value);
}

function sessionPath(id: string): string {
  if (!isValidSessionId(id)) {
    throw new Error("Invalid session id.");
  }

  return path.join(storeDir(), `${id}.json`);
}

export function newSessionId(): string {
  return randomUUID();
}

export async function saveSession(session: AgentRoomSession): Promise<void> {
  await mkdir(storeDir(), { recursive: true });
  await writeFile(
    sessionPath(session.id),
    `${JSON.stringify(session, null, 2)}\n`,
    "utf8",
  );
}

export async function loadSession(
  id: string,
): Promise<AgentRoomSession | null> {
  if (!isValidSessionId(id)) {
    return null;
  }

  try {
    const raw = await readFile(sessionPath(id), "utf8");
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    return parsed as AgentRoomSession;
  } catch {
    return null;
  }
}

export async function deleteSession(id: string): Promise<boolean> {
  if (!isValidSessionId(id)) {
    return false;
  }

  const existing = await loadSession(id);

  if (!existing) {
    return false;
  }

  await rm(sessionPath(id), { force: true });
  return true;
}

export async function listSessions(): Promise<AgentRoomSessionSummary[]> {
  let entries: string[];

  try {
    entries = await readdir(storeDir());
  } catch {
    return [];
  }

  const summaries: AgentRoomSessionSummary[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".json")) {
      continue;
    }

    const session = await loadSession(entry.slice(0, -".json".length));

    if (session) {
      summaries.push(toSessionSummary(session));
    }
  }

  return summaries
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, AGENT_ROOM_LIMITS.maxSessions);
}

/* -------------------------------------------------------------------------- */
/* Per-session execution lock                                                 */
/* -------------------------------------------------------------------------- */

const locked = new Set<string>();

export function acquireSessionLock(id: string): boolean {
  if (locked.has(id)) {
    return false;
  }

  locked.add(id);
  return true;
}

export function releaseSessionLock(id: string): void {
  locked.delete(id);
}

export function isSessionLocked(id: string): boolean {
  return locked.has(id);
}

/**
 * Simple per-session rate limit: a provider call may not follow the previous
 * one faster than `minCallIntervalMs`. Returns the wait in ms, or 0 when clear.
 */
export function millisecondsUntilNextCallAllowed(
  lastCallAt: string | null,
  now: number = Date.now(),
): number {
  if (!lastCallAt) {
    return 0;
  }

  const last = Date.parse(lastCallAt);

  if (Number.isNaN(last)) {
    return 0;
  }

  const elapsed = now - last;
  const remaining = AGENT_ROOM_LIMITS.minCallIntervalMs - elapsed;

  return remaining > 0 ? remaining : 0;
}
