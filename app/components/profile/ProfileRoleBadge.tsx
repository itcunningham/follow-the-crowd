"use client";

import { getRoleLabel, type UserRole } from "@/lib/user/currentUser";

export default function ProfileRoleBadge({ role }: { role: UserRole | null }) {
  return (
    <span className="inline-flex rounded-full border border-ftc-border-subtle bg-ftc-bg-elevated px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ftc-text-secondary">
      {getRoleLabel(role)}
    </span>
  );
}
