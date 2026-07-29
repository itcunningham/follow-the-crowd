"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  DM_QUICK_REACTIONS,
  summarizeDmReactions,
  type DmMessageReaction,
} from "@/lib/dmReactions";
import {
  CHAT_MESSAGE_REACTION_EMOJI_BUTTON_CLASS,
  CHAT_MESSAGE_REACTION_PILL_CLASS,
  CHAT_MESSAGE_REACTION_PILL_HIDDEN_CLASS,
  CHAT_MESSAGE_REACTION_PILL_TRANSITION_CLASS,
  CHAT_MESSAGE_REACTION_PILL_VISIBLE_CLASS,
  CHAT_MESSAGE_REACTIONS_STACK_CLASS,
} from "@/lib/dm/chatMessageGroupLayout";
import { useReactionPickerPosition } from "@/lib/dm/useReactionPickerPosition";
import { useDoubleTapGesture } from "@/lib/dm/useMessageReactionDoubleTap";

const PICKER_ANIMATION_MS = 175;

const PICKER_CLASS =
  "fixed z-[120] flex max-w-[min(calc(100vw-2rem),20rem)] shrink-0 items-center gap-1 rounded-full border border-ftc-border-strong bg-ftc-bg-elevated/95 px-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-[opacity,transform] duration-[175ms] ease-out motion-reduce:transition-none motion-reduce:transform-none";

const PICKER_BACKDROP_CLASS =
  "fixed inset-0 z-[119] bg-black/20 transition-opacity duration-[175ms] ease-out motion-reduce:transition-none";

const PICKER_SCROLL_DISMISS_THRESHOLD_PX = 10;

function prefersFinePointer(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(pointer: fine)").matches;
}

function isPickerTarget(target: EventTarget | null, pickerElement: HTMLElement | null): boolean {
  return Boolean(target instanceof Node && pickerElement?.contains(target));
}

export function DmReactionPicker({
  show,
  reacting,
  isOwnMessage,
  anchorRef,
  scrollContainerRef,
  onToggleReaction,
  onClosePicker,
}: {
  show: boolean;
  reacting: boolean;
  isOwnMessage: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  onToggleReaction: (emoji: string) => void;
  onClosePicker: () => void;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const firstReactionRef = useRef<HTMLButtonElement>(null);
  const pointerStartsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const [mounted, setMounted] = useState(false);
  const [renderPicker, setRenderPicker] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const { position } = useReactionPickerPosition({
    show: renderPicker,
    anchorRef,
    pickerRef,
    isOwnMessage,
    scrollContainerRef,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!show) {
      setPickerVisible(false);
      const timer = window.setTimeout(() => {
        setRenderPicker(false);
      }, PICKER_ANIMATION_MS);

      return () => {
        window.clearTimeout(timer);
      };
    }

    setRenderPicker(true);
    const frame = window.requestAnimationFrame(() => {
      setPickerVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [show]);

  useEffect(() => {
    if (!renderPicker) {
      return;
    }

    if (prefersFinePointer()) {
      firstReactionRef.current?.focus();
    }
  }, [renderPicker]);

  useEffect(() => {
    if (!renderPicker) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClosePicker();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (isPickerTarget(event.target, pickerRef.current)) {
        pointerStartsRef.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
        return;
      }

      onClosePicker();
    }

    function handlePointerMove(event: PointerEvent) {
      const pickerElement = pickerRef.current;

      if (isPickerTarget(event.target, pickerElement)) {
        return;
      }

      const start = pointerStartsRef.current.get(event.pointerId) ?? {
        x: event.clientX,
        y: event.clientY,
      };

      pointerStartsRef.current.set(event.pointerId, start);

      if (
        Math.hypot(event.clientX - start.x, event.clientY - start.y) >
        PICKER_SCROLL_DISMISS_THRESHOLD_PX
      ) {
        onClosePicker();
      }
    }

    function handlePointerUp(event: PointerEvent) {
      pointerStartsRef.current.delete(event.pointerId);
    }

    function handleWheel() {
      onClosePicker();
    }

    function handleScroll(event: Event) {
      const scrollContainer = scrollContainerRef?.current;

      if (scrollContainer && event.target === scrollContainer) {
        onClosePicker();
      }
    }

    const scrollContainer = scrollContainerRef?.current;

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    scrollContainer?.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      pointerStartsRef.current.clear();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("wheel", handleWheel);
      scrollContainer?.removeEventListener("scroll", handleScroll);
    };
  }, [onClosePicker, renderPicker, scrollContainerRef]);

  if (!renderPicker || !mounted) {
    return null;
  }

  const picker = (
    <>
      <div
        aria-hidden="true"
        className={`${PICKER_BACKDROP_CLASS} ${pickerVisible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={pickerRef}
        data-dm-reaction-picker
        role="toolbar"
        aria-label="React to message"
        className={`${PICKER_CLASS} ${
          pickerVisible ? "scale-100 opacity-100" : "scale-[0.96] opacity-0"
        }`}
        style={{
          top: position.top,
          left: position.left,
          visibility: position.ready ? "visible" : "hidden",
        }}
      >
        {DM_QUICK_REACTIONS.map((emoji, index) => (
          <button
            key={emoji}
            ref={index === 0 ? firstReactionRef : undefined}
            type="button"
            disabled={reacting}
            aria-label={`React with ${emoji}`}
            onClick={() => onToggleReaction(emoji)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition hover:bg-ftc-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ftc-primary/35 disabled:opacity-50"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );

  return createPortal(picker, document.body);
}

function ReactionEmojiButton({
  emoji,
  count,
  reactedByCurrentUser,
  reacting,
  onToggleReaction,
}: {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
  reacting: boolean;
  onToggleReaction: (emoji: string) => void;
}) {
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleDoubleClick,
    consumeDoubleTapActivation,
  } = useDoubleTapGesture({
    onDoubleTap: () => onToggleReaction(emoji),
    disabled: reacting || !reactedByCurrentUser,
  });

  if (!reactedByCurrentUser) {
    return (
      <button
        type="button"
        tabIndex={-1}
        disabled
        aria-label={`${count} ${emoji} reaction${count === 1 ? "" : "s"}`}
        className={`${CHAT_MESSAGE_REACTION_EMOJI_BUTTON_CLASS} transition motion-reduce:transition-none disabled:pointer-events-none hover:bg-ftc-surface/35`}
      >
        <span aria-hidden="true">{emoji}</span>
        {count > 1 ? (
          <span className="ml-px text-[9px] font-semibold leading-none text-ftc-text-secondary">
            {count}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={reacting}
      aria-label={`Remove ${emoji} reaction`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onDoubleClick={handleDoubleClick}
      onClickCapture={consumeDoubleTapActivation}
      className={`${CHAT_MESSAGE_REACTION_EMOJI_BUTTON_CLASS} transition motion-reduce:transition-none disabled:pointer-events-none bg-ftc-surface/50`}
    >
      <span aria-hidden="true">{emoji}</span>
      {count > 1 ? (
        <span className="ml-px text-[9px] font-semibold leading-none text-ftc-text-secondary">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function DmMessageReactions({
  reactions,
  currentUserId,
  reacting,
  visible = true,
  onToggleReaction,
  onOpenPicker,
}: {
  reactions: DmMessageReaction[];
  currentUserId: string | null;
  reacting: boolean;
  visible?: boolean;
  onToggleReaction: (emoji: string) => void;
  onOpenPicker: () => void;
}) {
  const summaries = summarizeDmReactions(reactions, currentUserId);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className={CHAT_MESSAGE_REACTIONS_STACK_CLASS}>
      <div
        className={`${CHAT_MESSAGE_REACTION_PILL_CLASS} ${CHAT_MESSAGE_REACTION_PILL_TRANSITION_CLASS} ${
          visible ? CHAT_MESSAGE_REACTION_PILL_VISIBLE_CLASS : CHAT_MESSAGE_REACTION_PILL_HIDDEN_CLASS
        }`}
      >
        {summaries.map((summary) => (
          <ReactionEmojiButton
            key={summary.emoji}
            emoji={summary.emoji}
            count={summary.count}
            reactedByCurrentUser={summary.reactedByCurrentUser}
            reacting={reacting}
            onToggleReaction={onToggleReaction}
          />
        ))}
        <button
          type="button"
          aria-label="Add reaction"
          disabled={reacting}
          onClick={onOpenPicker}
          className="hidden h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[10px] leading-none text-ftc-text-secondary transition hover:bg-ftc-surface/35 hover:text-ftc-text focus-visible:inline-flex disabled:pointer-events-none sm:group-hover/message:inline-flex"
        >
          +
        </button>
      </div>
    </div>
  );
}
