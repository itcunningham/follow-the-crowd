// Service Worker for Follow The Crowd
// Handles push notifications and offline support

const CACHE_NAME = 'ftc-v1';
const PUSH_CLICK_TIMEOUT = 3000; // Wait 3s for tab focus before opening new window

/**
 * Install: pre-cache critical assets (optional for beta)
 */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

/**
 * Activate: claim all clients
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Push: receive and display notification
 *
 * By the time a `push` event fires, the push service has already delivered
 * the message — there is no later chance to show it. Every code path below
 * MUST reach showNotification(), even for an empty or malformed payload:
 * silently returning here is indistinguishable, from the device, between
 * "no push arrived" and "a push arrived but we dropped it," and cannot be
 * debugged without a paired server-side log.
 */
self.addEventListener('push', (event) => {
  let payload = null;
  let payloadError = null;

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (parseError) {
      payloadError = parseError;
    }
  }

  if (!event.data) {
    console.warn('[sw] Push event had no data');
  } else if (payloadError) {
    console.warn('[sw] Failed to parse push payload:', payloadError);
  } else if (!payload || typeof payload.title !== 'string' || !payload.title.trim()) {
    // Keys only -- the payload body carries the message preview text, and a
    // malformed-payload warning is no reason to write someone's DM into a
    // console log. The field names are what actually diagnose this.
    console.warn('[sw] Push payload missing a usable title. Fields:', Object.keys(payload || {}));
  }

  const title =
    payload && typeof payload.title === 'string' && payload.title.trim()
      ? payload.title
      : 'Follow The Crowd';
  const body = payload && typeof payload.body === 'string' ? payload.body : '';
  const link = payload && typeof payload.link === 'string' ? payload.link : '/';
  const notificationId = payload && typeof payload.notificationId === 'string'
    ? payload.notificationId
    : undefined;

  const options = {
    body,
    badge: '/icon-192.png',
    icon: '/icon-192.png',
    tag: link || 'notification', // Collapses repeats from the same thread
    // `tag` on its own makes every notification after the first in a thread
    // REPLACE the previous one silently — no sound, no vibration, and on
    // Android no heads-up banner, so the second message onwards only ever
    // materialises in the tray. `renotify` re-alerts on replace, which is
    // what makes a follow-up message surface the way the first one did.
    // Requires `tag` to be set or Chrome throws a TypeError; it always is,
    // via the `|| 'notification'` fallback above.
    renotify: true,
    data: {
      link, // Internal app link
      notificationId,
    },
    // Require user interaction (security: don't auto-open external URLs)
    requireInteraction: false,
    // Deliberately never marked silent — that suppresses sound and
    // vibration and drops the notification into a low-importance channel on
    // Android, which looks identical to the tag/renotify bug described above.
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .catch((notificationError) => {
        // This handler's whole contract is that every path surfaces
        // something -- but it was only honoured for a bad PAYLOAD, not for a
        // bad DISPLAY. Chrome rejects showNotification's promise for an
        // option it dislikes rather than throwing synchronously, so a single
        // unsupported or malformed field in `options` silently costs the
        // entire notification, and the swallowed rejection looks exactly
        // like the push never arriving. Retry with the barest thing the API
        // accepts -- title and body, no tag, renotify, icon, badge or data.
        // A notification that appears without an icon is the visible signal
        // that an option is at fault, and the user still gets told.
        console.error('[sw] showNotification failed, retrying minimal:', notificationError);
        return self.registration
          .showNotification(title, { body })
          .catch((fallbackError) => {
            console.error('[sw] Minimal showNotification also failed:', fallbackError);
          });
      })
  );
});

/**
 * Notification click: open/focus the app and navigate to link
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const link = event.notification.data?.link || '/';

  // Security: only allow internal app routes
  if (!isInternalLink(link)) {
    console.error('[sw] Rejecting external link from push:', link);
    return;
  }

  event.waitUntil(
    handleNotificationClick(link)
  );
});

/**
 * Try to focus existing Follow The Crowd tab, or open new window
 */
async function handleNotificationClick(link) {
  const clientList = await self.clients.matchAll({ type: 'window' });

  // Look for an existing FTC tab
  for (const client of clientList) {
    // Check if the client's URL is our app origin
    if (isOurOrigin(client.url)) {
      // Navigate the existing window from here, rather than asking the page
      // to navigate itself.
      //
      // postMessage only works if the page has already mounted and attached
      // its listener (ServiceWorkerProvider -> setupNotificationClickListener).
      // On an iOS cold resume that is not true: iOS restores the PWA onto
      // whatever URL it was last on and fires notificationclick before React
      // hydrates, so the message lands with no listener and is dropped
      // silently. The user sees the app sitting on the old page -- and when
      // that old page is the very chat the push was about, it looks exactly
      // like "the deep link opened the right chat but ignored the message",
      // which is how this shipped broken twice.
      if (typeof client.navigate === 'function') {
        try {
          const navigated = await client.navigate(link);
          await (navigated || client).focus();
          return;
        } catch (navigateError) {
          // navigate() rejects for uncontrolled clients and is restricted in
          // some browsers -- fall through to the postMessage path below.
          console.warn('[sw] client.navigate failed, falling back to postMessage:', navigateError);
        }
      }

      await client.focus();
      client.postMessage({ type: 'NAVIGATE_TO', link });
      return;
    }
  }

  // No existing tab: open new window at link
  if (self.clients.openWindow) {
    await self.clients.openWindow(link);
  }
}

/**
 * Security: only allow internal app routes
 * Must reject: //evil.com, http://, javascript:, data:, vbscript:, encoded attacks
 */
function isInternalLink(link) {
  // Null/undefined is safe—defaults to home
  if (!link) return true;

  // Must be a string
  if (typeof link !== 'string') return false;

  const trimmed = link.trim();

  // Empty string is safe—defaults to home
  if (trimmed === '') return true;

  // Reject protocol-relative URLs (//evil.com)
  if (trimmed.startsWith('//')) return false;

  // Reject absolute URLs with protocol (http://, https://, ftp://, etc.)
  if (trimmed.includes('://')) return false;

  // Reject javascript: and other pseudo-protocol attacks
  if (trimmed.toLowerCase().startsWith('javascript:')) return false;
  if (trimmed.toLowerCase().startsWith('data:')) return false;
  if (trimmed.toLowerCase().startsWith('vbscript:')) return false;

  // Only allow absolute paths starting with /
  if (!trimmed.startsWith('/')) return false;

  // Reject encoded/escaped protocol attempts (%2F%2F, etc.)
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded !== trimmed) {
      if (decoded.startsWith('//') || decoded.includes('://')) {
        return false;
      }
      if (decoded.toLowerCase().startsWith('javascript:')) {
        return false;
      }
    }
  } catch (e) {
    // Malformed URI encoding—reject it
    return false;
  }

  return true;
}

/**
 * Check if URL belongs to this app
 */
function isOurOrigin(url) {
  try {
    const urlObj = new URL(url);
    const origin = new URL(self.location).origin;
    return urlObj.origin === origin;
  } catch (e) {
    return false;
  }
}
