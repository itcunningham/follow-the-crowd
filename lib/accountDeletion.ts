import { supabase } from "@/lib/supabaseClient";

export const ACCOUNT_DELETION_FAILED_MESSAGE =
  "We couldn't delete your account. Please try again.";

export type AccountDeletionBlockers = {
  blocked: boolean;
  reasons: string[];
};

function parseBlockersPayload(data: unknown): AccountDeletionBlockers {
  if (!data || typeof data !== "object") {
    return { blocked: false, reasons: [] };
  }

  const payload = data as { blocked?: boolean; reasons?: unknown };

  return {
    blocked: Boolean(payload.blocked),
    reasons: Array.isArray(payload.reasons)
      ? payload.reasons.filter((reason): reason is string => typeof reason === "string")
      : [],
  };
}

export async function checkAccountDeletionBlockers(): Promise<AccountDeletionBlockers> {
  const { data, error } = await supabase.rpc("check_account_deletion_blockers");

  if (error) {
    throw error;
  }

  return parseBlockersPayload(data);
}

export async function deleteAccount(confirmation: string): Promise<void> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const response = await fetch("/api/account/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ confirmation }),
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.error || ACCOUNT_DELETION_FAILED_MESSAGE);
  }
}
