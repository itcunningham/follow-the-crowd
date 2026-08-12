"use client";

import { useEffect, useState } from "react";
import { detectNotificationState, enableNotifications, disableNotifications } from "@/lib/push/client";

type NotificationState = "supported" | "denied" | "granted" | "prompt" | "unsupported" | "ios_not_installed";

export default function PushNotificationsSection() {
  const [state, setState] = useState<NotificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect current state on mount and when window regains focus
  useEffect(() => {
    async function checkState() {
      setLoading(true);
      setError(null);
      try {
        const currentState = await detectNotificationState();
        setState(currentState);
      } catch (checkError) {
        console.error("[push-settings] Failed to detect state:", checkError);
        setState("unsupported");
      } finally {
        setLoading(false);
      }
    }

    checkState();

    // Recheck when window regains focus (permissions might have changed)
    const handleFocus = () => {
      void checkState();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  async function handleEnable() {
    setEnabling(true);
    setError(null);

    try {
      await enableNotifications();
      setState("granted");
    } catch (enableError) {
      console.error("[push-settings] Failed to enable:", enableError);
      setError(
        enableError instanceof Error ? enableError.message : "Failed to enable notifications"
      );
      // Re-check state in case permission was denied
      const newState = await detectNotificationState();
      setState(newState);
    } finally {
      setEnabling(false);
    }
  }

  async function handleDisable() {
    setDisabling(true);
    setError(null);

    try {
      await disableNotifications();
      setState("prompt");
    } catch (disableError) {
      console.error("[push-settings] Failed to disable:", disableError);
      setError("Failed to disable notifications");
    } finally {
      setDisabling(false);
    }
  }

  // Render states
  if (loading) {
    return (
      <section className="ftc-card overflow-hidden p-0">
        <div className="border-b border-ftc-border-subtle px-4 py-3 sm:px-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ftc-primary">
            Notifications
          </h2>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <p className="text-sm text-ftc-text-muted">Loading notification settings...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="ftc-card overflow-hidden p-0">
      <div className="border-b border-ftc-border-subtle px-4 py-3 sm:px-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ftc-primary">
          Notifications
        </h2>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {state === "unsupported" && (
          <div className="rounded-lg bg-ftc-surface px-3 py-2 text-sm text-ftc-text-muted">
            <p>Push notifications are not supported on this device or browser.</p>
          </div>
        )}

        {state === "ios_not_installed" && (
          <div className="space-y-3">
            <div className="rounded-lg bg-ftc-surface px-3 py-2 text-sm text-ftc-text">
              <p className="font-semibold text-ftc-primary mb-2">📱 Enable notifications</p>
              <p className="text-ftc-text-muted">
                Add Follow The Crowd to your Home Screen to receive push notifications for messages and bookings.
              </p>
              <ol className="mt-3 space-y-1 text-xs text-ftc-text-muted list-decimal list-inside">
                <li>Tap the Share button (iOS)</li>
                <li>Tap "Add to Home Screen"</li>
                <li>Tap "Add"</li>
                <li>Launch the app from your Home Screen</li>
                <li>Return here to enable notifications</li>
              </ol>
            </div>
          </div>
        )}

        {state === "denied" && (
          <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <p className="font-semibold mb-1">Notifications disabled</p>
            <p className="text-xs">
              You've blocked notifications for this app. To re-enable them:
            </p>
            <ol className="mt-2 space-y-1 text-xs list-decimal list-inside">
              <li>Open your browser settings</li>
              <li>Find "Follow The Crowd" in notification permissions</li>
              <li>Change to "Allow"</li>
            </ol>
          </div>
        )}

        {state === "prompt" && (
          <div className="space-y-3">
            <p className="text-sm text-ftc-text-muted">
              Get push notifications for messages, booking requests, and event updates.
            </p>
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={enabling}
              className="rounded-xl border border-ftc-border-subtle bg-ftc-surface px-4 py-3 text-sm font-semibold text-ftc-primary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enabling ? "Enabling..." : "Enable notifications"}
            </button>
          </div>
        )}

        {state === "granted" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-ftc-primary">
              <span className="text-lg">✓</span>
              <span>Notifications enabled on this device</span>
            </div>
            <button
              type="button"
              onClick={() => void handleDisable()}
              disabled={disabling}
              className="rounded-xl border border-ftc-border-subtle bg-ftc-surface px-4 py-3 text-sm font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {disabling ? "Disabling..." : "Disable notifications on this device"}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}
