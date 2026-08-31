"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { detectNotificationState, enableNotifications, setupNotificationClickListener } from "@/lib/push/client";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/user/currentUser";

export default function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Register service worker for push notifications
    async function registerServiceWorker() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        return;
      }

      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.log("[sw] Service worker registered");
      } catch (error) {
        console.error("[sw] Failed to register service worker:", error);
      }
    }

    // A device that previously granted permission can end up with a stale
    // or mismatched subscription -- the browser silently drops/rotates its
    // PushSubscription, or a DB row goes missing -- and detectNotificationState()
    // already recognises that exact shape as "reconnect". Until now the only
    // place that state was ever checked was the Settings page, so recovery
    // required the user to notice and manually re-toggle notifications there.
    // Re-subscribing needs no user gesture once permission is already
    // "granted" (only the initial prompt does), so this silently self-heals
    // on every app launch instead. Best-effort: never surfaced to the user,
    // and the Settings page's own reconnect banner remains the fallback if
    // this can't resolve it (e.g. genuinely not signed in yet).
    async function reconcileStalePushSubscription() {
      if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
        return;
      }

      try {
        const state = await detectNotificationState();

        if (state !== "reconnect") {
          return;
        }

        // Only worth attempting once actually signed in -- otherwise
        // "reconnect" just means auth hasn't loaded yet, not a real stale
        // subscription, and enableNotifications() would fail pointlessly.
        await getCurrentUserId();
        await enableNotifications();
        console.log("[push] Silently reconciled a stale push subscription");
      } catch (error) {
        console.error("[push] Silent subscription reconcile did not complete:", error);
      }
    }

    registerServiceWorker();
    reconcileStalePushSubscription();

    // Signing in does not remount this provider: it is mounted from the root
    // layout, and the login page navigates with router.replace(), so the
    // effect above runs once per page load and never again. On a shared
    // device that leaves a real hole -- the browser keeps one
    // PushSubscription per origin, so the endpoint it holds can still be
    // owned by the account that just signed out. Without a re-check the
    // newly signed-in user receives nothing while the previous owner's
    // pushes keep landing on this device, until the next cold launch.
    // reconcile is a no-op unless the state is genuinely "reconnect", so
    // firing it again here is cheap.
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        reconcileStalePushSubscription();
      }
    });

    // Listen for navigation messages from service worker
    const unlistener = setupNotificationClickListener((link) => {
      router.push(link);
    });

    return () => {
      authSubscription.unsubscribe();
      unlistener();
    };
  }, [router]);

  return <>{children}</>;
}
