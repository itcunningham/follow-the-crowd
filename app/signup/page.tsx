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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const validationError = validateSignupForm(email, password, confirmPassword);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const { session } = await signUpWithEmail(email, password);

      if (!session) {
        setError("Account created. Check your email to confirm, then log in.");
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#070708] px-4 py-10 font-sans text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-[0_0_40px_rgba(59,130,246,0.12)] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400">
          Follow The Crowd
        </p>
        <h1 className="mt-3 text-2xl font-bold text-zinc-50">Create account</h1>
        <p className="mt-2 text-sm text-zinc-400">Join Follow The Crowd with email and password.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Confirm password
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
            />
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl border border-blue-500/45 bg-blue-600/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href={LOGIN_PATH} className="font-semibold text-blue-300 transition hover:text-blue-200">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
