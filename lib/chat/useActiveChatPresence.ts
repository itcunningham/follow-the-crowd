"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

/** Must stay comfortably below push-send's own PRESENCE_TTL_MS so a
 * foregrounded, visible thread never goes stale between beats. */
const ACTIVE_CHAT_PRESENCE_HEARTBEAT_MS = 20_000;

/**
 * Reports "this user is actively viewing this exact DM/crew chat thread
 * right now" so push-send can skip a redundant external push for it. Not a
 * general presence system -- one row per user, cleared on hide/unmount/close,
 * with push-send enforcing its own freshness TTL as a backstop for whenever
 * those signals don't fire (app force-quit, network drop).
 *
 * `threadLink` must be the same bare link string createNotification() is
 * called with for this thread (e.g. `/dm/${conversationId}`), with no query
 * params -- that's what push-send compares it against.
 */
export function useActiveChatPresence(
  userId: string | null,
  threadLink: string | null,
): void {
  useEffect(() => {
    if (!userId || !threadLink) {
      return;
    }

    // Supabase's PostgrestBuilder is a *thenable*, not a promise: it only
    // issues the HTTP request when .then() is invoked. `void builder` builds
    // the query and throws it away without ever calling .then(), so the
    // request is never sent -- which is exactly why this table stayed empty in
    // production while RLS, grants and a manual upsert all checked out.
    // Calling .then() here is what actually dispatches it; the handlers only
    // exist to keep a failure visible instead of becoming an unhandled
    // rejection. Delivery correctness never depends on these landing --
    // push-send's TTL stays authoritative.
    const dispatch = (
      builder: PromiseLike<{ error: { message: string } | null }>,
      label: string,
    ) => {
      builder.then(
        ({ error }) => {
          if (error) {
            console.error(`[presence] ${label} failed:`, error.message);
          }
        },
        (error: unknown) => {
          console.error(`[presence] ${label} threw:`, error);
        },
      );
    };

    const upsertPresence = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      dispatch(
        supabase.from("active_chat_presence").upsert(
          {
            user_id: userId,
            thread_link: threadLink,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        ),
        "upsert",
      );
    };

    const clearPresence = () => {
      dispatch(supabase.from("active_chat_presence").delete().eq("user_id", userId), "clear");
    };

    upsertPresence();
    const intervalId = window.setInterval(upsertPresence, ACTIVE_CHAT_PRESENCE_HEARTBEAT_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        upsertPresence();
      } else {
        clearPresence();
      }
    }

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", clearPresence);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", clearPresence);
      clearPresence();
    };
  }, [userId, threadLink]);
}
