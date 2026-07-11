"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_DJ_SEND_OFFER,
  formatDjSendOfferSummary,
  type DjSendOffer,
} from "@/app/components/booking/EventDjSendOfferControls";
import { isPositiveWholeDollarRate, normalizeStoredRate } from "@/lib/bookingRate";
import {
  buildEventBookingDuplicateMap,
  filterSendableRecipientIdsForEvent,
  type BookingRequest,
} from "@/lib/bookingRequests";
import { getSendBookingValidationError } from "@/lib/bookings/sendBookingRequestsFlow";
import {
  getPlannerDjAvailabilityHints,
  getUnavailableDjBookingWarnings,
  type DjPlannerAvailabilityHint,
} from "@/lib/djAvailability";
import { filterBookableDjsBySearchQuery } from "@/lib/user/filterBookableDjs";
import { listBookableDjs, type UserProfile } from "@/lib/user/currentUser";

type UseSendBookingRequestsDraftOptions = {
  eventDate: string;
  eventId?: string | null;
  existingBookings?: BookingRequest[];
  enabled?: boolean;
};

export function useSendBookingRequestsDraft({
  eventDate,
  eventId = null,
  existingBookings = [],
  enabled = true,
}: UseSendBookingRequestsDraftOptions) {
  const [djs, setDjs] = useState<UserProfile[]>([]);
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDjIds, setSelectedDjIds] = useState<string[]>([]);
  const [djOffers, setDjOffers] = useState<Record<string, DjSendOffer>>({});
  const [djAvailabilityHints, setDjAvailabilityHints] = useState<
    Map<string, DjPlannerAvailabilityHint>
  >(new Map());

  const loadDjs = useCallback(async () => {
    setLoadingDjs(true);

    try {
      const bookableDjs = await listBookableDjs();
      setDjs(bookableDjs);

      if (eventDate.trim()) {
        const hints = await getPlannerDjAvailabilityHints(
          bookableDjs.map((dj) => dj.user_id),
          eventDate,
        );
        setDjAvailabilityHints(hints);
      } else {
        setDjAvailabilityHints(new Map());
      }
    } catch (loadError) {
      console.error("Failed to load bookable DJs:", loadError);
      setDjs([]);
      setDjAvailabilityHints(new Map());
      throw loadError;
    } finally {
      setLoadingDjs(false);
    }
  }, [eventDate]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void loadDjs().catch(() => {
      if (!cancelled) {
        setDjs([]);
        setDjAvailabilityHints(new Map());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, loadDjs]);

  const filteredDjs = useMemo(
    () => filterBookableDjsBySearchQuery(djs, searchQuery),
    [djs, searchQuery],
  );

  const eventBookingDuplicates = useMemo(
    () => (eventId ? buildEventBookingDuplicateMap(existingBookings) : new Map()),
    [eventId, existingBookings],
  );

  const sendableSelectedDjIds = useMemo(() => {
    if (!eventId) {
      return selectedDjIds;
    }

    return filterSendableRecipientIdsForEvent(selectedDjIds, existingBookings).sendableIds;
  }, [eventId, existingBookings, selectedDjIds]);

  const unavailableDjWarnings = useMemo(
    () => getUnavailableDjBookingWarnings(sendableSelectedDjIds, djs, djAvailabilityHints),
    [sendableSelectedDjIds, djs, djAvailabilityHints],
  );

  const allSelectedAreDuplicates =
    Boolean(eventId) && selectedDjIds.length > 0 && sendableSelectedDjIds.length === 0;

  const sendOfferSummary = useMemo(
    () =>
      sendableSelectedDjIds.map((djId) => {
        const dj = djs.find((item) => item.user_id === djId);
        const offer = djOffers[djId] ?? DEFAULT_DJ_SEND_OFFER;

        return {
          djId,
          name: dj?.display_name?.trim() || "DJ",
          summary: formatDjSendOfferSummary(offer),
        };
      }),
    [sendableSelectedDjIds, djOffers, djs],
  );

  const hasInvalidFixedOffers = useMemo(
    () =>
      sendableSelectedDjIds.some((djId) => {
        const offer = djOffers[djId] ?? DEFAULT_DJ_SEND_OFFER;

        return offer.rateMode === "fixed" && !isPositiveWholeDollarRate(offer.fee);
      }),
    [sendableSelectedDjIds, djOffers],
  );

  const hasDraft = useMemo(() => {
    if (selectedDjIds.length > 0) {
      return true;
    }

    return Object.values(djOffers).some((offer) => {
      if (offer.rateMode !== DEFAULT_DJ_SEND_OFFER.rateMode) {
        return true;
      }

      return Boolean(normalizeStoredRate(offer.fee));
    });
  }, [djOffers, selectedDjIds]);

  function toggleDjSelection(userId: string) {
    if (eventId && eventBookingDuplicates.has(userId)) {
      return;
    }

    setSelectedDjIds((prev) => {
      if (prev.includes(userId)) {
        setDjOffers((offers) => {
          const next = { ...offers };
          delete next[userId];
          return next;
        });
        return prev.filter((id) => id !== userId);
      }

      setDjOffers((offers) => ({
        ...offers,
        [userId]: offers[userId] ?? {
          rateMode: "fixed",
          fee: "",
        },
      }));

      return [...prev, userId];
    });
  }

  function updateDjOffer(userId: string, offer: DjSendOffer) {
    setDjOffers((prev) => ({ ...prev, [userId]: offer }));
  }

  function resolveSendableRecipientIds(recipientIds: string[] = selectedDjIds) {
    if (!eventId) {
      return { sendableIds: recipientIds, skippedIds: [] as string[] };
    }

    return filterSendableRecipientIdsForEvent(recipientIds, existingBookings);
  }

  function getValidationError(recipientIds: string[] = sendableSelectedDjIds) {
    return getSendBookingValidationError(recipientIds, djOffers, djs);
  }

  function resetDraft() {
    setSelectedDjIds([]);
    setDjOffers({});
    setSearchQuery("");
  }

  function getDraftSnapshot() {
    return {
      selectedDjIds,
      djOffers,
      searchQuery,
    };
  }

  function restoreDraft(snapshot: {
    selectedDjIds: string[];
    djOffers: Record<string, DjSendOffer>;
    searchQuery: string;
  }) {
    setSelectedDjIds(snapshot.selectedDjIds);
    setDjOffers(snapshot.djOffers);
    setSearchQuery(snapshot.searchQuery);
  }

  return {
    djs,
    loadingDjs,
    searchQuery,
    setSearchQuery,
    selectedDjIds,
    setSelectedDjIds,
    djOffers,
    djAvailabilityHints,
    filteredDjs,
    eventBookingDuplicates,
    sendableSelectedDjIds,
    unavailableDjWarnings,
    allSelectedAreDuplicates,
    sendOfferSummary,
    hasInvalidFixedOffers,
    hasDraft,
    toggleDjSelection,
    updateDjOffer,
    resolveSendableRecipientIds,
    getValidationError,
    resetDraft,
    getDraftSnapshot,
    restoreDraft,
    reloadDjs: loadDjs,
  };
}

export type SendBookingRequestsDraft = ReturnType<typeof useSendBookingRequestsDraft>;
