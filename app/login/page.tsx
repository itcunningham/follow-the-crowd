"use client";

import { isAuthApiError } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isPasswordRecoveryUrl } from "@/lib/auth/appUrl";
import { supabase } from "@/lib/supabaseClient";
import {
  getPostAuthRedirectPath,
  SIGNUP_PATH,
  FORGOT_PASSWORD_PATH,
  signInWithEmail,
  updateAuthPassword,
} from "@/lib/user/currentUser";

function getLoginErrorMessage(error: unknown): string {
  if (isAuthApiError(error)) {
    if (error.code === "invalid_credentials") {
      return "Incorrect email or password";
    }

    if (error.code === "email_not_confirmed") {
      return "Please confirm your email before logging in";
    }
  }

  return error instanceof Error ? error.message : "Failed to log in";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (isPasswordRecoveryUrl()) {
      setRecoveryMode(true);
    }

    void supabase.auth.getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || isPasswordRecoveryUrl()) {
        setRecoveryMode(true);
      }
    });

    setCheckingRecovery(false);

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await signInWithEmail(email, password);
      const redirectPath = await getPostAuthRedirectPath();
      router.replace(redirectPath);
    } catch (signInError) {
      console.error("Login failed:", signInError);
      setError(getLoginErrorMessage(signInError));
      setSubmitting(false);
    }
  }

  async function handleRecoverySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setSubmitting(false);
      return;
    }

    try {
      await updateAuthPassword(newPassword);
      const redirectPath = await getPostAuthRedirectPath();
      router.replace(redirectPath);
    } catch (recoveryError) {
      console.error("Password recovery failed:", recoveryError);
      setError(
        recoveryError instanceof Error ? recoveryError.message : "Failed to update password",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-start justify-center overflow-hidden bg-ftc-bg px-4 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] font-sans text-ftc-text sm:items-center sm:py-10">
      <div className="relative z-10 ftc-card-raised w-full max-w-md p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ftc-primary">
          Follow The Crowd
        </p>
        <h1 className="mt-3 text-2xl font-bold text-ftc-text">
          {recoveryMode ? "Set a new password" : "Welcome"}
        </h1>
        <p className="mt-2 text-sm text-ftc-text-secondary">
          {recoveryMode
            ? "Choose a new password for your account"
            : "Sign in to continue"}
        </p>

        {checkingRecovery ? (
          <p className="mt-8 text-sm text-ftc-text-muted">Loading...</p>
        ) : recoveryMode ? (
          <form onSubmit={handleRecoverySubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
                New password
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
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

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full ftc-btn-primary px-4 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving" : "Set password"}
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleLoginSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-secondary">
                  Email
                </span>
                <input
                  type="email"
                  aria-label="Email"
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
                  aria-label="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="ftc-input px-3.5 py-2.5"
                />
              </label>

              {error ? <p className="text-sm text-red-400">{error}</p> : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full ftc-btn-primary px-4 py-3 text-sm tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Logging in" : "Log in"}
              </button>
            </form>

            {/* Inside the non-recovery branch only: offering "Forgot password?"
                to someone already setting a new one would send them back to the
                start of the flow they are finishing. */}
            <p className="mt-4 text-center text-sm">
              <Link
                href={FORGOT_PASSWORD_PATH}
                className="font-semibold text-ftc-primary transition hover:text-ftc-primary/90"
              >
                Forgot password?
              </Link>
            </p>

            <p className="mt-6 text-center text-sm text-ftc-text-muted">
              Don&apos;t have an account?{" "}
              <Link
                href={SIGNUP_PATH}
                className="font-semibold text-ftc-primary transition hover:text-ftc-primary/90"
              >
                Sign up
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
