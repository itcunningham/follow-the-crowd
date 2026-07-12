/** Reads the Supabase auth user id from browser storage without a network call. */
export function readSupabaseSessionUserIdSync(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    return null;
  }

  let projectRef: string | null = null;

  try {
    projectRef = new URL(supabaseUrl).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }

  if (!projectRef) {
    return null;
  }

  const raw = window.localStorage.getItem(`sb-${projectRef}-auth-token`);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      user?: { id?: string };
      currentSession?: { user?: { id?: string } };
    };

    const userId = parsed.user?.id ?? parsed.currentSession?.user?.id ?? null;
    return typeof userId === "string" && userId.trim() ? userId : null;
  } catch {
    return null;
  }
}
