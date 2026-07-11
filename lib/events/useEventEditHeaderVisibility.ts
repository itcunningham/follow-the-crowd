"use client";

import { useEffect, useState } from "react";
import type { Event } from "@/lib/events";
import { getEventOwnerId } from "@/lib/events";
import { readCachedNavigation } from "@/lib/navigationRoleCache";
import { canManageEvents, type UserRole } from "@/lib/user/currentUser";

const eventOwnerIdCache = new Map<string, string | null>();

export function resolveEventEditAuthContext(
  role: UserRole | null | undefined,
  currentUserId: string | null | undefined,
): { role: UserRole | null; currentUserId: string | null } {
  const cached = readCachedNavigation();

  return {
    role: role ?? cached.role,
    currentUserId: currentUserId ?? cached.userId,
  };
}

export function canShowEventEditInHeader({
  role,
  currentUserId,
  knownOwnerId,
}: {
  role: UserRole | null | undefined;
  currentUserId: string | null | undefined;
  knownOwnerId: string | null | undefined;
}): boolean {
  const auth = resolveEventEditAuthContext(role, currentUserId);

  if (!canManageEvents(auth.role) || !auth.currentUserId) {
    return false;
  }

  if (knownOwnerId === undefined) {
    return false;
  }

  if (!knownOwnerId) {
    return false;
  }

  return knownOwnerId === auth.currentUserId;
}

export type EventEditHeaderState = "pending" | "show" | "hidden";

export function resolveEventEditHeaderState({
  role,
  currentUserId,
  knownOwnerId,
}: {
  role: UserRole | null | undefined;
  currentUserId: string | null | undefined;
  knownOwnerId: string | null | undefined;
}): EventEditHeaderState {
  if (canShowEventEditInHeader({ role, currentUserId, knownOwnerId })) {
    return "show";
  }

  const auth = resolveEventEditAuthContext(role, currentUserId);

  if (auth.role !== null && !canManageEvents(auth.role)) {
    return "hidden";
  }

  if (
    knownOwnerId !== undefined &&
    auth.currentUserId &&
    canManageEvents(auth.role) &&
    knownOwnerId !== auth.currentUserId
  ) {
    return "hidden";
  }

  if (knownOwnerId === undefined || !auth.currentUserId || auth.role === null) {
    return "pending";
  }

  return "hidden";
}

export function useEventEditHeaderState({
  eventId,
  role,
  currentUserId,
  event,
}: {
  eventId: string | undefined;
  role: UserRole | null | undefined;
  currentUserId: string | null | undefined;
  event?: Event | null;
}): EventEditHeaderState {
  const [fetchedOwnerId, setFetchedOwnerId] = useState<string | null | undefined>(() => {
    if (!eventId || event?.owner_id) {
      return undefined;
    }

    return eventOwnerIdCache.has(eventId) ? eventOwnerIdCache.get(eventId) : undefined;
  });

  useEffect(() => {
    if (eventId && event?.owner_id) {
      eventOwnerIdCache.set(eventId, event.owner_id);
    }
  }, [event?.owner_id, eventId]);

  useEffect(() => {
    if (!eventId || event?.owner_id) {
      return;
    }

    if (eventOwnerIdCache.has(eventId)) {
      setFetchedOwnerId(eventOwnerIdCache.get(eventId) ?? null);
      return;
    }

    let cancelled = false;
    setFetchedOwnerId(undefined);

    getEventOwnerId(eventId)
      .then((ownerId) => {
        eventOwnerIdCache.set(eventId, ownerId);

        if (!cancelled) {
          setFetchedOwnerId(ownerId);
        }
      })
      .catch((loadError) => {
        console.error("Failed to load event ownership:", loadError);

        if (!cancelled) {
          setFetchedOwnerId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [event?.owner_id, eventId]);

  const knownOwnerId = event?.owner_id ?? fetchedOwnerId;

  return resolveEventEditHeaderState({
    role,
    currentUserId,
    knownOwnerId,
  });
}

export function useEventEditHeaderVisibility({
  eventId,
  role,
  currentUserId,
  event,
}: {
  eventId: string | undefined;
  role: UserRole | null | undefined;
  currentUserId: string | null | undefined;
  event?: Event | null;
}): boolean {
  return useEventEditHeaderState({
    eventId,
    role,
    currentUserId,
    event,
  }) === "show";
}
