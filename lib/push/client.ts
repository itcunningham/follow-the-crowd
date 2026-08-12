import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId } from "@/lib/user/currentUser";

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
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", subscription.endpoint);
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
  const p256dhEncoded = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(key))));
  const authEncoded = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth))));

  // SECURITY: Check if this endpoint already exists before inserting/updating
  // If it belongs to another user, reject the operation (don't transfer ownership)
  const { data: existing, error: checkError } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .eq("endpoint", subscription.endpoint)
    .maybeSingle();

  if (checkError && checkError.code !== "PGRST116") {
    // PGRST116 is "no rows returned" — that's fine
    throw new Error(`Failed to check endpoint ownership: ${checkError.message}`);
  }

  // If endpoint exists and belongs to a different user, reject
  if (existing && existing.user_id !== userId) {
    throw new Error(
      "This push endpoint is already registered to another account. Cannot reuse endpoint across users."
    );
  }

  // If endpoint exists for this user, update it
  if (existing && existing.user_id === userId) {
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
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    return;
  }

  // Endpoint doesn't exist, insert new
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
