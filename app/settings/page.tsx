"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import RequestAccountDeletionSection from "@/app/components/settings/RequestAccountDeletionSection";
import {
  getCurrentAuthUser,
  getCurrentUserId,
  getCurrentUserProfile,
  LOGIN_PATH,
  requestPasswordResetEmail,
  signOut,
} from "@/lib/user/currentUser";

export default function SettingsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myProfilePath = currentUserId ? `/profile/${currentUserId}` : "/profile/setup";

  useEffect(() => {
    Promise.all([getCurrentAuthUser(), getCurrentUserId(), getCurrentUserProfile()])
      .then(([authUser, userId, profile]) => {
        setCurrentUserId(userId);
        setAccountEmail(authUser?.email?.trim() || null);
        setUsername(profile?.username?.trim() || null);
      })
      .catch((loadError) => {
        console.error("Failed to load settings:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load settings");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleResetPassword() {
    if (!accountEmail || resettingPassword) {
      return;
    }

    setResettingPassword(true);
    setError(null);
    setPasswordResetMessage(null);

    try {
      await requestPasswordResetEmail(accountEmail);
      setPasswordResetMessage("Password reset email sent. Check your inbox.");
    } catch (resetError) {
      console.error("Failed to send password reset email:", resetError);
      setError(
        resetError instanceof Error ? resetError.message : "Failed to send password reset email",
      );
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);

    try {
      await signOut();
      router.replace(LOGIN_PATH);
    } catch (signOutError) {
      console.error("Failed to sign out:", signOutError);
      setError(signOutError instanceof Error ? signOutError.message : "Failed to sign out");
      setSigningOut(false);
    }
  }

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />

        <header className="border-b border-ftc-border px-4 py-4 sm:px-6 md:pt-4">
          <Link
            href={myProfilePath}
            className="inline-block text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-primary"
          >
            ← My Profile
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-ftc-text">Settings</h1>
          <p className="mt-1 text-sm text-ftc-text-muted">Account and support for private beta</p>
        </header>

        <div className="space-y-4 px-4 py-6 sm:px-6">
          {loading ? (
            <p className="text-sm text-ftc-text-muted">Loading settings...</p>
          ) : (
            <>
              <section className="ftc-card overflow-hidden p-0">
                <div className="border-b border-ftc-border-subtle px-4 py-3 sm:px-5">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-ftc-primary">
                    Account
                  </h2>
                </div>

                <div className="border-b border-ftc-border-subtle px-4 py-4 sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ftc-text-muted">
                    Email address
                  </p>
                  <p className="mt-1 break-all text-sm font-medium text-ftc-text">
                    {accountEmail ?? "Email unavailable"}
                  </p>
                </div>

                <div className="border-b border-ftc-border-subtle px-4 py-4 sm:px-5">
                  <button
                    type="button"
                    onClick={() => void handleResetPassword()}
                    disabled={!accountEmail || resettingPassword}
                    className="rounded-xl border border-ftc-border-subtle bg-ftc-surface px-4 py-3 text-sm font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resettingPassword ? "Sending..." : "Reset password"}
                  </button>
                  {passwordResetMessage ? (
                    <p className="mt-3 text-sm text-ftc-primary">{passwordResetMessage}</p>
                  ) : null}
                </div>

                <div className="px-4 py-4 sm:px-5">
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {signingOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              </section>

              <RequestAccountDeletionSection accountEmail={accountEmail} username={username} />

              {error ? <p className="text-sm text-red-400">{error}</p> : null}
            </>
          )}
        </div>
      </div>
    </OnboardingGuard>
  );
}
