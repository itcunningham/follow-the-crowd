"use client";

import { useEffect, useRef, useState } from "react";
import { PlannerFormCard } from "@/app/components/planner/PlannerUi";
import SendBookingRequestsPanel from "@/app/components/booking/SendBookingRequestsPanel";
import BookingSheetDialog, {
  BookingSheetDangerButton,
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";
import type { SendBookingRequestsDraft } from "@/app/components/booking/useSendBookingRequestsDraft";

type SendBookingRequestsModalProps = {
  open: boolean;
  draft: SendBookingRequestsDraft;
  onClose: () => void;
  sending?: boolean;
  disabled?: boolean;
  introText?: string;
  showSendButton?: boolean;
  onSend?: () => void;
  confirmDiscardOnClose?: boolean;
  title?: string;
  sendButtonLabelMode?: "send" | "confirm";
};

export default function SendBookingRequestsModal({
  open,
  draft,
  onClose,
  sending = false,
  disabled = false,
  introText,
  showSendButton = false,
  onSend,
  confirmDiscardOnClose = true,
  title = "Send bookings",
  sendButtonLabelMode = "send",
}: SendBookingRequestsModalProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    window.requestAnimationFrame(() => {
      sectionRef.current?.focus({ preventScroll: true });
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setDiscardConfirmOpen(false);
    }
  }, [open]);

  function requestClose() {
    if (sending || disabled) {
      return;
    }

    if (confirmDiscardOnClose && draft.hasDraft) {
      setDiscardConfirmOpen(true);
      return;
    }

    setDiscardConfirmOpen(false);
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || sending || disabled) {
        return;
      }

      if (discardConfirmOpen) {
        setDiscardConfirmOpen(false);
        return;
      }

      requestClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirmDiscardOnClose, disabled, discardConfirmOpen, draft.hasDraft, open, sending]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
        onClick={requestClose}
      >
        <div
          ref={sectionRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl border border-ftc-border-subtle bg-ftc-bg pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:pb-0 focus:outline-none"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
        >
          <PlannerFormCard title={title} onCancel={requestClose} cancelDisabled={sending || disabled}>
            <SendBookingRequestsPanel
              draft={draft}
              disabled={disabled || sending}
              sending={sending}
              showSendButton={showSendButton}
              onSend={onSend}
              introText={introText}
              sendButtonLabelMode={sendButtonLabelMode}
            />
          </PlannerFormCard>
        </div>
      </div>

      <BookingSheetDialog
        open={discardConfirmOpen}
        title="Discard booking draft?"
        titleId="discard-send-bookings-title"
        description="Your selected DJs and entered booking details will be lost"
        overlayClassName="z-[60]"
        onBackdropClick={() => setDiscardConfirmOpen(false)}
        footer={
          <>
            <BookingSheetSecondaryButton onClick={() => setDiscardConfirmOpen(false)}>
              Keep editing
            </BookingSheetSecondaryButton>
            <BookingSheetDangerButton
              onClick={() => {
                setDiscardConfirmOpen(false);
                onClose();
              }}
            >
              Discard
            </BookingSheetDangerButton>
          </>
        }
      />
    </>
  );
}
