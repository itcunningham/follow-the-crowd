import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in .env.local");
}

if (!supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
}

if (!supabaseUrl.startsWith("https://") || !supabaseUrl.includes(".supabase.co")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL (https://xxxxx.supabase.co)",
  );
}

/**
 * Without an explicit `auth.storage`, @supabase/auth-js runs its own
 * `supportsLocalStorage()` self-test ONCE at client construction: it does a
 * single localStorage write/remove, and if that throws for any reason, it
 * falls back to an in-memory store for the ENTIRE lifetime of this client —
 * silently, with no retry. A cold-launched iOS Home Screen PWA (fresh
 * WKWebView process, worse on older/lower-storage devices) can hit a
 * transient localStorage access hiccup at exactly that moment: the real,
 * unexpired session sits untouched in actual localStorage, but this launch's
 * client never looks at it, getSession() returns null, and the app redirects
 * to /login as if the user had signed out.
 *
 * This wraps the SAME storage (window.localStorage — no different mechanism,
 * no weaker security, same token handling) with per-call try/catch instead
 * of one make-or-break self-test, so a transient failure on a single read or
 * write doesn't disable persistence for the whole session.
 */
const resilientLocalStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Swallow — a transient write failure must not crash auth; this
      // particular update just doesn't persist, same as before this file
      // existed. It does not disable persistence for later calls.
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Swallow, same reasoning as setItem.
    }
  },
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: resilientLocalStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
