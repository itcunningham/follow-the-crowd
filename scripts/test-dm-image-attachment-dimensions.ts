// @ts-nocheck
// Exercises the real DmMessageAttachmentView component (not a reimplementation)
// to prove: a DM image reopened in the same tab reserves its previously-learned
// aspect ratio immediately, before decode, instead of only discovering its
// height after the image loads — the root cause of a reopened image-heavy
// conversation landing on an older image instead of the newest message.
import assert from "node:assert/strict";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { Window } from "happy-dom";
import DmMessageAttachmentView from "../app/components/dm/DmMessageAttachment";
import type { DmMessageAttachment } from "../lib/dmAttachments";

function makeImageAttachment(id: string): DmMessageAttachment {
  return {
    id,
    message_id: "message-1",
    conversation_id: "conversation-1",
    uploader_id: "uploader-1",
    file_url: `https://example.test/${id}.jpg`,
    file_name: `${id}.jpg`,
    file_type: "image/jpeg",
    file_size: 123456,
    created_at: "2026-01-01T00:00:00Z",
  };
}

export async function runDmImageAttachmentDimensionsTest(): Promise<void> {
  const window = new Window();
  const globalRef = globalThis as Record<string, unknown>;
  const previousWindow = globalRef.window;
  const previousDocument = globalRef.document;

  globalRef.IS_REACT_ACT_ENVIRONMENT = true;
  globalRef.window = window;
  globalRef.document = window.document;

  const container = window.document.createElement("div");
  window.document.body.appendChild(container);
  let root: Root | null = createRoot(container as unknown as HTMLElement);

  try {
    const attachment = makeImageAttachment("attach-known");
    const neverSeenAttachment = makeImageAttachment("attach-never-seen");

    // First-ever view of this attachment: nothing learned yet, so no space
    // is reserved up front — matches today's behaviour for a brand-new image.
    await act(async () => {
      root?.render(
        React.createElement(DmMessageAttachmentView, { attachment, isOwnMessage: false }),
      );
    });
    let img = container.querySelector("img") as HTMLImageElement | null;
    assert.ok(img, "image should render");
    assert.equal(
      img?.style.aspectRatio,
      "",
      "no aspect-ratio should be reserved before this attachment has ever decoded",
    );

    // Simulate the image finishing loading with known natural dimensions
    // (React's onLoad handler reads naturalWidth/naturalHeight off the node).
    Object.defineProperty(img, "naturalWidth", { value: 1600, configurable: true });
    Object.defineProperty(img, "naturalHeight", { value: 900, configurable: true });
    await act(async () => {
      img!.dispatchEvent(new (window as unknown as { Event: typeof Event }).Event("load"));
    });

    // Leave and reopen: unmount, then mount a fresh instance for the SAME
    // attachment id (mirrors DM inbox -> conversation -> inbox -> reopen).
    await act(async () => {
      root?.unmount();
    });
    root = createRoot(container as unknown as HTMLElement);
    await act(async () => {
      root?.render(
        React.createElement(DmMessageAttachmentView, { attachment, isOwnMessage: false }),
      );
    });
    img = container.querySelector("img") as HTMLImageElement | null;
    assert.ok(img, "image should render again after reopen");
    assert.ok(
      img?.style.aspectRatio && img.style.aspectRatio !== "",
      "reopening the same attachment must reserve its previously-learned aspect ratio immediately, before decode",
    );
    const [reservedWidthText, reservedHeightText] = (img!.style.aspectRatio as string).split("/");
    assert.ok(
      Math.abs(Number(reservedWidthText) / Number(reservedHeightText) - 1600 / 900) < 1e-9,
      `reserved aspect-ratio (${img!.style.aspectRatio}) must equal the learned ratio 1600/900`,
    );

    // A different, never-seen attachment must not incorrectly inherit
    // another image's learned ratio.
    await act(async () => {
      root?.render(
        React.createElement(DmMessageAttachmentView, {
          attachment: neverSeenAttachment,
          isOwnMessage: false,
        }),
      );
    });
    img = container.querySelector("img") as HTMLImageElement | null;
    assert.equal(
      img?.style.aspectRatio,
      "",
      "a different, never-seen attachment must not reuse another image's learned aspect ratio",
    );
  } finally {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container.remove();
    globalRef.window = previousWindow;
    globalRef.document = previousDocument;
  }
}
