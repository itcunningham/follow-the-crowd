import { supabase } from "@/lib/supabaseClient";

/**
 * Detect actual notification support from browser APIs
 * (not localStorage)
 */
export type NotificationState =
  | "supported"
  | "denied"
  | "granted"
  | "prompt"
  | "unsupported"
  | "ios_not_installed";

export async function detectNotificationState(): Promise<NotificationState> {
  // Check iOS without Home Screen install
  if (isIOS() && !isInstalledPWA()) {
    return "ios_not_installed";
  }

  // Check browser support
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported";
  }

  // Check permission
  if (Notification.permission === "denied") {
    return "denied";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  // "default" = not yet requested
  return "prompt";
}

/**
 * Request notification permission and subscribe to push
 */
export async function enableNotifications(): Promise<boolean> {
  const state = await detectNotificationState();

  if (state === "unsupported") {
    throw new Error("Push notifications not supported on this device");
  }

  if (state === "ios_not_installed") {
    throw new Error("Add Follow The Crowd to your Home Screen to receive notifications");
  }

  if (state === "denied") {
    throw new Error("Notification permission denied. Reset in browser settings to enable.");
  }

  // Register service worker
  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
  } catch (swError) {
    console.error("[push] Failed to register service worker:", swError);
    throw new Error("Failed to enable notifications");
  }

  // Request permission
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch (permissionError) {
    console.error("[push] Failed to request permission:", permissionError);
    throw new Error("Failed to request notification permission");
  }

  if (permission !== "granted") {
    throw new Error("Notification permission not granted");
  }

  // Subscribe to push
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });

    // Save to Supabase
    await savePushSubscription(subscription);
    return true;
  } catch (subscribeError) {
    console.error("[push] Failed to subscribe to push:", subscribeError);
    throw new Error("Failed to enable push notifications");
  }
}

/**
 * Disable notifications on current device
 */
export async function disableNotifications(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Remove from database
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);
    }
  } catch (error) {
    console.error("[push] Failed to disable notifications:", error);
    // Best-effort: don't fail logout if push cleanup fails
  }
}

/**
 * Save push subscription to Supabase
 */
async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  const key = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");

  if (!key || !auth) {
    throw new Error("Failed to extract push keys");
  }

  const deviceName = detectDeviceName();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(key)))),
      auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth)))),
      device_name: deviceName,
      is_active: true,
      last_used_at: new Date().toISOString(),
    },
    {
      onConflict: "endpoint",
    }
  );

  if (error) {
    throw new Error(`Failed to save subscription: ${error.message}`);
  }
}

/**
 * Get current subscription if it exists
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    return null;
  }
}

/**
 * iOS detection
 */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Check if running as installed PWA
 */
function isInstalledPWA(): boolean {
  if (typeof window === "undefined") return false;

  // Method 1: Check display-mode media query
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }

  // Method 2: Safari iOS standalone mode
  if ((navigator as any).standalone === true) {
    return true;
  }

  return false;
}

/**
 * Detect device name for subscription tracking
 */
function detectDeviceName(): string {
  const ua = navigator.userAgent.toLowerCase();

  // Simplified detection
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("linux")) return "Linux";

  return "Unknown Device";
}

/**
 * Listen for navigation messages from service worker
 */
export function setupNotificationClickListener(
  onNavigate: (link: string) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data?.type === "NAVIGATE_TO" && event.data?.link) {
      onNavigate(event.data.link);
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);

  return () => {
    navigator.serviceWorker.removeEventListener("message", handler);
  };
}
