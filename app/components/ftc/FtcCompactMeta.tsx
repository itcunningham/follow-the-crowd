"use client";

import type { ReactNode } from "react";

export function FtcMetaIcon({ children }: { children: ReactNode }) {
  return (
    <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center text-ftc-text-muted">
      {children}
    </span>
  );
}

export function FtcMetaRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-start gap-2 text-sm leading-snug">
      <FtcMetaIcon>{icon}</FtcMetaIcon>
      <span className="min-w-0 flex-1 break-words text-ftc-text">{children}</span>
    </li>
  );
}

/** Meta line without a leading icon; text aligns with primary content in the same column (e.g. genre). */
export function FtcMetaTextRow({ children }: { children: ReactNode }) {
  return (
    <li className="min-w-0 break-words text-sm leading-snug text-ftc-text">{children}</li>
  );
}

export function FtcVenueIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

export function FtcCalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 11h18" />
    </svg>
  );
}

export function FtcClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FtcPeopleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.7-3.3 3-5 5.5-5s4.8 1.7 5.5 5" strokeLinecap="round" />
      <path d="M15.5 4.5a3 3 0 0 1 0 6" strokeLinecap="round" />
      <path d="M16 14c2.2.3 3.9 1.9 4.5 5" strokeLinecap="round" />
    </svg>
  );
}

