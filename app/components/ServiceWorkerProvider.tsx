"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setupNotificationClickListener } from "@/lib/push/client";

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

    registerServiceWorker();

    // Listen for navigation messages from service worker
    const unlistener = setupNotificationClickListener((link) => {
      router.push(link);
    });

    return unlistener;
  }, [router]);

  return <>{children}</>;
}
