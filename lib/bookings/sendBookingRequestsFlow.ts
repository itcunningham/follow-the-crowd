import {
  DEFAULT_DJ_SEND_OFFER,
  type DjSendOffer,
} from "@/app/components/booking/EventDjSendOfferControls";
import { isPositiveWholeDollarRate, normalizeStoredRate } from "@/lib/bookingRate";
import {
  sendBookingRequestsToDjs,
  type BookingRequest,
  type BookingRequestInput,
  type BookingSendFailure,
} from "@/lib/bookingRequests";
import type { UserProfile } from "@/lib/user/currentUser";

export function getSendBookingValidationError(
  recipientIds: string[],
  djOffers: Record<string, DjSendOffer>,
  djs: UserProfile[],
): string | null {
  for (const djId of recipientIds) {
    const offer = djOffers[djId] ?? DEFAULT_DJ_SEND_OFFER;

    if (offer.rateMode === "fixed" && !isPositiveWholeDollarRate(offer.fee)) {
      const dj = djs.find((item) => item.user_id === djId);
      const name = dj?.display_name?.trim() || "each selected DJ";

      return `Enter a positive whole-dollar fixed offer for ${name}.`;
    }
  }

  return null;
}

export async function sendBookingRequestsForRecipients(options: {
  recipientIds: string[];
  bookingInput: BookingRequestInput;
  existingBookings?: BookingRequest[];
  djOffers: Record<string, DjSendOffer>;
}) {
  const { recipientIds, bookingInput, existingBookings, djOffers } = options;

  return sendBookingRequestsToDjs(recipientIds, bookingInput, {
    existingEventBookings: existingBookings,
    perRecipient: (recipientId) => {
      const offer = djOffers[recipientId] ?? DEFAULT_DJ_SEND_OFFER;

      return {
        rateMode: offer.rateMode,
        fee: normalizeStoredRate(offer.fee),
      };
    },
  });
}

export function formatBookingSendFailureMessage(
  failures: BookingSendFailure[],
  djs: UserProfile[],
): string {
  const lines = failures.map((failure) => {
    const profile = djs.find((dj) => dj.user_id === failure.recipientId);
    const name = profile?.display_name?.trim() || "DJ";
    return `${name}: ${failure.message}`;
  });

  return `Event created, but some invites could not be sent: ${lines.join("; ")}`;
}
