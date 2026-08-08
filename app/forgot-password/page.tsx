"use client";

import { useState } from "react";
import Link from "next/link";
import { LOGIN_PATH, requestPasswordResetEmail } from "@/lib/user/currentUser";

/**
 * Request a password reset email.
 *
 * The other half of this flow already existed: /login detects PASSWORD_RECOVERY
 * and renders "Set a new password", and requestPasswordResetEmail already sends
 * through getAuthRedirectUrl(LOGIN_PATH). The only missing piece was a way for a
 * signed-out user to ask — Settings could, but you have to be logged in to reach
 * Settings, which is no help when you cannot log in.
 *
 * Public on purpose: not wrapped in OnboardingGuard, same as /login and /signup.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Enter your email address");
      return;
    }

    setSubmitting(true);

    try {
      await requestPasswordResetEmail(email);
      setSent(true);
    } catch (resetError) {
      console.error("Password reset request failed:", resetError);
      // Deliberately generic. A failure that named the reason - "no account
      // with that email" - would turn this form into a way to discover which
      // addresses are registered, which is the same enumeration problem the
      // signup copy avoids.
      setError("Could not send the reset email. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-start justify-center overflow-hidden bg-ftc-bg px-4 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] font-sans text-ftc-text sm:items-center sm:py-10">
      <div className="relative z-10 ftc-card-raised w-full max-w-md p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ftc-primary">
          Follow The Crowd
        </p>
        <h1 className="mt-3 text-2xl font-bold text-ftc-text">Reset password</h1>
        <p className="mt-2 text-sm text-ftc-text-secondary">
          Enter your email and we&rsquo;ll send you a link to set a new password
        </p>

        {sent ? (
          <div className="mt-8 space-y-3">
            {/* Shown for any accepted request, whether or not the address is
                registered. Confirming which emails exist would let anyone probe
                the user base one address at a time. */}
            <p className="text-sm text-ftc-primary/90">
              If an account exists for that email, a reset link is on its way
            </p>
            <p className="text-sm text-ftc-text-muted">
              Check your inbox and follow the link to choose a new password
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                required
                className="ftc-input px-3.5 py-2.5"
              />
            </label>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              aria-disabled={submitting}
              className="w-full ftc-btn-primary px-4 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ftc-text-muted">
          <Link
            href={LOGIN_PATH}
            className="font-semibold text-ftc-primary transition hover:text-ftc-primary/90"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
