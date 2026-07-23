import type { UserRole } from "@/lib/user/currentUser";

const NAV_BADGE_CACHE_KEY = "ftc-nav-badge-counts";
const NAV_BADGE_LOCAL_CACHE_KEY = "ftc-nav-badge-counts-local";
const GIGS_PENDING_LOCAL_CACHE_KEY = "ftc-gigs-pending-count";
const MESSAGES_UNREAD_LOCAL_CACHE_KEY = "ftc-messages-unread-count";

export type NavigationBadgeCache = {
  userId: string;
  role: UserRole;
  messages: number;
  bookings: number;
  gigsPending: number;
  updatedAt: number;
};

type GigsPendingLocalCache = {
  userId: string;
  role: UserRole;
  count: number;
  updatedAt: number;
};

type MessagesUnreadLocalCache = {
  userId: string;
  role: UserRole;
  count: number;
  updatedAt: number;
};

let memoryCache: NavigationBadgeCache | null = null;
let runtimeGigsPendingCount: number | null = null;
let runtimeGigsPendingIdentity: { userId: string; role: UserRole } | null = null;
let runtimeMessagesUnreadCount: number | null = null;
let runtimeMessagesUnreadIdentity: { userId: string; role: UserRole } | null = null;
let runtimeBadgeFetchedAt = 0;

export type RuntimeNavBadgeSnapshot = NavigationBadgeCache & {
  badgesReady: boolean;
  reserveBadgeSpace: boolean;
  reserveGigsBadgeSpace: boolean;
};

let runtimeNavBadgeSnapshot: RuntimeNavBadgeSnapshot | null = null;

type WorkspaceGigsDisplaySession = {
  userId: string;
  role: UserRole;
  count: number;
};

/** Last confirmed workspace Gigs badge count for the active identity (survives route transitions). */
let workspaceGigsDisplaySession: WorkspaceGigsDisplaySession | null = null;

function matchesWorkspaceGigsDisplayIdentity(
  session: WorkspaceGigsDisplaySession,
  userId: string | null | undefined,
  role: UserRole,
): boolean {
  if (session.role !== role) {
    return false;
  }

  if (!userId?.trim()) {
    return true;
  }

  return session.userId === userId;
}

export function readWorkspaceGigsDisplaySessionCount(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number | null {
  if (!role || !workspaceGigsDisplaySession) {
    return null;
  }

  if (!matchesWorkspaceGigsDisplayIdentity(workspaceGigsDisplaySession, userId, role)) {
    return null;
  }

  return workspaceGigsDisplaySession.count;
}

export function writeWorkspaceGigsDisplaySessionCount(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
  count: number,
): void {
  if (!role) {
    return;
  }

  const resolvedUserId =
    userId?.trim() ||
    (runtimeGigsPendingIdentity?.role === role ? runtimeGigsPendingIdentity.userId : "") ||
    workspaceGigsDisplaySession?.userId ||
    "";

  if (!resolvedUserId) {
    return;
  }

  workspaceGigsDisplaySession = {
    userId: resolvedUserId,
    role,
    count: Math.max(0, Math.floor(count)),
  };
}

export function clearWorkspaceGigsDisplaySession(): void {
  workspaceGigsDisplaySession = null;
}

type WorkspaceGigsSubNavDisplayLatch = {
  userId: string;
  role: UserRole;
  count: number;
};

/** Last value shown on workspace Gigs tab — survives unrelated nav badge refreshes during tab switches. */
let workspaceGigsSubNavDisplayLatch: WorkspaceGigsSubNavDisplayLatch | null = null;

const workspaceGigsSubNavDisplayListeners = new Set<() => void>();

export function subscribeWorkspaceGigsSubNavBadgeDisplay(listener: () => void): () => void {
  workspaceGigsSubNavDisplayListeners.add(listener);
  return () => workspaceGigsSubNavDisplayListeners.delete(listener);
}

function notifyWorkspaceGigsSubNavBadgeDisplayListeners(): void {
  workspaceGigsSubNavDisplayListeners.forEach((listener) => listener());
}

function matchesWorkspaceGigsSubNavDisplayLatchIdentity(
  latch: WorkspaceGigsSubNavDisplayLatch,
  userId: string | null | undefined,
  role: UserRole,
): boolean {
  if (latch.role !== role) {
    return false;
  }

  if (!userId?.trim()) {
    return true;
  }

  return latch.userId === userId;
}

export function readWorkspaceGigsSubNavDisplayLatch(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number | null {
  if (!role || !workspaceGigsSubNavDisplayLatch) {
    return null;
  }

  if (!matchesWorkspaceGigsSubNavDisplayLatchIdentity(workspaceGigsSubNavDisplayLatch, userId, role)) {
    return null;
  }

  return workspaceGigsSubNavDisplayLatch.count;
}

export function syncWorkspaceGigsSubNavDisplayLatch(
  userId: string | null | undefined,
  role: UserRole,
  count: number,
): void {
  const resolvedUserId =
    userId?.trim() ||
    workspaceGigsSubNavDisplayLatch?.userId ||
    workspaceGigsDisplaySession?.userId ||
    runtimeGigsPendingIdentity?.userId ||
    "";

  if (!resolvedUserId) {
    return;
  }

  const normalized = Math.max(0, Math.floor(count));
  const previous = workspaceGigsSubNavDisplayLatch;

  workspaceGigsSubNavDisplayLatch = {
    userId: resolvedUserId,
    role,
    count: normalized,
  };

  if (
    !previous ||
    previous.userId !== resolvedUserId ||
    previous.role !== role ||
    previous.count !== normalized
  ) {
    notifyWorkspaceGigsSubNavBadgeDisplayListeners();
  }
}

export function clearWorkspaceGigsSubNavDisplayLatch(): void {
  workspaceGigsSubNavDisplayLatch = null;
}

function isUserRole(value: unknown): value is UserRole {
  return value === "dj" || value === "promoter" || value === "both";
}

function parseGigsPendingLocalCache(raw: string): GigsPendingLocalCache | null {
  try {
    const parsed = JSON.parse(raw) as Partial<GigsPendingLocalCache>;

    if (
      typeof parsed.userId !== "string" ||
      !parsed.userId.trim() ||
      !isUserRole(parsed.role) ||
      typeof parsed.count !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      role: parsed.role,
      count: Math.max(0, Math.floor(parsed.count)),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function parseMessagesUnreadLocalCache(raw: string): MessagesUnreadLocalCache | null {
  try {
    const parsed = JSON.parse(raw) as Partial<MessagesUnreadLocalCache>;

    if (
      typeof parsed.userId !== "string" ||
      !parsed.userId.trim() ||
      !isUserRole(parsed.role) ||
      typeof parsed.count !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      role: parsed.role,
      count: Math.max(0, Math.floor(parsed.count)),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function matchesGigsPendingIdentity(
  storedUserId: string,
  storedRole: UserRole,
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): boolean {
  if (!role || storedRole !== role) {
    return false;
  }

  if (userId && storedUserId !== userId) {
    return false;
  }

  return true;
}

export function readLocalGigsPendingCount(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number | null {
  return readLocalGigsPendingCache(userId, role)?.count ?? null;
}

export function readLocalGigsPendingCache(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): GigsPendingLocalCache | null {
  if (!role || typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(GIGS_PENDING_LOCAL_CACHE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = parseGigsPendingLocalCache(raw);
  if (!parsed || !matchesGigsPendingIdentity(parsed.userId, parsed.role, userId, role)) {
    return null;
  }

  return parsed;
}

export function writeLocalGigsPendingCount(
  userId: string,
  role: UserRole,
  count: number,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    GIGS_PENDING_LOCAL_CACHE_KEY,
    JSON.stringify({
      userId,
      role,
      count: Math.max(0, Math.floor(count)),
      updatedAt: Date.now(),
    } satisfies GigsPendingLocalCache),
  );
}

export function applyPersistedGigsPendingCount(
  userId: string,
  role: UserRole,
  count: number,
): void {
  const normalizedCount = Math.max(0, Math.floor(count));

  writeRuntimeGigsPendingCount(userId, role, normalizedCount);
  writeLocalGigsPendingCount(userId, role, normalizedCount);

  const existing = readNavigationBadgeCache(userId, role);
  if (existing) {
    writeNavigationBadgeCache({
      ...existing,
      gigsPending: normalizedCount,
      updatedAt: Date.now(),
    });
  }

  syncWorkspaceGigsSubNavDisplayLatch(userId, role, normalizedCount);
}

export function readLocalMessagesUnreadCount(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number | null {
  return readLocalMessagesUnreadCache(userId, role)?.count ?? null;
}

export function readLocalMessagesUnreadCache(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): MessagesUnreadLocalCache | null {
  if (!role || typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(MESSAGES_UNREAD_LOCAL_CACHE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = parseMessagesUnreadLocalCache(raw);
  if (!parsed || !matchesGigsPendingIdentity(parsed.userId, parsed.role, userId, role)) {
    return null;
  }

  return parsed;
}

export function writeLocalMessagesUnreadCount(
  userId: string,
  role: UserRole,
  count: number,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    MESSAGES_UNREAD_LOCAL_CACHE_KEY,
    JSON.stringify({
      userId,
      role,
      count: Math.max(0, Math.floor(count)),
      updatedAt: Date.now(),
    } satisfies MessagesUnreadLocalCache),
  );
}

export function applyPersistedMessagesUnreadCount(
  userId: string,
  role: UserRole,
  count: number,
): void {
  const normalizedCount = Math.max(0, Math.floor(count));

  writeRuntimeMessagesUnreadCount(userId, role, normalizedCount);
  writeLocalMessagesUnreadCount(userId, role, normalizedCount);

  const existing = resolveNavigationBadgeCache(userId, role);
  if (existing) {
    writeNavigationBadgeCache({
      ...existing,
      messages: normalizedCount,
      updatedAt: Date.now(),
    });
  }
}

function parseNavigationBadgeCache(raw: string): NavigationBadgeCache | null {
  try {
    const parsed = JSON.parse(raw) as Partial<NavigationBadgeCache>;

    if (
      typeof parsed.userId !== "string" ||
      !parsed.userId.trim() ||
      !isUserRole(parsed.role) ||
      typeof parsed.messages !== "number" ||
      typeof parsed.bookings !== "number" ||
      typeof parsed.gigsPending !== "number" ||
      typeof parsed.updatedAt !== "number"
    ) {
      return null;
    }

    return {
      userId: parsed.userId,
      role: parsed.role,
      messages: Math.max(0, Math.floor(parsed.messages)),
      bookings: Math.max(0, Math.floor(parsed.bookings)),
      gigsPending: Math.max(0, Math.floor(parsed.gigsPending)),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function matchesNavigationBadgeIdentity(
  storedUserId: string,
  storedRole: UserRole,
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): boolean {
  if (!role || storedRole !== role) {
    return false;
  }

  if (userId && storedUserId !== userId) {
    return false;
  }

  return true;
}

export function readLocalNavigationBadgeCache(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): NavigationBadgeCache | null {
  if (!role || typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(NAV_BADGE_LOCAL_CACHE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = parseNavigationBadgeCache(raw);
  if (!parsed || !matchesNavigationBadgeIdentity(parsed.userId, parsed.role, userId, role)) {
    return null;
  }

  return parsed;
}

export function readNavigationBadgeCache(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): NavigationBadgeCache | null {
  if (!role) {
    return null;
  }

  if (userId && memoryCache?.userId === userId && memoryCache.role === role) {
    return memoryCache;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const stored = sessionStorage.getItem(NAV_BADGE_CACHE_KEY);
  if (!stored) {
    return null;
  }

  const parsed = parseNavigationBadgeCache(stored);
  if (!parsed || !matchesNavigationBadgeIdentity(parsed.userId, parsed.role, userId, role)) {
    return null;
  }

  memoryCache = parsed;
  return parsed;
}

export function resolveNavigationBadgeCache(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): NavigationBadgeCache | null {
  return readNavigationBadgeCache(userId, role) ?? readLocalNavigationBadgeCache(userId, role);
}

export function getCachedNavMessagesCount(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number | null {
  if (!role) {
    return null;
  }

  const runtimeCount = readRuntimeMessagesUnreadCount(userId, role);
  if (runtimeCount != null) {
    return runtimeCount;
  }

  const snapshot = readRuntimeNavBadgeSnapshot(userId, role);
  if (snapshot?.badgesReady) {
    return snapshot.messages;
  }

  const localCount = readLocalMessagesUnreadCount(userId, role);
  if (localCount != null) {
    return localCount;
  }

  const cache = resolveNavigationBadgeCache(userId, role);
  return cache?.messages ?? null;
}

export function writeNavigationBadgeCache(cache: NavigationBadgeCache): void {
  memoryCache = cache;

  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(cache);
  sessionStorage.setItem(NAV_BADGE_CACHE_KEY, serialized);
  window.localStorage.setItem(NAV_BADGE_LOCAL_CACHE_KEY, serialized);
}

export function clearNavigationBadgeCache(): void {
  memoryCache = null;
  runtimeGigsPendingCount = null;
  runtimeGigsPendingIdentity = null;
  runtimeMessagesUnreadCount = null;
  runtimeMessagesUnreadIdentity = null;
  runtimeBadgeFetchedAt = 0;
  runtimeNavBadgeSnapshot = null;
  workspaceGigsDisplaySession = null;
  workspaceGigsSubNavDisplayLatch = null;

  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(NAV_BADGE_CACHE_KEY);
  window.localStorage.removeItem(NAV_BADGE_LOCAL_CACHE_KEY);
  window.localStorage.removeItem(GIGS_PENDING_LOCAL_CACHE_KEY);
  window.localStorage.removeItem(MESSAGES_UNREAD_LOCAL_CACHE_KEY);
}

export function readRuntimeNavBadgeSnapshot(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): RuntimeNavBadgeSnapshot | null {
  if (!role || runtimeNavBadgeSnapshot?.role !== role) {
    return null;
  }

  if (userId && runtimeNavBadgeSnapshot.userId !== userId) {
    return null;
  }

  return runtimeNavBadgeSnapshot;
}

export function writeRuntimeNavBadgeSnapshot(snapshot: RuntimeNavBadgeSnapshot): void {
  runtimeNavBadgeSnapshot = snapshot;
  runtimeGigsPendingIdentity = { userId: snapshot.userId, role: snapshot.role };
  runtimeGigsPendingCount = snapshot.gigsPending;
}

export function readRuntimeGigsPendingCount(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number | null {
  if (!role || runtimeGigsPendingIdentity?.role !== role) {
    return null;
  }

  if (userId && runtimeGigsPendingIdentity.userId !== userId) {
    return null;
  }

  return runtimeGigsPendingCount;
}

export function writeRuntimeGigsPendingCount(
  userId: string,
  role: UserRole,
  count: number,
): void {
  runtimeGigsPendingIdentity = { userId, role };
  runtimeGigsPendingCount = Math.max(0, Math.floor(count));
}

export function readRuntimeMessagesUnreadCount(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number | null {
  if (!role || runtimeMessagesUnreadIdentity?.role !== role) {
    return null;
  }

  if (userId && runtimeMessagesUnreadIdentity.userId !== userId) {
    return null;
  }

  return runtimeMessagesUnreadCount;
}

export function writeRuntimeMessagesUnreadCount(
  userId: string,
  role: UserRole,
  count: number,
): void {
  runtimeMessagesUnreadIdentity = { userId, role };
  runtimeMessagesUnreadCount = Math.max(0, Math.floor(count));
}

export function readRuntimeBadgeFetchedAt(): number {
  return runtimeBadgeFetchedAt;
}

export function writeRuntimeBadgeFetchedAt(fetchedAt: number): void {
  runtimeBadgeFetchedAt = fetchedAt;
}

export function getCachedGigsPendingCount(
  userId: string | null | undefined,
  role: UserRole | null | undefined,
): number | null {
  if (!role) {
    return null;
  }

  const localGigsCount = readLocalGigsPendingCount(userId, role);
  const runtimeCount = readRuntimeGigsPendingCount(userId, role);

  if (runtimeCount != null) {
    if (runtimeCount === 0) {
      if (localGigsCount != null && localGigsCount > 0) {
        return localGigsCount;
      }

      const latchedCount = readWorkspaceGigsSubNavDisplayLatch(userId, role);
      if (latchedCount != null && latchedCount > 0) {
        return latchedCount;
      }

      const sessionCount = readWorkspaceGigsDisplaySessionCount(userId, role);
      if (sessionCount != null && sessionCount > 0) {
        return sessionCount;
      }
    }

    return runtimeCount;
  }

  if (localGigsCount != null) {
    return localGigsCount;
  }

  const sessionCache = readNavigationBadgeCache(userId, role);
  if (sessionCache) {
    return sessionCache.gigsPending;
  }

  return null;
}
