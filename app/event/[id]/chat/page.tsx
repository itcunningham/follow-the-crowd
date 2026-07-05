"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LegacyEventChatRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params.id;

  useEffect(() => {
    if (eventId) {
      router.replace(`/events/${eventId}/chat`);
    }
  }, [eventId, router]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ftc-bg text-sm text-ftc-text-muted">
      Redirecting to group chat...
    </div>
  );
}
