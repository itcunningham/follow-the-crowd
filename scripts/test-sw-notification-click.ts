// @ts-nocheck
// Real-device QA (round 9) found fresh pushes still opening the chat at the
// bottom, even though the database row, push-send's payload link, sw.js's
// notification data, and every client-side scroll path were each proven
// correct in isolation.
//
// The break was between the last two: notificationclick's existing-client
// branch handed the targeted link to the PAGE via postMessage, and relied on
// the page having already mounted ServiceWorkerProvider's listener. On an iOS
// cold resume it has not -- iOS restores the PWA onto its previous URL and
// fires notificationclick before React hydrates, so the message is dropped
// with no error. When the restored page is the same chat the push was about,
// the symptom is indistinguishable from "the deep link worked but didn't
// scroll", which is why two rounds of source review missed it.
//
// These tests execute the REAL public/sw.js against fake clients and assert
// the full targeted link (query string included) reaches the browser on both
// paths -- the existing-client path and the closed-app openWindow path.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SW_SOURCE = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

const ORIGIN = "https://follow-the-crowd.vercel.app";
const TARGET_LINK = "/dm/1561d6de-e2db-43bd-873a-54b89128e224?message=aa41c7c1-0425-4338-a139-67e35b5b6b80";

/** Loads the real service worker and returns its notificationclick handler
 *  plus a record of everything it did to the fake clients. */
function loadServiceWorker({ clients: windowClients, navigateThrows = false }) {
  const calls = {
    navigated: [],
    focused: 0,
    postMessaged: [],
    openedWindow: [],
    warnings: [],
  };

  const listeners = {};
  const madeClients = windowClients.map((c) => ({
    url: c.url,
    focus: async () => {
      calls.focused += 1;
    },
    postMessage: (data) => calls.postMessaged.push(data),
    ...(c.supportsNavigate === false
      ? {}
      : {
          navigate: async (url) => {
            if (navigateThrows) throw new Error("navigate not allowed for uncontrolled client");
            calls.navigated.push(url);
            return { url, focus: async () => { calls.focused += 1; } };
          },
        }),
  }));

  const self_ = {
    addEventListener: (type, handler) => {
      listeners[type] = handler;
    },
    skipWaiting: () => {},
    location: `${ORIGIN}/sw.js`,
    registration: { showNotification: async () => {} },
    clients: {
      claim: async () => {},
      matchAll: async () => madeClients,
      openWindow: async (url) => {
        calls.openedWindow.push(url);
      },
    },
  };

  const sandbox = {
    self: self_,
    console: {
      log: () => {},
      error: () => {},
      warn: (...args) => calls.warnings.push(args.map(String).join(" ")),
    },
    URL,
  };
  vm.createContext(sandbox);
  vm.runInContext(SW_SOURCE, sandbox);

  return { listeners, calls };
}

async function fireClick(sw, link) {
  const waits = [];
  await sw.listeners.notificationclick({
    notification: { close: () => {}, data: { link } },
    waitUntil: (p) => waits.push(p),
  });
  await Promise.all(waits);
}

async function testExistingClientIsNavigatedToTheTargetedUrl() {
  // The exact reported shape: app already open on the bare chat URL, push
  // targets a specific message in that same chat.
  const sw = loadServiceWorker({
    clients: [{ url: `${ORIGIN}/dm/1561d6de-e2db-43bd-873a-54b89128e224` }],
  });

  await fireClick(sw, TARGET_LINK);

  assert.deepEqual(
    sw.calls.navigated,
    [TARGET_LINK],
    "the existing window must be navigated to the full targeted link. Focusing it and " +
      "postMessaging the page instead loses the link entirely whenever the page has not " +
      "yet attached its listener -- the iOS cold-resume case this test exists for.",
  );
  assert.equal(
    sw.calls.postMessaged.length,
    0,
    "must not depend on the page's postMessage listener when navigate() is available",
  );
  assert.ok(sw.calls.focused > 0, "the navigated window must still be focused");
}

async function testExistingClientNavigationKeepsTheQueryString() {
  const sw = loadServiceWorker({ clients: [{ url: `${ORIGIN}/notifications` }] });
  await fireClick(sw, TARGET_LINK);

  const [navigatedTo] = sw.calls.navigated;
  assert.ok(navigatedTo, "an existing same-origin client must be navigated");
  assert.ok(
    navigatedTo.includes("?message=aa41c7c1-0425-4338-a139-67e35b5b6b80"),
    `the ?message= target must survive to the browser, got: ${navigatedTo}`,
  );
}

async function testCrewChatLinkSurvivesToo() {
  const crewLink = "/events/1c09887e-6205-4258-80df-6d7e6a218885/chat?message=b5258531-60a3-4ca0-bc78-a3818588558a";
  const sw = loadServiceWorker({ clients: [{ url: `${ORIGIN}/events` }] });
  await fireClick(sw, crewLink);
  assert.deepEqual(sw.calls.navigated, [crewLink], "crew chat deep links must navigate identically");
}

async function testClosedAppStillUsesOpenWindowWithTheFullLink() {
  // No existing client: the app was fully closed.
  const sw = loadServiceWorker({ clients: [] });
  await fireClick(sw, TARGET_LINK);

  assert.deepEqual(
    sw.calls.openedWindow,
    [TARGET_LINK],
    "with no open window, the closed-app path must open the full targeted link",
  );
  assert.equal(sw.calls.navigated.length, 0);
}

async function testFallsBackToPostMessageWhenNavigateIsUnavailable() {
  const sw = loadServiceWorker({
    clients: [{ url: `${ORIGIN}/dm/abc`, supportsNavigate: false }],
  });
  await fireClick(sw, TARGET_LINK);

  assert.equal(sw.calls.navigated.length, 0);
  // Field-wise, not deepEqual: the message object is built inside the vm
  // sandbox, so it has a different realm's Object.prototype.
  assert.equal(sw.calls.postMessaged.length, 1);
  assert.equal(sw.calls.postMessaged[0].type, "NAVIGATE_TO");
  assert.equal(
    sw.calls.postMessaged[0].link,
    TARGET_LINK,
    "browsers without WindowClient.navigate must still get the full link via postMessage",
  );
  assert.ok(sw.calls.focused > 0);
}

async function testFallsBackToPostMessageWhenNavigateRejects() {
  // navigate() rejects for clients this service worker does not control.
  const sw = loadServiceWorker({
    clients: [{ url: `${ORIGIN}/dm/abc` }],
    navigateThrows: true,
  });
  await fireClick(sw, TARGET_LINK);

  assert.equal(sw.calls.postMessaged.length, 1);
  assert.equal(sw.calls.postMessaged[0].type, "NAVIGATE_TO");
  assert.equal(
    sw.calls.postMessaged[0].link,
    TARGET_LINK,
    "a rejected navigate() must fall back rather than dropping the notification click",
  );
  assert.ok(sw.calls.focused > 0, "the client must still be focused on the fallback path");
}

async function testExternalLinksAreStillRejected() {
  for (const hostile of ["//evil.com", "https://evil.com/x", "javascript:alert(1)"]) {
    const sw = loadServiceWorker({ clients: [{ url: `${ORIGIN}/dm/abc` }] });
    await fireClick(sw, hostile);
    assert.equal(sw.calls.navigated.length, 0, `must not navigate to ${hostile}`);
    assert.equal(sw.calls.openedWindow.length, 0, `must not open ${hostile}`);
    assert.equal(sw.calls.postMessaged.length, 0, `must not forward ${hostile}`);
  }
}

export async function run() {
  await testExistingClientIsNavigatedToTheTargetedUrl();
  await testExistingClientNavigationKeepsTheQueryString();
  await testCrewChatLinkSurvivesToo();
  await testClosedAppStillUsesOpenWindowWithTheFullLink();
  await testFallsBackToPostMessageWhenNavigateIsUnavailable();
  await testFallsBackToPostMessageWhenNavigateRejects();
  await testExternalLinksAreStillRejected();
}
