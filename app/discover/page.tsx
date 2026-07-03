"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { startDm } from "@/lib/startDm";
import {
  getCurrentUserId,
  getCurrentUserProfile,
  getRoleLabel,
  listDiscoverUsers,
  type UserProfile,
  type UserRole,
} from "@/lib/user/currentUser";

export default function DiscoverPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messagingUserId, setMessagingUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDiscoverUsers() {
      setLoading(true);
      setError(null);

      try {
        const profile = await getCurrentUserProfile();

        if (!profile?.role) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const discoverUsers = await listDiscoverUsers(profile.role);
        setUsers(discoverUsers);
      } catch (loadError) {
        console.error("Failed to load discover users:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    loadDiscoverUsers();
  }, []);

  async function handleMessageUser(targetUserId: string) {
    setMessagingUserId(targetUserId);
    setError(null);

    try {
      const currentUserId = await getCurrentUserId();
      const conversationId = await startDm(currentUserId, targetUserId);
      router.push(`/dm/${conversationId}`);
    } catch (messageError) {
      console.error("startDm failed from /discover:", messageError);
      setError(messageError instanceof Error ? messageError.message : "Failed to start message");
      setMessagingUserId(null);
    }
  }

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-[#070708] font-sans text-zinc-100 ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />
        <header className="border-b border-zinc-800/80 px-4 py-4 sm:px-6 md:pt-4">
          <h1 className="text-xl font-semibold text-zinc-50">Discover</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Browse DJs and promoters in the scene. Message anyone or send bulk booking requests
            from Bookings.
          </p>
        </header>

        <div className="px-4 py-4 sm:px-6">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading people...</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-zinc-500">No profiles to discover yet.</p>
          ) : (
            <ul className="space-y-4">
              {users.map((user) => (
                <DiscoverCard
                  key={user.user_id}
                  user={user}
                  messaging={messagingUserId === user.user_id}
                  onMessage={() => handleMessageUser(user.user_id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </OnboardingGuard>
  );
}

function DiscoverCard({
  user,
  messaging,
  onMessage,
}: {
  user: UserProfile;
  messaging: boolean;
  onMessage: () => void;
}) {
  const displayName = user.display_name ?? "Unknown";
  const bioPreview = user.bio?.trim() || "No bio yet.";

  return (
    <li className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 transition hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.08)]">
      <Link href={`/profile/${user.user_id}`} className="block p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ProfileAvatar name={displayName} avatarUrl={user.avatar_url} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-zinc-100">{displayName}</h2>
              <RoleBadge role={user.role} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
              {user.genre ? <span>{user.genre}</span> : null}
              {user.location ? <span>{user.location}</span> : null}
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-400">
              {bioPreview}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {user.instagram_url ? (
                <span className="font-medium text-blue-400">Instagram</span>
              ) : null}
              {user.soundcloud_url ? (
                <span className="font-medium text-blue-400">SoundCloud</span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
      <div className="border-t border-zinc-800/80 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onMessage}
          disabled={messaging}
          className="rounded-xl border border-blue-500/45 bg-blue-600/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.22)] transition hover:border-blue-400/60 hover:bg-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {messaging ? "Opening..." : "Message"}
        </button>
      </div>
    </li>
  );
}

function RoleBadge({ role }: { role: UserRole | null }) {
  return (
    <span className="rounded-full border border-blue-500/30 bg-blue-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
      {getRoleLabel(role)}
    </span>
  );
}
