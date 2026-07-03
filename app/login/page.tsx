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
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#070708] px-4 py-10 font-sans text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-[0_0_40px_rgba(59,130,246,0.12)] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-400">
          Follow The Crowd
        </p>
        <h1 className="mt-3 text-2xl font-bold text-zinc-50">Log in</h1>
        <p className="mt-2 text-sm text-zinc-400">Welcome back. Sign in to continue.</p>

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
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/15"
            />
          </label>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl border border-blue-500/45 bg-blue-600/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link href={SIGNUP_PATH} className="font-semibold text-blue-300 transition hover:text-blue-200">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
