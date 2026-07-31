const DM_CHAT_SCROLL_STORAGE_PREFIX = "ftc-dm-chat-scroll:";
const DM_CHAT_SCROLL_MAX_AGE_MS = 30 * 60 * 1000;
export const DM_CHAT_SCROLL_RESTORE_PARAM = "restoreScroll";

type DmChatScrollSnapshot = {
  scrollTop: number;
  savedAt: number;
};

function getStorageKey(conversationId: string): string {
  return `${DM_CHAT_SCROLL_STORAGE_PREFIX}${conversationId}`;
}

/** Marks an in-chat return URL as eligible to restore its saved message-list position. */
export function buildDmChatScrollRestoreHref(pathname: string, search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.set(DM_CHAT_SCROLL_RESTORE_PARAM, "1");
  const query = params.toString();

  return query ? `${pathname}?${query}` : pathname;
}

export function shouldRestoreDmChatScroll(searchValue: string | null | undefined): boolean {
  return searchValue === "1";
}

/** Query param carrying a fresh per-navigation marker — see buildDmChatFreshOpenHref. */
export const DM_CHAT_FRESH_OPEN_PARAM = "openedAt";

/**
 * Stamps a href with a fresh, per-click marker so a normal DM open reliably
 * re-evaluates the initial scroll-to-bottom even when this exact conversation
 * (and its `useChatScroll`/`loadConversationData` state) may still be around
 * from an earlier visit in the same session — App Router client-side
 * navigation is not guaranteed to give every entry a brand-new component
 * instance. Distinct from `restoreScroll`: this always forces a fresh
 * "land on newest" evaluation, it never restores a saved position.
 */
export function buildDmChatFreshOpenHref(href: string): string {
  const [path, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  params.set(DM_CHAT_FRESH_OPEN_PARAM, Date.now().toString(36));

  return `${path}?${params.toString()}`;
}

export function saveDmChatScrollPosition(conversationId: string, scrollTop: number): void {
  if (typeof window === "undefined" || !conversationId.trim()) {
    return;
  }

  const payload: DmChatScrollSnapshot = {
    scrollTop: Math.max(0, scrollTop),
    savedAt: Date.now(),
  };

  sessionStorage.setItem(getStorageKey(conversationId), JSON.stringify(payload));
}

export function consumeDmChatScrollPosition(conversationId: string): number | null {
  if (typeof window === "undefined" || !conversationId.trim()) {
    return null;
  }

  const raw = sessionStorage.getItem(getStorageKey(conversationId));

  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(getStorageKey(conversationId));

  try {
    const parsed = JSON.parse(raw) as Partial<DmChatScrollSnapshot>;
    const scrollTop = parsed.scrollTop;
    const savedAt = parsed.savedAt;

    if (typeof scrollTop !== "number" || !Number.isFinite(scrollTop)) {
      return null;
    }

    if (typeof savedAt === "number" && Date.now() - savedAt > DM_CHAT_SCROLL_MAX_AGE_MS) {
      return null;
    }

    return Math.max(0, scrollTop);
  } catch {
    return null;
  }
}
