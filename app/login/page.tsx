"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  getPostAuthRedirectPath,
  SIGNUP_PATH,
  signInWithEmail,
} from "@/lib/user/currentUser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signInWithEmail(email, password);
      const redirectPath = await getPostAuthRedirectPath();
      router.replace(redirectPath);
    } catch (signInError) {
      console.error("Login failed:", signInError);
      setError(signInError instanceof Error ? signInError.message : "Failed to log in");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-ftc-bg px-4 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] font-sans text-ftc-text sm:items-center sm:py-10">
      <div className="ftc-card-raised w-full max-w-md p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ftc-primary">
          Follow The Crowd
        </p>
        <h1 className="mt-3 text-2xl font-bold text-ftc-text">Log in</h1>
        <p className="mt-2 text-sm text-ftc-text-secondary">Welcome back. Sign in to continue.</p>

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
              autoComplete="current-password"
              required
              className="ftc-input px-3.5 py-2.5"
            />
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full ftc-btn-primary w-full px-4 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ftc-text-muted">
          Don&apos;t have an account?{" "}
          <Link href={SIGNUP_PATH} className="font-semibold text-ftc-primary transition hover:text-ftc-primary/90">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
