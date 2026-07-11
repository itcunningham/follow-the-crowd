"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FtcBrandMotionLazy from "@/app/components/brand/FtcBrandMotionLazy";
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
    return "Email is required.";
  }

  if (!password) {
    return "Password is required.";
  }

  if (!confirmPassword) {
    return "Confirm password is required.";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return null;
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
        setSuccessMessage("Account created. Check your email to confirm, then log in.");
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
      <div className="pointer-events-none absolute inset-x-0 top-[max(3rem,env(safe-area-inset-top))] flex justify-center sm:inset-y-0 sm:items-center sm:justify-end sm:pr-[max(1rem,calc((100vw-28rem)/2-8rem))]">
        <FtcBrandMotionLazy variant="ambient" />
      </div>

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
            <p className="text-sm text-ftc-primary/90">{successMessage}</p>
          ) : null}

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full ftc-btn-primary w-full px-4 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

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
