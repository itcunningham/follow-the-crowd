import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getSupabaseProjectUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  return url;
}

function getServiceRoleKeyEnvName(): "SUPABASE_SERVICE_ROLE_KEY" {
  return ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_") as "SUPABASE_SERVICE_ROLE_KEY";
}

export function getSupabaseServiceRoleKey(): string | undefined {
  const value = process.env[getServiceRoleKeyEnvName()]?.trim();
  return value || undefined;
}

export function isSupabaseServiceRoleConfigured(): boolean {
  return Boolean(getSupabaseServiceRoleKey());
}

export function createSupabaseAdminClient(): SupabaseClient {
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(getSupabaseProjectUrl(), serviceRoleKey, {
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
