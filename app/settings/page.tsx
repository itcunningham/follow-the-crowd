"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import {
  CURRENT_USER_ID,
  getCurrentUserProfile,
  getRoleLabel,
  saveUserRole,
  type UserRole,
} from "@/lib/user/currentUser";

const MY_PROFILE_PATH_LINK = `/profile/${CURRENT_USER_ID}`;

const ACCOUNT_TYPE_OPTIONS: {
  role: UserRole;
  title: string;
  description: string;
}[] = [
  {
    role: "dj",
    title: "DJ / Artist",
    description: "Messages, Discover, Bookings Received, and your artist profile.",
  },
  {
    role: "promoter",
    title: "Event Planner",
    description: "Event AI, Discover, Bookings Sent, Messages, and your planner profile.",
  },
  {
    role: "both",
    title: "Both",
    description: "Plan events and manage bookings as both a planner and artist.",
  },
];

export default function SettingsPage() {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserProfile()
      .then((profile) => {
        setCurrentRole(profile?.role ?? null);
      })
      .catch((loadError) => {
        console.error("Failed to load settings profile:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load settings");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleSelectRole(role: UserRole) {
    if (savingRole || role === currentRole) {
      return;
    }

    setSavingRole(role);
    setError(null);
    setSuccessMessage(null);

    try {
      await saveUserRole(role);
      setCurrentRole(role);
      setSuccessMessage("Account type updated");
    } catch (saveError) {
      console.error("Failed to update account type:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to update account type");
    } finally {
      setSavingRole(null);
    }
  }

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-[#070708] font-sans text-zinc-100 ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />

        <header className="border-b border-zinc-800/80 px-4 py-4 sm:px-6 md:pt-4">
          <Link
            href={MY_PROFILE_PATH_LINK}
            className="inline-block text-xs font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-blue-400"
          >
            ← My Profile
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-zinc-50">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your Follow The Crowd account preferences.
          </p>
        </header>

        <div className="px-4 py-6 sm:px-6">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading settings...</p>
          ) : (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 sm:p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                Account type
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Current type:{" "}
                <span className="font-medium text-zinc-300">{getRoleLabel(currentRole)}</span>
              </p>

              <div className="mt-4 space-y-3">
                {ACCOUNT_TYPE_OPTIONS.map((option) => {
                  const isSelected = currentRole === option.role;
                  const isSaving = savingRole === option.role;

                  return (
                    <button
                      key={option.role}
                      type="button"
                      disabled={savingRole !== null}
                      onClick={() => handleSelectRole(option.role)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:py-5 ${
                        isSelected
                          ? "border-blue-500/50 bg-blue-600/15 shadow-[0_0_24px_rgba(59,130,246,0.14)]"
                          : "border-zinc-800 bg-zinc-950/40 hover:border-blue-500/30 hover:bg-blue-600/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p
                            className={`text-base font-semibold sm:text-lg ${
                              isSelected ? "text-blue-100" : "text-zinc-50"
                            }`}
                          >
                            {option.title}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                            {option.description}
                          </p>
                        </div>
                        {isSelected ? (
                          <span className="shrink-0 rounded-full border border-blue-500/40 bg-blue-600/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      {isSaving ? (
                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-blue-400">
                          Updating...
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {successMessage ? (
                <p className="mt-4 rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-3 text-sm text-blue-200">
                  {successMessage}
                </p>
              ) : null}

              {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
            </section>
          )}
        </div>
      </div>
    </OnboardingGuard>
  );
}
