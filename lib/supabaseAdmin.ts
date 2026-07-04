import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_SECRET_KEY_NAME = "SUPABASE_SECRET_KEY";

export type SupabaseSecretKeyDebug = {
  routeHit: boolean;
  secretKeyExists: boolean;
  secretKeyTrimmedLength: number;
  selectedKeyName: typeof SUPABASE_SECRET_KEY_NAME | null;
};

function getSupabaseProjectUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  return url;
}

function getRuntimeProcessEnv(): NodeJS.ProcessEnv {
  // Dynamic require keeps Vercel sensitive env vars available at request runtime.
  // Static imports or top-level process.env reads can be replaced at build time.
  return require("node:process").env as NodeJS.ProcessEnv;
}

export function readSupabaseSecretKeyAtRuntime(): {
  secretKey: string | undefined;
  debug: SupabaseSecretKeyDebug;
} {
  const runtimeEnv = getRuntimeProcessEnv();
  const raw = runtimeEnv[SUPABASE_SECRET_KEY_NAME];
  const trimmed = typeof raw === "string" ? raw.trim() : "";

  return {
    secretKey: trimmed.length > 0 ? trimmed : undefined,
    debug: {
      routeHit: true,
      secretKeyExists: Object.prototype.hasOwnProperty.call(
        runtimeEnv,
        SUPABASE_SECRET_KEY_NAME,
      ),
      secretKeyTrimmedLength: trimmed.length,
      selectedKeyName: trimmed.length > 0 ? SUPABASE_SECRET_KEY_NAME : null,
    },
  };
}

export function createSupabaseAdminClient(supabaseSecretKey: string): SupabaseClient {
  const trimmed = supabaseSecretKey.trim();

  if (!trimmed) {
    throw new Error("Missing SUPABASE_SECRET_KEY");
  }

  return createClient(getSupabaseProjectUrl(), trimmed, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function extractPublicStoragePath(
  fileUrl: string,
  bucket: string,
): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = fileUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(fileUrl.slice(markerIndex + marker.length));
}
