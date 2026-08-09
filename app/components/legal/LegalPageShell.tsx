"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { readSupabaseSessionUserIdSync } from "@/lib/auth/sessionUserId";
import { SETTINGS_PATH, SIGNUP_PATH } from "@/lib/user/currentUser";

/**
 * Shared chrome for the Terms and Privacy pages so the two cannot drift apart.
 *
 * Deliberately NOT wrapped in OnboardingGuard: both pages are linked from the
 * signup form, so they have to render before an account exists. Auth in this app
 * is client-side only — middleware.ts just canonicalises preview hosts — so a
 * page without the guard is public.
 */
export default function LegalPageShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    // These pages are reached from two places with different origins — signup
    // when logged out, Settings when logged in — so a fixed destination would
    // be wrong from one of them. Prefer real history; fall back to whichever
    // origin the session implies when there is none (deep link, shared URL).
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(readSupabaseSessionUserIdSync() ? SETTINGS_PATH : SIGNUP_PATH);
  }, [router]);

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text">
      <header className="border-b border-ftc-border px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-block text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-primary"
        >
          ← Back
        </button>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ftc-primary">
          Follow The Crowd
        </p>
        <h1 className="mt-1 text-xl font-semibold text-ftc-text">{title}</h1>
        <p className="mt-1 text-sm text-ftc-text-muted">Last updated: {lastUpdated}</p>
      </header>

      <div className="space-y-6 px-4 py-6 pb-16 text-sm leading-relaxed text-ftc-text-secondary sm:px-6">
        {children}
      </div>
    </div>
  );
}

/** Section heading, matching the uppercase primary labels used elsewhere. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ftc-primary">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ items }: { items: readonly string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
