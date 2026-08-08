"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import FtcAppVersionFooter from "@/app/components/settings/FtcAppVersionFooter";
import RequestAccountDeletionSection from "@/app/components/settings/RequestAccountDeletionSection";
import {
  getCurrentAuthUser,
  getCurrentUserId,
  canManageEvents,
  getCurrentUserProfile,
  LOGIN_PATH,
  type UserRole,
  requestPasswordResetEmail,
  signOut,
} from "@/lib/user/currentUser";

const PASSWORD_RESET_COOLDOWN_MS = 60_000;

export default function SettingsPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetCooldown, setPasswordResetCooldown] = useState(false);
  const [passwordResetMessage, setPasswordResetMessage] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myProfilePath = currentUserId ? `/profile/${currentUserId}` : "/profile/setup";

  useEffect(() => {
    Promise.all([getCurrentAuthUser(), getCurrentUserId(), getCurrentUserProfile()])
      .then(([authUser, userId, profile]) => {
        setCurrentUserId(userId);
        setAccountEmail(authUser?.email?.trim() || null);
        setUsername(profile?.username?.trim() || null);
        setRole(profile?.role ?? null);
      })
      .catch((loadError) => {
        console.error("Failed to load settings:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load settings");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!passwordResetCooldown) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPasswordResetCooldown(false);
    }, PASSWORD_RESET_COOLDOWN_MS);

    return () => window.clearTimeout(timeout);
  }, [passwordResetCooldown]);

  async function handleResetPassword() {
    if (!accountEmail || resettingPassword || passwordResetCooldown) {
      return;
    }

    setResettingPassword(true);
    setError(null);
    setPasswordResetMessage(null);

    try {
      await requestPasswordResetEmail(accountEmail);
      setPasswordResetMessage("Password reset email sent — check your inbox");
      setPasswordResetCooldown(true);
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
          <p className="mt-1 text-sm text-ftc-text-muted">Workspace, account and support for private beta</p>
        </header>

        <div className="space-y-4 px-4 py-6 sm:px-6">
          {loading ? (
            <p className="text-sm text-ftc-text-muted">Loading settings...</p>
          ) : (
            <>
              {/* Workspace features sit above account admin: roster management is
                  a routine planner task, and it should not be buried beneath
                  password reset and the delete-account section. */}
              {canManageEvents(role) ? (
                <section className="ftc-card overflow-hidden p-0">
                  <div className="border-b border-ftc-border-subtle px-4 py-3 sm:px-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-ftc-primary">
                      Workspace
                    </h2>
                  </div>

                  <Link
                    href="/my-djs"
                    className="flex items-center justify-between gap-3 px-4 py-4 transition hover:bg-ftc-bg-elevated/60 sm:px-5"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ftc-text">DJ Roster</span>
                      <span className="mt-0.5 block text-sm text-ftc-text-muted">
                        Manage the DJs you work with
                      </span>
                    </span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-ftc-text-muted"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                </section>
              ) : null}

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

                <div className="px-4 py-4 sm:px-5">
                  <button
                    type="button"
                    onClick={() => void handleResetPassword()}
                    disabled={!accountEmail || resettingPassword || passwordResetCooldown}
                    className="rounded-xl border border-ftc-border-subtle bg-ftc-surface px-4 py-3 text-sm font-semibold text-ftc-text-secondary transition hover:border-ftc-border-strong hover:text-ftc-text disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resettingPassword
                      ? "Sending"
                      : passwordResetCooldown
                        ? "Email sent"
                        : "Reset password"}
                  </button>
                  {passwordResetMessage ? (
                    <p className="mt-3 text-sm text-ftc-primary">{passwordResetMessage}</p>
                  ) : null}
                </div>

                <div className="border-t border-ftc-border-subtle px-4 pb-4 pt-6 sm:px-5">
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {signingOut ? "Signing out" : "Sign out"}
                  </button>
                </div>
              </section>

              {/* Above the deletion section so the documents describing what
                  deletion does sit before the control that performs it. */}
              <section className="ftc-card overflow-hidden p-0">
                <div className="border-b border-ftc-border-subtle px-4 py-3 sm:px-5">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-ftc-primary">
                    Legal
                  </h2>
                </div>

                {[
                  { href: "/terms", label: "Terms & Conditions" },
                  { href: "/privacy", label: "Privacy Policy" },
                ].map((row, index) => (
                  <Link
                    key={row.href}
                    href={row.href}
                    className={`flex items-center justify-between gap-3 px-4 py-4 transition hover:bg-ftc-bg-elevated/60 sm:px-5 ${
                      index === 0 ? "border-b border-ftc-border-subtle" : ""
                    }`}
                  >
                    <span className="text-sm font-semibold text-ftc-text">{row.label}</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-ftc-text-muted"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Link>
                ))}
              </section>

              <RequestAccountDeletionSection accountEmail={accountEmail} username={username} />

              {error ? <p className="text-sm text-red-400">{error}</p> : null}
            </>
          )}

          <FtcAppVersionFooter />
        </div>
      </div>
    </OnboardingGuard>
  );
}
