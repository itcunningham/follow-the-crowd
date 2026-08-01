// @ts-nocheck
// isValidMessageHistoryGestureStart / shouldStabilizeComposerTouchMove use
// real DOM instanceof checks (Node, Element, HTMLInputElement) and
// Element.prototype.closest/contains, which can't be duck-typed with plain
// objects — needs an actual DOM, so this runs under happy-dom (already a
// devDependency, same pattern as the other scripts/test-*.ts files).
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import {
  isValidMessageHistoryGestureStart,
  shouldStabilizeComposerTouchMove,
} from "../lib/dm/messageHistoryGestureTarget";

export async function runMessageHistoryGestureTargetTest() {
  const window = new Window();
  const globalRef = globalThis as Record<string, unknown>;
  const previousWindow = globalRef.window;
  const previousDocument = globalRef.document;
  const previousNode = globalRef.Node;
  const previousElement = globalRef.Element;
  const previousHtmlInput = globalRef.HTMLInputElement;
  const previousHtmlTextarea = globalRef.HTMLTextAreaElement;

  globalRef.window = window;
  globalRef.document = window.document;
  globalRef.Node = window.Node;
  globalRef.Element = window.Element;
  globalRef.HTMLInputElement = window.HTMLInputElement;
  globalRef.HTMLTextAreaElement = window.HTMLTextAreaElement;

  try {
    const scrollContainer = window.document.createElement("div");
    const composerRoot = window.document.createElement("div");
    const message = window.document.createElement("p");
    const button = window.document.createElement("button");
    const input = window.document.createElement("input");
    const composerButton = window.document.createElement("button");

    scrollContainer.append(message, button);
    composerRoot.append(input, composerButton);

    assert.equal(
      isValidMessageHistoryGestureStart(message, scrollContainer, composerRoot),
      true,
      "plain message text is a valid gesture start",
    );
    assert.equal(
      isValidMessageHistoryGestureStart(button, scrollContainer, composerRoot),
      false,
      "an interactive control inside the scroll container is excluded",
    );
    assert.equal(
      isValidMessageHistoryGestureStart(input, scrollContainer, composerRoot),
      false,
      "a touch inside the composer root is excluded",
    );
    assert.equal(
      isValidMessageHistoryGestureStart(message, scrollContainer, null),
      true,
      "works with no composer root",
    );

    const outsideNode = window.document.createElement("span");
    assert.equal(
      isValidMessageHistoryGestureStart(outsideNode, scrollContainer, composerRoot),
      false,
      "a target outside the scroll container is excluded",
    );
    assert.equal(
      isValidMessageHistoryGestureStart(null, scrollContainer, composerRoot),
      false,
      "a null target is excluded",
    );

    // A non-input control that's actually part of the composer (e.g. send/attach
    // button) should still be stabilized against page/shell rubber-band.
    assert.equal(
      shouldStabilizeComposerTouchMove(composerButton, composerRoot),
      true,
      "a composer button is stabilized",
    );
    // Inputs are excluded so text selection/cursor placement still works.
    assert.equal(
      shouldStabilizeComposerTouchMove(input, composerRoot),
      false,
      "a composer input is not stabilized",
    );
    // A target outside the composer root entirely isn't stabilized by it.
    assert.equal(
      shouldStabilizeComposerTouchMove(message, composerRoot),
      false,
      "a target outside the composer root is not stabilized",
    );
  } finally {
    globalRef.window = previousWindow;
    globalRef.document = previousDocument;
    globalRef.Node = previousNode;
    globalRef.Element = previousElement;
    globalRef.HTMLInputElement = previousHtmlInput;
    globalRef.HTMLTextAreaElement = previousHtmlTextarea;
  }
}
