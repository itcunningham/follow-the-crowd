"use client";

import { createContext, useContext } from "react";
import type { UserProfile } from "@/lib/user/currentUser";

const GuardProfileContext = createContext<UserProfile | null>(null);

export function GuardProfileProvider({
  profile,
  children,
}: {
  profile: UserProfile | null;
  children: React.ReactNode;
}) {
  return (
    <GuardProfileContext.Provider value={profile}>{children}</GuardProfileContext.Provider>
  );
}

export function useGuardProfile(): UserProfile | null {
  return useContext(GuardProfileContext);
}
