"use client";

import { useState } from "react";
import BookingSheetDialog, {
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";
import { getSupportEmail } from "@/lib/supportContact";

type HelpView = "menu" | "bookings" | "dm" | "crew-chat" | "need-help";
type HelpContext = "profile" | "events" | "messages" | "crew-chat";

export default function HelpBetaSheet({
  open,
  onClose,
  context = "profile",
}: {
  open: boolean;
  onClose: () => void;
  context?: HelpContext;
}) {
  const [view, setView] = useState<HelpView>("menu");
  const [bookingsStep, setBookingsStep] = useState(1);
  const supportEmail = getSupportEmail();
  const isRealEmail = supportEmail && !supportEmail.includes("example.com");

  const showBookings = context === "events";
  const showDm = context === "messages";
  const showCrewChat = context === "crew-chat";
  const showNeedHelp = true;

  function handleBackFromTopic() {
    setView("menu");
    setBookingsStep(1);
  }

  function handleClose() {
    setView("menu");
    setBookingsStep(1);
    onClose();
  }

  function handleNextBookingStep() {
    if (bookingsStep < 4) {
      setBookingsStep(bookingsStep + 1);
    }
  }

  function handlePrevBookingStep() {
    if (bookingsStep > 1) {
      setBookingsStep(bookingsStep - 1);
    }
  }

  if (!open) {
    return null;
  }

  // =========================================================================
  // MENU
  // =========================================================================
  if (view === "menu") {
    return (
      <BookingSheetDialog
        open={true}
        title="Help"
        titleId="help-menu-title"
        onBackdropClick={handleClose}
        footer={<BookingSheetSecondaryButton onClick={handleClose}>Close</BookingSheetSecondaryButton>}
      >
        <div className="space-y-2">
          {showBookings ? (
            <button
              type="button"
              onClick={() => {
                setView("bookings");
                setBookingsStep(1);
              }}
              className="w-full rounded-xl border border-ftc-border-subtle bg-ftc-surface px-4 py-3 text-left text-sm font-semibold text-ftc-text transition hover:border-ftc-border-strong"
            >
              How bookings work
            </button>
          ) : null}

          {showDm ? (
            <button
              type="button"
              onClick={() => setView("dm")}
              className="w-full rounded-xl border border-ftc-border-subtle bg-ftc-surface px-4 py-3 text-left text-sm font-semibold text-ftc-text transition hover:border-ftc-border-strong"
            >
              Direct messages
            </button>
          ) : null}

          {showCrewChat ? (
            <button
              type="button"
              onClick={() => setView("crew-chat")}
              className="w-full rounded-xl border border-ftc-border-subtle bg-ftc-surface px-4 py-3 text-left text-sm font-semibold text-ftc-text transition hover:border-ftc-border-strong"
            >
              Event crew chat
            </button>
          ) : null}

          {showNeedHelp ? (
            <button
              type="button"
              onClick={() => setView("need-help")}
              className="w-full rounded-xl border border-ftc-border-subtle bg-ftc-surface px-4 py-3 text-left text-sm font-semibold text-ftc-text transition hover:border-ftc-border-strong"
            >
              Need help?
            </button>
          ) : null}
        </div>
      </BookingSheetDialog>
    );
  }

  // =========================================================================
  // BOOKINGS WALKTHROUGH
  // =========================================================================
  if (view === "bookings") {
    const bookingSteps = [
      {
        title: "Create event",
        copy: "Start in Events and create a new event with date, time, and location",
      },
      {
        title: "Add DJs",
        copy: "Search for DJs you want to book and add them to the event",
      },
      {
        title: "Send bookings",
        copy: "Review the details, then send the booking requests to the DJs",
      },
      {
        title: "Coordinate once accepted",
        copy: "When a DJ accepts, you can message them or use the event crew chat to coordinate with the event crew",
      },
    ];

    const step = bookingSteps[bookingsStep - 1];

    return (
      <BookingSheetDialog
        open={true}
        title="How bookings work"
        titleId="help-bookings-title"
        description={`Step ${bookingsStep} of 4`}
        onBackdropClick={handleClose}
        footer={
          <div className="flex w-full items-center justify-between gap-2 sm:justify-end">
            {bookingsStep === 1 ? (
              <BookingSheetSecondaryButton onClick={handleBackFromTopic}>
                Help
              </BookingSheetSecondaryButton>
            ) : null}

            <div className="flex gap-2">
              {bookingsStep > 1 && (
                <BookingSheetSecondaryButton onClick={handlePrevBookingStep}>
                  Prev
                </BookingSheetSecondaryButton>
              )}
              {bookingsStep < 4 ? (
                <BookingSheetSecondaryButton onClick={handleNextBookingStep}>
                  Next
                </BookingSheetSecondaryButton>
              ) : (
                <BookingSheetSecondaryButton onClick={handleBackFromTopic}>
                  Done
                </BookingSheetSecondaryButton>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ftc-text">{step.copy}</p>
        </div>
      </BookingSheetDialog>
    );
  }

  // =========================================================================
  // DIRECT MESSAGES
  // =========================================================================
  if (view === "dm") {
    return (
      <BookingSheetDialog
        open={true}
        title="Direct messages"
        titleId="help-dm-title"
        onBackdropClick={handleClose}
        footer={<BookingSheetSecondaryButton onClick={handleBackFromTopic}>← Back</BookingSheetSecondaryButton>}
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary">
              Start a conversation
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ftc-text">
              Find a profile and tap to send a direct message.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary">
              Your messages
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ftc-text">
              All conversations appear in the Messages tab. Each person has their own message thread.
            </p>
          </div>
        </div>
      </BookingSheetDialog>
    );
  }

  // =========================================================================
  // EVENT CREW CHAT
  // =========================================================================
  if (view === "crew-chat") {
    return (
      <BookingSheetDialog
        open={true}
        title="Event crew chat"
        titleId="help-crew-chat-title"
        onBackdropClick={handleClose}
        footer={<BookingSheetSecondaryButton onClick={handleBackFromTopic}>← Back</BookingSheetSecondaryButton>}
      >
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary">
              Appears after booking accepted
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ftc-text">
              Once bookings are accepted, the event crew can use crew chat to coordinate.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary">
              Coordinate together
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ftc-text">
              Message the event crew in one place to share updates and confirm details.
            </p>
          </div>
        </div>
      </BookingSheetDialog>
    );
  }

  // =========================================================================
  // NEED HELP?
  // =========================================================================
  if (view === "need-help") {
    return (
      <BookingSheetDialog
        open={true}
        title="Need help?"
        titleId="help-contact-title"
        onBackdropClick={handleClose}
        footer={<BookingSheetSecondaryButton onClick={handleBackFromTopic}>← Back</BookingSheetSecondaryButton>}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-ftc-text">
            Something not working or stuck? We're here to help.
          </p>

          {isRealEmail ? (
            <a
              href={`mailto:${supportEmail}?subject=Follow The Crowd Beta Support Request`}
              className="inline-block rounded-xl border border-ftc-border-subtle bg-ftc-surface px-4 py-2 text-sm font-semibold text-ftc-primary transition hover:border-ftc-border-strong"
            >
              Send support email
            </a>
          ) : (
            <p className="text-xs text-ftc-text-secondary">
              Support contact is not configured yet. Check back soon.
            </p>
          )}
        </div>
      </BookingSheetDialog>
    );
  }

  return null;
}
