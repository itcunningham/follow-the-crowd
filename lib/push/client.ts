import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/user/currentUser";

/**
 * Thrown when the browser's PushSubscription (its `endpoint`, unique per
 * browser+push-service registration) already belongs to a DIFFERENT FTC
 * account's row — e.g. a previous account signed in on this same device
 * without a clean sign-out. `endpoint` has a DB-level unique constraint,
 * and RLS hides the other user's row from our existence check, so the
 * insert fails with 23505 even though nothing looked wrong beforehand.
 */
class PushEndpointCollisionError extends Error {
  constructor() {
    super("Push endpoint already registered to another account");
    this.name = "PushEndpointCollisionError";
  }
}

/**
 * Detect actual notification support from browser APIs
 * (not localStorage)
 */
export type NotificationState =
  | "supported"
  | "denied"
  | "granted"
  | "granted_not_subscribed"
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
    // Notification.permission is per-origin, not per FTC account. A device
    // that already granted permission for a different FTC account (or a
    // prior subscribe that never made it into push_subscriptions) still
    // reads "granted" here even though THIS account has no working push
    // subscription. Confirm the actual FTC-side row before claiming this
    // device is enabled, so we never show "enabled" when it isn't.
    return (await hasActivePushSubscriptionForCurrentUser())
      ? "granted"
      : "granted_not_subscribed";
  }

  // "default" = not yet requested
  return "prompt";
}

async function hasActivePushSubscriptionForCurrentUser(): Promise<boolean> {
  let userId: string;

  try {
    userId = await getCurrentUserId();
  } catch {
    // Not authenticated yet — nothing to report as "enabled".
    return false;
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[push] Failed to check existing subscription:", error.message);
    // Fail open to the pre-existing behaviour on a transient read error
    // rather than trapping the user in a re-enable loop.
    return true;
  }

  return Boolean(data);
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
    const msg = swError instanceof Error ? swError.message : String(swError);
    console.error("[push] Service worker registration failed:", msg);
    throw new Error(`Service worker registration failed: ${msg}`);
  }

  // Request permission
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch (permissionError) {
    const msg = permissionError instanceof Error ? permissionError.message : String(permissionError);
    console.error("[push] Permission request failed:", msg);
    throw new Error(`Permission request failed: ${msg}`);
  }

  if (permission !== "granted") {
    throw new Error("Notification permission not granted");
  }

  // Subscribe to push
  try {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      throw new Error("VAPID public key not configured in environment");
    }

    // VAPID key should be raw base64, not PEM format
    const base64 = vapidKey.trim();
    if (base64.includes("BEGIN") || base64.includes("END")) {
      throw new Error("VAPID key appears to be in PEM format, expected base64");
    }

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    if (!registration.pushManager) {
      throw new Error("pushManager not available on service worker");
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: bytes,
    });

    // Save to Supabase
    try {
      await savePushSubscription(subscription);
    } catch (saveError) {
      if (!(saveError instanceof PushEndpointCollisionError)) {
        throw saveError;
      }

      // The browser handed back a PushSubscription another account's row
      // already owns (same device, prior account never signed out). Drop
      // our stale browser-side subscription and mint a genuinely new one —
      // this is our own subscription object, so unsubscribing it is a
      // local browser operation and never touches the other account's row.
      await subscription.unsubscribe().catch(() => {});

      const freshSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: bytes,
      });

      await savePushSubscription(freshSubscription);
    }

    return true;
  } catch (subscribeError) {
    if (subscribeError instanceof PushEndpointCollisionError) {
      console.error("[push] Endpoint collision persisted after resubscribe");
      throw new Error(
        "Couldn't enable notifications on this device — it may still be linked to another account. Try turning off notification permission for Follow The Crowd in your device Settings, then reopen the app and enable notifications again.",
      );
    }

    const errorMessage = subscribeError instanceof Error ? subscribeError.message : String(subscribeError);
    console.error("[push] Failed during subscription flow:", {
      error: errorMessage,
      stack: subscribeError instanceof Error ? subscribeError.stack : undefined,
    });
    throw new Error(errorMessage);
  }
}

/**
 * Disable notifications on current device
 * SECURITY: Must delete from database FIRST while auth session is active.
 * Browser unsubscribe is best-effort and happens after.
 *
 * Shared device protection:
 * - Database row deleted while session active (RLS prevents cross-user access)
 * - Then browser unsubscribe attempted (may fail but doesn't block logout)
 * - Logout proceeds regardless of success/failure
 * - Failed database delete = subscription persists but RLS still prevents cross-user access
 * - Failed browser unsubscribe = browser still has subscription but server row deleted,
 *   so push service will reject attempts to this endpoint for this user_id
 */
export async function disableNotifications(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  let dbDeleteError: Error | null = null;
  let browserUnsubscribeError: Error | null = null;

  // Step 1: Delete from database FIRST while session is still active
  // This is the critical step for shared devices
  try {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", subscription.endpoint);

    if (error) {
      const message = (error as any).message || String(error);
      dbDeleteError = new Error(message);
      console.error("[push] Failed to delete subscription from database:", dbDeleteError);
    }
  } catch (error) {
    dbDeleteError = error instanceof Error ? error : new Error(String(error));
    console.error("[push] Failed to delete subscription from database:", dbDeleteError);
  }

  // Step 2: Unsubscribe from browser (best-effort, doesn't block cleanup)
  try {
    await subscription.unsubscribe();
  } catch (error) {
    browserUnsubscribeError = error instanceof Error ? error : new Error(String(error));
    console.error("[push] Failed to unsubscribe from browser:", browserUnsubscribeError);
  }

  // Log what happened for debugging (don't throw)
  if (dbDeleteError || browserUnsubscribeError) {
    console.warn("[push] Cleanup completed with warnings:", {
      databaseDelete: dbDeleteError ? dbDeleteError.message : "success",
      browserUnsubscribe: browserUnsubscribeError ? browserUnsubscribeError.message : "success",
    });
  }
}

/**
 * Save push subscription to Supabase
 * SECURITY: Never transfer endpoints between users. Ownership must be explicit.
 */
async function savePushSubscription(subscription: PushSubscription): Promise<void> {
  const key = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");

  if (!key || !auth) {
    throw new Error("Failed to extract push keys");
  }

  const userId = await getCurrentUserId();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const deviceName = detectDeviceName();

  // Safely convert Uint8Array to base64
  const encodeBytes = (bytes: Uint8Array): string => {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const p256dhEncoded = encodeBytes(new Uint8Array(key));
  const authEncoded = encodeBytes(new Uint8Array(auth));

  // SECURITY: Query for existing endpoint (RLS will only show this user's rows).
  // If found, update it. If not found, insert. If insert fails with unique constraint,
  // the endpoint belongs to another session/account (RLS hides other users' rows).
  const { data: existing, error: checkError } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();

  if (checkError && checkError.code !== "PGRST116") {
    // PGRST116 is "no rows returned" — that's fine
    console.error("[push] savePushSubscription: endpoint check failed", {
      code: checkError.code,
      message: checkError.message,
    });
    throw new Error(`Failed to check endpoint: ${checkError.message}`);
  }

  // If endpoint exists for this user, update it
  if (existing) {
    const { error: updateError } = await supabase
      .from("push_subscriptions")
      .update({
        p256dh: p256dhEncoded,
        auth: authEncoded,
        device_name: deviceName,
        is_active: true,
        last_used_at: new Date().toISOString(),
      })
      .eq("endpoint", subscription.endpoint)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[push] savePushSubscription: update failed", {
        code: updateError.code,
        message: updateError.message,
      });
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    return;
  }

  // Endpoint doesn't exist for this user, attempt insert
  const { error: insertError } = await supabase.from("push_subscriptions").insert({
    endpoint: subscription.endpoint,
    user_id: userId,
    p256dh: p256dhEncoded,
    auth: authEncoded,
    device_name: deviceName,
    is_active: true,
    last_used_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("[push] savePushSubscription: insert failed", {
      code: insertError.code,
      message: insertError.message,
    });
    // If unique constraint violated, endpoint belongs to another session/account
    if (insertError.code === "23505" || insertError.message.includes("duplicate key")) {
      throw new PushEndpointCollisionError();
    }
    throw new Error(`Failed to save subscription: ${insertError.message}`);
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

export type PushDiagnostics = {
  serviceWorkerRegistered: boolean;
  serviceWorkerState: ServiceWorkerState | null;
  serviceWorkerScriptUrl: string | null;
  pageControlledByServiceWorker: boolean;
  pushSubscriptionExists: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  origin: string;
  isStandalonePwa: boolean;
};

/**
 * TEMPORARY — device-side evidence for the "Apple accepted the push but the
 * iPhone never displayed it" investigation. Every field here is already
 * visible to the user in some form (permission state, install state, the
 * app's own script path/origin) or a plain boolean — never an endpoint,
 * key, or token. Remove once the investigation concludes.
 */
export async function getPushDiagnostics(): Promise<PushDiagnostics> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isStandalonePwa = isInstalledPWA();

  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return {
      serviceWorkerRegistered: false,
      serviceWorkerState: null,
      serviceWorkerScriptUrl: null,
      pageControlledByServiceWorker: false,
      pushSubscriptionExists: false,
      notificationPermission: "unsupported",
      origin,
      isStandalonePwa,
    };
  }

  const registration = await navigator.serviceWorker.getRegistration("/");
  const activeWorker = registration?.active ?? registration?.waiting ?? registration?.installing ?? null;

  let pushSubscriptionExists = false;
  if (registration) {
    try {
      pushSubscriptionExists = Boolean(await registration.pushManager.getSubscription());
    } catch {
      pushSubscriptionExists = false;
    }
  }

  return {
    serviceWorkerRegistered: Boolean(registration),
    serviceWorkerState: activeWorker?.state ?? null,
    serviceWorkerScriptUrl: activeWorker?.scriptURL ?? null,
    pageControlledByServiceWorker: Boolean(navigator.serviceWorker.controller),
    pushSubscriptionExists,
    notificationPermission: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
    origin,
    isStandalonePwa,
  };
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
