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
