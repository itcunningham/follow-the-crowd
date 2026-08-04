"use client";

import { useRef } from "react";
import Link from "next/link";
import BookingSheetDialog, {
  BookingSheetSecondaryButton,
} from "@/app/components/booking/BookingSheetDialog";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { CREW_ROLE_LABEL, type CrewMember } from "@/lib/events/crewChatMembers";
import { buildProfileHref } from "@/lib/profileNavigation";
import { useBodyScrollLock, useModalTouchScrollContainment } from "@/lib/ui/useBodyScrollLock";

function CrewMemberRoleBadge({ role }: { role: CrewMember["role"] }) {
  const isPromoter = role === "promoter";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isPromoter
          ? "bg-[var(--ftc-color-primary-subtle)] text-ftc-primary"
          : "bg-ftc-bg-elevated text-ftc-text-secondary"
      }`}
    >
      {CREW_ROLE_LABEL[role]}
    </span>
  );
}

/** One row = one crew member's whole profile link, per task 2/7 — avatar and name both open it. */
function CrewMemberRow({
  member,
  profileReturnTo,
}: {
  member: CrewMember;
  profileReturnTo?: string | null;
}) {
  return (
    <li>
      <Link
        href={buildProfileHref(member.userId, { returnTo: profileReturnTo })}
        className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-ftc-bg-elevated"
      >
        <ProfileAvatar name={member.displayName} avatarUrl={member.avatarUrl} size="md" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ftc-text">
          {member.displayName}
        </span>
        <CrewMemberRoleBadge role={member.role} />
      </Link>
    </li>
  );
}

/** Crew member list, task 2/7 — tapping either the avatar or the name opens that member's profile. */
export default function CrewMemberListSheet({
  open,
  members,
  profileReturnTo,
  onClose,
}: {
  open: boolean;
  members: CrewMember[];
  profileReturnTo?: string | null;
  onClose: () => void;
}) {
  // BookingSheetDialog doesn't expose a ref to its own outer panel, so this is
  // scoped to the scrollable list itself rather than the whole dialog: touches
  // inside it respect scroll direction correctly, and touches on the header/
  // footer chrome outside it correctly fall through to "prevent" (blocking
  // touchmove from bleeding to the page behind the sheet).
  const scrollListRef = useRef<HTMLUListElement>(null);

  useBodyScrollLock(open);
  useModalTouchScrollContainment(open, scrollListRef);

  return (
    <BookingSheetDialog
      open={open}
      title="Crew"
      titleId="crew-member-list-title"
      onBackdropClick={onClose}
      footer={<BookingSheetSecondaryButton onClick={onClose}>Close</BookingSheetSecondaryButton>}
    >
      <ul
        ref={scrollListRef}
        className="max-h-[55dvh] space-y-1 overflow-y-auto overscroll-contain"
      >
        {members.map((member) => (
          <CrewMemberRow key={member.userId} member={member} profileReturnTo={profileReturnTo} />
        ))}
      </ul>
    </BookingSheetDialog>
  );
}
