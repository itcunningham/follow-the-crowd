"use client";

import Link from "next/link";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import BookingStatusBadge from "@/app/components/booking/BookingStatusBadge";
import type { BookingRequest } from "@/lib/bookingRequests";
import type { BookingRecipientProfile } from "@/lib/user/currentUser";

export default function EventDetailLineupList({
  bookings,
  profiles,
  showStatus = false,
}: {
  bookings: BookingRequest[];
  profiles: Map<string, BookingRecipientProfile>;
  showStatus?: boolean;
}) {
  if (bookings.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {bookings.map((booking) => {
        const profile = profiles.get(booking.recipient_id);
        const displayName = profile?.display_name?.trim() || "DJ";
        const setTime = booking.set_time?.trim() || "Time TBC";

        return (
          <li key={booking.id}>
            <Link
              href={`/profile/${booking.recipient_id}`}
              className="flex items-center gap-3 rounded-xl border border-ftc-border-subtle bg-ftc-surface px-3 py-3 transition hover:border-ftc-border-strong"
            >
              <ProfileAvatar name={displayName} avatarUrl={profile?.avatar_url} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ftc-text">{displayName}</p>
                {profile?.genre?.trim() ? (
                  <p className="truncate text-sm text-ftc-text-muted">{profile.genre}</p>
                ) : null}
                {showStatus ? (
                  <div className="mt-1.5">
                    <BookingStatusBadge status={booking.status} />
                  </div>
                ) : null}
              </div>
              <p className="shrink-0 text-right text-sm font-medium text-ftc-text-secondary">
                {setTime}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
