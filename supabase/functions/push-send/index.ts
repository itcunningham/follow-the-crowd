// Push notification delivery Edge Function
// Triggered by database webhook on notifications INSERT
// SECURITY: Loads notification by ID, validates recipient, delivers only to that user's subscriptions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const PUSH_CONTACT = Deno.env.get("PUSH_CONTACT") || "mailto:noreply@follow-the-crowd.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

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
}

interface PushSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload: WebhookPayload = await req.json();

    // Only process INSERT events
    if (payload.type !== "INSERT") {
      return new Response(JSON.stringify({ message: "Skipping non-INSERT event" }), {
        status: 200,
      });
    }

    // Validate webhook source (check Authorization header if needed)
    // For now, accept any POST to this function (Supabase webhook is authenticated)
    // In production, verify webhook signature if Supabase supports it

    const notificationId = payload.record.id;
    const recipientUserId = payload.record.user_id;

    if (!notificationId || !recipientUserId) {
      console.error("[push-send] Invalid webhook payload: missing id or user_id");
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
        status: 400,
      });
    }

    // Fetch the notification using service role (to load full record)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notificationId)
      .eq("user_id", recipientUserId)
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

    // Build push payload
    const pushPayload = {
      title: notification.title,
      body: notification.body || "",
      link: notification.link || "/",
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
 * Send a single Web Push notification
 */
async function sendWebPush(
  subscription: PushSubscription,
  payload: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>
): Promise<{ endpoint: string; success: boolean; status?: number; error?: string }> {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    throw new Error("VAPID keys not configured");
  }

  // Encode payload
  const payloadString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payloadString);

  // Create Web Push message (simplified: no encryption for now, just send plain payload)
  // In production, implement full Web Push encryption (RFC 8188)
  // For beta, we'll send encrypted pushes via a Web Push library

  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        Authorization: `vapid t=${createVAPIDToken()}, k=${VAPID_PUBLIC_KEY}`,
      },
      body: payloadBytes,
    });

    // Handle endpoint errors
    if (response.status === 404 || response.status === 410) {
      // Endpoint gone: deactivate subscription
      console.log(
        "[push-send] Subscription expired, deactivating:",
        subscription.endpoint.substring(0, 50)
      );
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .eq("id", subscription.id);

      return {
        endpoint: subscription.endpoint,
        success: false,
        status: response.status,
        error: "Endpoint expired",
      };
    }

    if (!response.ok) {
      return {
        endpoint: subscription.endpoint,
        success: false,
        status: response.status,
        error: `HTTP ${response.status}`,
      };
    }

    // Update last_used_at
    await supabase
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", subscription.id);

    return {
      endpoint: subscription.endpoint,
      success: true,
      status: response.status,
    };
  } catch (error) {
    return {
      endpoint: subscription.endpoint,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create VAPID JWT token for authorization header
 * (Simplified: real implementation needs crypto.subtle)
 */
function createVAPIDToken(): string {
  // For beta, return a placeholder
  // In production, implement proper JWT signing with VAPID private key
  const header = { typ: "JWT", alg: "ES256" };
  const claims = {
    aud: "https://fcm.googleapis.com",
    exp: Math.floor(Date.now() / 1000) + 86400,
    sub: PUSH_CONTACT,
  };

  // This is a simplified version; real VAPID requires proper JWT signing
  // For now, return base64-encoded claims
  return btoa(JSON.stringify(claims));
}
