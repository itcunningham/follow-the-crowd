"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppNavigation, { MOBILE_NAV_OFFSET_CLASS } from "@/app/components/AppNavigation";
import OnboardingGuard from "@/app/components/OnboardingGuard";
import ProfileAvatar from "@/app/components/ProfileAvatar";
import { startDm } from "@/lib/startDm";
import {
  getCurrentUserId,
  DISCOVER_PATH,
  SETTINGS_PATH,
  getRoleLabel,
  getUserProfileById,
  PROFILE_SETUP_PATH,
  type UserProfile,
  type UserRole,
} from "@/lib/user/currentUser";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messaging, setMessaging] = useState(false);

  useEffect(() => {
    if (!userId) {
      return;
    }

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const [userProfile, authUserId] = await Promise.all([
          getUserProfileById(userId),
          getCurrentUserId(),
        ]);
        setCurrentUserId(authUserId);

        if (!userProfile?.display_name?.trim()) {
          setProfile(null);
          setError("Profile not found.");
          setLoading(false);
          return;
        }

        setProfile(userProfile);
      } catch (loadError) {
        console.error("Failed to load profile:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [userId]);

  async function handleMessage() {
    if (!profile) {
      return;
    }

    setMessaging(true);
    setError(null);

    try {
      const currentUserId = await getCurrentUserId();
      const conversationId = await startDm(currentUserId, profile.user_id);
      router.push(`/dm/${conversationId}`);
    } catch (messageError) {
      console.error("startDm failed from profile page:", messageError);
      setError(messageError instanceof Error ? messageError.message : "Failed to start message");
      setMessaging(false);
    }
  }

  const displayName = profile?.display_name ?? "Profile";
  const isOwnProfile = profile?.user_id === currentUserId;
  const showDjSections = profile?.role === "dj" || profile?.role === "both";
  const showPromoterSections = profile?.role === "promoter" || profile?.role === "both";

  function getMessageButtonLabel(): string {
    if (profile?.role === "dj") {
      return messaging ? "Opening..." : "Message / Book DJ";
    }

    if (profile?.role === "promoter") {
      return messaging ? "Opening..." : "Message Promoter";
    }

    return messaging ? "Opening..." : "Message";
  }

  return (
    <OnboardingGuard>
      <div
        className={`mx-auto min-h-[100dvh] w-full max-w-2xl bg-ftc-bg font-sans text-ftc-text ${MOBILE_NAV_OFFSET_CLASS}`}
      >
        <AppNavigation />

        <header className="flex items-center justify-between border-b border-ftc-border px-4 py-3 sm:px-6 md:pt-4">
          <Link
            href={DISCOVER_PATH}
            className="inline-block text-xs font-semibold uppercase tracking-wide text-ftc-text-muted transition hover:text-ftc-primary"
          >
            ← Discover
          </Link>
          {userId === currentUserId ? (
            <div className="flex items-center gap-2">
              <Link
                href={SETTINGS_PATH}
                aria-label="Settings"
                className="flex items-center gap-1.5 rounded-lg border border-ftc-border-strong bg-ftc-surface/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-primary/35 hover:text-ftc-primary"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
                Settings
              </Link>
              <Link
                href={PROFILE_SETUP_PATH}
                className="rounded-lg border border-ftc-border-strong bg-ftc-surface/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ftc-text-secondary transition hover:border-ftc-primary/35 hover:text-ftc-primary"
              >
                Edit profile
              </Link>
            </div>
          ) : null}
        </header>

        <div className="px-4 py-8 sm:px-6">
          {loading ? (
            <p className="text-sm text-ftc-text-muted">Loading profile...</p>
          ) : error && !profile ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : profile ? (
            <div className="mx-auto max-w-lg space-y-6">
              <div className="text-center">
                <ProfileAvatar
                  name={displayName}
                  avatarUrl={profile.avatar_url}
                  size="xl"
                  className="mx-auto"
                />

                <h1 className="mt-5 text-2xl font-semibold text-ftc-text">{displayName}</h1>

                <div className="mt-3 flex justify-center">
                  <RoleBadge role={profile.role} />
                </div>

                {profile.location ? (
                  <p className="mt-3 text-sm text-ftc-text-muted">{profile.location}</p>
                ) : null}
              </div>

              {showDjSections ? <DjProfileSections profile={profile} /> : null}
              {showPromoterSections ? <PromoterProfileSections profile={profile} /> : null}

              {!isOwnProfile ? (
                <div className="pt-2">
                  <MessageButton
                    label={getMessageButtonLabel()}
                    disabled={messaging}
                    onClick={handleMessage}
                  />
                </div>
              ) : null}

              {error ? <p className="text-sm text-red-400">{error}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </OnboardingGuard>
  );
}

function DjProfileSections({ profile }: { profile: UserProfile }) {
  return (
    <div className="space-y-4">
      {profile.role === "both" ? (
        <SectionHeading title="DJ / Artist" />
      ) : null}

      <ProfileSection title="Genres">
        <p className="text-sm leading-relaxed text-ftc-text-secondary">
          {profile.genre?.trim() || "No genres listed yet."}
        </p>
      </ProfileSection>

      <ProfileSection title="Bio">
        <p className="text-sm leading-relaxed text-ftc-text-secondary">
          {profile.bio?.trim() || "No bio yet."}
        </p>
      </ProfileSection>

      <ProfileSection title="Links">
        <SocialLinks profile={profile} showSoundCloud showInstagram />
      </ProfileSection>

      <ProfileSection title="Calendar">
        <p className="text-sm leading-relaxed text-ftc-text-secondary">
          Manage availability and bookings in{" "}
          <Link href="/bookings" className="font-semibold text-ftc-primary transition hover:text-ftc-primary/90">
            Gigs
          </Link>
          .
        </p>
      </ProfileSection>

      <ProfileSection title="Past Gigs">
        <ProfileTextContent value={profile.dj_past_gigs} emptyLabel="No past gigs listed yet." />
      </ProfileSection>
    </div>
  );
}

function PromoterProfileSections({ profile }: { profile: UserProfile }) {
  return (
    <div className="space-y-4">
      {profile.role === "both" ? (
        <SectionHeading title="Promoter" />
      ) : null}

      <ProfileSection title="Event Style / Genre">
        <p className="text-sm leading-relaxed text-ftc-text-secondary">
          {profile.genre?.trim() || "No event style listed yet."}
        </p>
      </ProfileSection>

      <ProfileSection title="Bio">
        <p className="text-sm leading-relaxed text-ftc-text-secondary">
          {profile.bio?.trim() || "No bio yet."}
        </p>
      </ProfileSection>

      <ProfileSection title="Links">
        <SocialLinks profile={profile} showInstagram />
      </ProfileSection>

      <ProfileSection title="Venues Used">
        <ProfileTextContent
          value={profile.promoter_venues_used}
          emptyLabel="No venues listed yet."
        />
      </ProfileSection>

      <ProfileSection title="Upcoming Events">
        <ProfileTextContent
          value={profile.promoter_upcoming_events}
          emptyLabel="No upcoming events listed yet."
        />
      </ProfileSection>

      <ProfileSection title="Past Events">
        <ProfileTextContent
          value={profile.promoter_past_events}
          emptyLabel="No past events listed yet."
        />
      </ProfileSection>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="border-b border-ftc-border pb-2 text-sm font-semibold uppercase tracking-wide text-ftc-text-secondary">
      {title}
    </h2>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ftc-card p-4 sm:p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ftc-primary">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ProfileTextContent({
  value,
  emptyLabel,
}: {
  value: string | null;
  emptyLabel: string;
}) {
  const text = value?.trim();

  if (!text) {
    return <p className="text-sm text-ftc-text-muted">{emptyLabel}</p>;
  }

  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-ftc-text-secondary">{text}</p>;
}

function SocialLinks({
  profile,
  showInstagram = false,
  showSoundCloud = false,
}: {
  profile: UserProfile;
  showInstagram?: boolean;
  showSoundCloud?: boolean;
}) {
  const links: { href: string; label: string }[] = [];

  if (showInstagram && profile.instagram_url) {
    links.push({ href: profile.instagram_url, label: "Instagram" });
  }

  if (showSoundCloud && profile.soundcloud_url) {
    links.push({ href: profile.soundcloud_url, label: "SoundCloud" });
  }

  if (links.length === 0) {
    return <p className="text-sm text-ftc-text-muted">No links added yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-ftc-primary/25 bg-ftc-primary/10 px-3 py-2 text-sm font-medium text-ftc-primary transition hover:border-ftc-primary/40 hover:bg-ftc-primary/12 hover:text-ftc-primary/90"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

function MessageButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full ftc-btn-primary px-5 py-3 text-sm uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function RoleBadge({ role }: { role: UserRole | null }) {
  return (
    <span className="rounded-full border border-ftc-primary/25 bg-ftc-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ftc-primary">
      {getRoleLabel(role)}
    </span>
  );
}
