"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LOGIN_PATH, signUpWithEmail } from "@/lib/user/currentUser";

function getSignupErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Failed to sign up";
}

function validateSignupForm(
  email: string,
  password: string,
  confirmPassword: string,
): string | null {
  if (!email.trim()) {
    return "Email is required";
  }

  if (!password) {
    return "Password is required";
  }

  if (!confirmPassword) {
    return "Confirm password is required";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match";
  }

  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Gates account creation. Deliberately not persisted: there is no age column,
  // so the record of confirmation is the account and its created_at. This is a
  // product gate, not a versioned-consent system.
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const validationError = validateSignupForm(email, password, confirmPassword);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const { session } = await signUpWithEmail(email, password);

      if (!session) {
        // A null session is NOT proof an account was created. With email
        // confirmation enabled Supabase returns the same success-shaped
        // response for a new signup awaiting confirmation and for an address
        // that is already registered — deliberately, so signup cannot be used
        // to discover which emails exist. `error` is null in both cases too.
        //
        // So the copy has to stay true either way: it says an email was sent,
        // not that an account now exists, and points at Log in for the case
        // where one already did.
        //
        // data.user.identities is empty for an existing account and could tell
        // the two apart, but branching on it — different copy, a different
        // redirect, anything visible — rebuilds the enumeration oracle Supabase
        // is suppressing. An attacker does not need the words "email exists",
        // only a reliable difference. Left unread on purpose.
        setSuccessMessage("Check your email to continue");
        setSubmitting(false);
        return;
      }

      router.replace("/onboarding");
    } catch (signUpError) {
      console.error("Signup failed:", signUpError);

      if (signUpError && typeof signUpError === "object") {
        console.error("Signup error details:", signUpError);
      }

      setError(getSignupErrorMessage(signUpError));
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-start justify-center overflow-hidden bg-ftc-bg px-4 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] font-sans text-ftc-text sm:items-center sm:py-10">
      <div className="relative z-10 ftc-card-raised w-full max-w-md p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ftc-primary">
          Follow The Crowd
        </p>
        <h1 className="mt-3 text-2xl font-bold text-ftc-text">Create account</h1>
        <p className="mt-2 text-sm text-ftc-text-secondary">Join Follow The Crowd with email and password</p>

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
              required
              className="ftc-input px-3.5 py-2.5"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="ftc-input px-3.5 py-2.5"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
              Confirm password
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="ftc-input px-3.5 py-2.5"
            />
          </label>

          {successMessage ? (
            <div className="space-y-1.5">
              <p className="text-sm text-ftc-primary/90">{successMessage}</p>
              {/* Shown unconditionally alongside the neutral message: it is the
                  only hint a returning user gets, and making it conditional
                  would signal which emails already exist. */}
              <p className="text-sm text-ftc-text-muted">
                If you already have an account with this email,{" "}
                <Link
                  href={LOGIN_PATH}
                  className="font-semibold text-ftc-primary transition hover:text-ftc-primary/90"
                >
                  log in instead
                </Link>
              </p>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(event) => setAgeConfirmed(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-ftc-border-strong bg-ftc-surface accent-[var(--ftc-color-primary)]"
            />
            <span className="text-sm text-ftc-text-secondary">I confirm I am 18 or older</span>
          </label>

          <button
            type="submit"
            disabled={submitting || !ageConfirmed}
            aria-disabled={submitting || !ageConfirmed}
            className="w-full ftc-btn-primary w-full px-4 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating account" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs leading-relaxed text-ftc-text-muted">
          By creating an account, you agree to the{" "}
          <Link href="/terms" className="font-semibold text-ftc-primary hover:underline">
            Terms &amp; Conditions
          </Link>{" "}
          and acknowledge the{" "}
          <Link href="/privacy" className="font-semibold text-ftc-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-6 text-center text-sm text-ftc-text-muted">
          Already have an account?{" "}
          <Link href={LOGIN_PATH} className="font-semibold text-ftc-primary transition hover:text-ftc-primary/90">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
