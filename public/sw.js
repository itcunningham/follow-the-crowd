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
 */
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.error('[sw] Received push with no data');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (parseError) {
    console.error('[sw] Failed to parse push payload:', parseError);
    return;
  }

  // Validate required fields
  if (!payload.title) {
    console.error('[sw] Push missing title:', payload);
    return;
  }

  const options = {
    body: payload.body || '',
    badge: '/icon-192.png',
    icon: '/icon-192.png',
    tag: payload.link || 'notification', // Tag prevents duplicates
    data: {
      link: payload.link || '/', // Internal app link
      notificationId: payload.notificationId,
    },
    // Require user interaction (security: don't auto-open external URLs)
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
      .catch((notificationError) => {
        console.error('[sw] Failed to show notification:', notificationError);
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
      // Focus and navigate
      await client.focus();
      // Send message to navigate (if needed)
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
 */
function isInternalLink(link) {
  if (!link) return false;

  // Allow absolute paths
  if (link.startsWith('/')) {
    // Reject if it contains :// (external URL)
    return !link.includes('://');
  }

  // Reject everything else (protocols, external hosts)
  return false;
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
