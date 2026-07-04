import { env as processEnv } from "node:process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SERVICE_ROLE_KEY_NAME = "SUPABASE_SERVICE_ROLE_KEY";
const SECRET_KEY_NAME = "SUPABASE_SECRET_KEY";

const ADMIN_KEY_NAMES = [SERVICE_ROLE_KEY_NAME, SECRET_KEY_NAME] as const;

export type SupabaseAdminKeyName = (typeof ADMIN_KEY_NAMES)[number];

function getSupabaseProjectUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  return url;
}

function readTrimmedEnvValue(name: SupabaseAdminKeyName): string | undefined {
  const value = processEnv[name];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getSupabaseAdminKeyName(): SupabaseAdminKeyName | null {
  for (const name of ADMIN_KEY_NAMES) {
    if (readTrimmedEnvValue(name)) {
      return name;
    }
  }

  return null;
}

export function getSupabaseServiceRoleKey(): string | undefined {
  const selectedKeyName = getSupabaseAdminKeyName();
  return selectedKeyName ? readTrimmedEnvValue(selectedKeyName) : undefined;
}

export function isSupabaseServiceRoleConfigured(): boolean {
  return getSupabaseServiceRoleKey() !== undefined;
}

export function getServiceRoleEnvDebugInfo(): {
  keyInProcessEnv: boolean;
  keyInObjectKeys: boolean;
  configured: boolean;
  trimmedLength: number;
  selectedKeyName: SupabaseAdminKeyName | null;
  supabaseEnvKeyNames: string[];
} {
  const selectedKeyName = getSupabaseAdminKeyName();
  const rawValue = selectedKeyName ? processEnv[selectedKeyName] : processEnv[SERVICE_ROLE_KEY_NAME];
  const trimmedLength =
    typeof rawValue === "string" ? rawValue.trim().length : 0;

  return {
    keyInProcessEnv: Object.prototype.hasOwnProperty.call(processEnv, SERVICE_ROLE_KEY_NAME),
    keyInObjectKeys: Object.keys(processEnv).includes(SERVICE_ROLE_KEY_NAME),
    configured: isSupabaseServiceRoleConfigured(),
    trimmedLength,
    selectedKeyName,
    supabaseEnvKeyNames: Object.keys(processEnv).filter((name) => name.startsWith("SUPABASE")),
  };
}

export function createSupabaseAdminClient(): SupabaseClient {
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY");
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
