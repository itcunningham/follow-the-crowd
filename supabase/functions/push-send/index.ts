// Push notification delivery Edge Function
// Triggered by database webhook on notifications INSERT
// SECURITY: Validates webhook secret, loads notification by ID, validates recipient,
// delivers only to that user's subscriptions using encrypted Web Push

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "npm:web-push@3.6.7";

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const PUSH_CONTACT = Deno.env.get("PUSH_CONTACT") || "mailto:noreply@follow-the-crowd.app";
const PUSH_WEBHOOK_SECRET = Deno.env.get("PUSH_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// A recipient's client refreshes its active_chat_presence row every 20s
// while a thread is mounted and visible (see lib/chat/useActiveChatPresence.ts).
// This must stay comfortably above that heartbeat so a genuinely-open thread
// never goes stale between beats, while still being short enough that a
// backgrounded/closed app (which can't reliably clear its own row on the way
// out) stops suppressing pushes soon after.
const PRESENCE_TTL_MS = 45_000;

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  record: {
    id: string;
    user_id: string;
    type: string;
    title: string;
    body?: string;
    link?: string;
  };
  schema: string;
  table: string;
  created_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  message_id?: string;
}

interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req) => {
  // SECURITY: Webhook authentication must happen BEFORE any privileged operations

  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Validate webhook secret header
  const providedSecret = req.headers.get("x-push-webhook-secret");
  if (!PUSH_WEBHOOK_SECRET || !providedSecret) {
    console.error("[push-send] Webhook authentication failed: missing secret");
    return new Response("Unauthorized", { status: 401 });
  }

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeEqual(providedSecret, PUSH_WEBHOOK_SECRET)) {
    console.error("[push-send] Webhook authentication failed: invalid secret");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Validate webhook structure BEFORE trusting any data
    if (!payload || typeof payload !== "object") {
      console.error("[push-send] Invalid webhook payload: not an object");
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
    }

    // Only process INSERT events from the notifications table
    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ message: "Skipping non-INSERT event" }), {
        status: 200,
      });
    }

    if (payload.schema !== "public" || payload.table !== "notifications") {
      console.error(
        "[push-send] Webhook from unexpected table",
        payload.schema,
        payload.table
      );
      return new Response(JSON.stringify({ error: "Invalid table" }), { status: 400 });
    }

    // Extract notification ID from webhook (only use the ID from the hook)
    const notificationId = payload.record?.id;

    if (!notificationId || typeof notificationId !== "string" || !notificationId.trim()) {
      console.error("[push-send] Invalid webhook payload: missing or invalid id");
      return new Response(JSON.stringify({ error: "Invalid notification id" }), {
        status: 400,
      });
    }

    // SECURITY: Fetch the FULL notification from database using service role
    // Never trust caller-supplied user_id, title, body, or link
    // The webhook payload may contain this data, but we load fresh from DB to verify
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .single();

    if (fetchError || !notification) {
      console.error(
        "[push-send] Failed to fetch notification:",
        notificationId,
        fetchError
      );
      // Best-effort: don't fail webhook if notification not found
      return new Response(JSON.stringify({ error: "Notification not found" }), {
        status: 200,
      });
    }

    const recipientUserId = notification.user_id;
    if (!recipientUserId || typeof recipientUserId !== "string") {
      console.error("[push-send] Notification has invalid user_id:", notificationId);
      return new Response(
        JSON.stringify({ error: "Invalid notification user_id" }),
        { status: 400 }
      );
    }

    // Redundant to push a chat message the recipient is already looking at.
    // Scoped to type "message" only (real DM/crew chat messages) -- never to
    // booking/reaction/system notifications, even when one happens to share
    // a message notification's link. Best-effort: any failure here must fall
    // through to a normal send, never block delivery.
    if (notification.type === "message" && notification.link) {
      try {
        const { data: presence } = await supabase
          .from("active_chat_presence")
          .select("thread_link, updated_at")
          .eq("user_id", recipientUserId)
          .maybeSingle();

        if (presence && presence.thread_link === notification.link) {
          const ageMs = Date.now() - new Date(presence.updated_at).getTime();
          if (ageMs <= PRESENCE_TTL_MS) {
            console.log(
              "[push-send] Suppressing push: recipient actively viewing",
              notification.link
            );
            return new Response(
              JSON.stringify({ message: "Suppressed: recipient active in thread" }),
              { status: 200 }
            );
          }
        }
      } catch (presenceError) {
        console.error("[push-send] Presence check failed, sending push anyway:", presenceError);
      }
    }

    // Fetch active subscriptions for this user
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", recipientUserId)
      .eq("is_active", true);

    if (subsError) {
      console.error(
        "[push-send] Failed to fetch subscriptions for user:",
        recipientUserId,
        subsError
      );
      // Best-effort: return success even if we can't find subscriptions
      return new Response(JSON.stringify({ message: "No subscriptions found" }), {
        status: 200,
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[push-send] No active subscriptions for user:", recipientUserId);
      return new Response(JSON.stringify({ message: "No subscriptions to deliver to" }), {
        status: 200,
      });
    }

    // Deep-link straight to the triggering chat message when one exists.
    // The stored notification.link stays a bare path (an exact-match lookup
    // elsewhere depends on that), so the message id is appended only here,
    // in the outbound push payload.
    const baseLink = notification.link || "/";
    const link = notification.message_id
      ? `${baseLink}${baseLink.includes("?") ? "&" : "?"}message=${encodeURIComponent(notification.message_id)}`
      : baseLink;

    // Build push payload
    const pushPayload = {
      title: notification.title,
      body: notification.body || "",
      link,
      notificationId: notification.id,
    };

    // Deliver to all subscriptions
    const results = [];
    for (const sub of subscriptions) {
      try {
        const result = await sendWebPush(
          sub as PushSubscription,
          pushPayload,
          supabase
        );
        results.push(result);
      } catch (sendError) {
        console.error(
          "[push-send] Failed to send to endpoint:",
          (sub as PushSubscription).endpoint.substring(0, 50),
          sendError
        );
        results.push({
          endpoint: (sub as PushSubscription).endpoint,
          success: false,
          error: sendError instanceof Error ? sendError.message : String(sendError),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(
      `[push-send] Delivered notification ${notificationId} to ${successCount}/${subscriptions.length} devices`
    );

    return new Response(
      JSON.stringify({
        notificationId,
        recipientUserId,
        delivered: successCount,
        total: subscriptions.length,
        results,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("[push-send] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 }
    );
  }
});

/**
 * Send a single Web Push notification using RFC 8188 encryption
 */
async function sendWebPush(
  subscription: PushSubscription,
  payload: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>
): Promise<{ endpoint: string; success: boolean; status?: number; error?: string }> {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    throw new Error("VAPID keys not configured");
  }

  // Decode subscription keys from base64
  const p256dhBytes = new Uint8Array(atob(subscription.p256dh).split("").map((c) => c.charCodeAt(0)));
  const authBytes = new Uint8Array(atob(subscription.auth).split("").map((c) => c.charCodeAt(0)));

  const payloadString = JSON.stringify(payload);

  // Use web-push library for RFC 8188 encryption and VAPID signing
  try {
    // web-push.sendNotification handles:
    // - VAPID JWT signing with private key
    // - RFC 8188 payload encryption (AES-128-GCM)
    // - Correct Authorization header format
    // - Dynamic aud based on endpoint origin
    const result = await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      payloadString,
      {
        vapidDetails: {
          subject: PUSH_CONTACT,
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: VAPID_PRIVATE_KEY,
        },
      }
    );

    // Handle endpoint errors
    if (result.statusCode === 404 || result.statusCode === 410) {
      console.log(
        "[push-send] Subscription expired, deactivating:",
        subscription.endpoint.substring(0, 50)
      );
      const { error: deactivateError } = await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .eq("id", subscription.id);

      if (deactivateError) {
        console.error("[push-send] Failed to deactivate expired subscription:", deactivateError);
      }

      return {
        endpoint: subscription.endpoint,
        success: false,
        status: result.statusCode,
        error: "Endpoint expired",
      };
    }

    if (result.statusCode >= 400) {
      return {
        endpoint: subscription.endpoint,
        success: false,
        status: result.statusCode,
        error: `Push service error ${result.statusCode}`,
      };
    }

    // Update last_used_at
    const { error: updateError } = await supabase
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", subscription.id);

    if (updateError) {
      console.error("[push-send] Failed to update last_used_at:", updateError);
    }

    return {
      endpoint: subscription.endpoint,
      success: true,
      status: result.statusCode,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Log detailed error for debugging
    if (errorMessage.includes("404") || errorMessage.includes("410")) {
      console.log(
        "[push-send] Subscription expired (from error), deactivating:",
        subscription.endpoint.substring(0, 50)
      );
      const { error: deactivateError } = await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .eq("id", subscription.id);

      if (deactivateError) {
        console.error("[push-send] Failed to deactivate expired subscription:", deactivateError);
      }
    }

    return {
      endpoint: subscription.endpoint,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
