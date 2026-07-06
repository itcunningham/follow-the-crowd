import { createClient } from "@supabase/supabase-js";

export type AuthenticatedSupabaseRequest = {
  userId: string;
  accessToken: string;
};

function getSupabaseProjectUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  return url;
}

function getSupabaseAnonKey(): string {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return anonKey;
}

export async function authenticateSupabaseRequest(
  request: Request,
): Promise<AuthenticatedSupabaseRequest | null> {
  const authHeader = request.headers.get("Authorization");
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  if (!accessToken) {
    return null;
  }

  const userClient = createClient(getSupabaseProjectUrl(), getSupabaseAnonKey(), {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await userClient.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return {
    userId: data.user.id,
    accessToken,
  };
}
