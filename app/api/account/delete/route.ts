import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createSupabaseAdminClient,
  extractPublicStoragePath,
  getServiceRoleEnvDebugInfo,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSupabaseAnonKey(): string {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return anonKey;
}

function getSupabaseProjectUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  return url;
}

async function removeUserStorageObjects(userId: string) {
  const admin = createSupabaseAdminClient();

  const { data: profileFiles } = await admin.storage.from("profile-images").list(userId);

  if (profileFiles?.length) {
    await admin.storage
      .from("profile-images")
      .remove(profileFiles.map((file) => `${userId}/${file.name}`));
  }

  const { data: attachments } = await admin
    .from("message_attachments")
    .select("file_url")
    .eq("uploader_id", userId);

  const attachmentPaths = (attachments ?? [])
    .map((attachment) => extractPublicStoragePath(attachment.file_url, "dm-attachments"))
    .filter((path): path is string => Boolean(path));

  if (attachmentPaths.length > 0) {
    await admin.storage.from("dm-attachments").remove(attachmentPaths);
  }
}

export async function POST(request: Request) {
  console.log("[account delete] route hit");

  try {
    await connection();

    const envDebug = getServiceRoleEnvDebugInfo();
    console.log(
      "[account delete] env keys include service role",
      envDebug.keyInObjectKeys,
    );
    console.log("[account delete] service role configured", envDebug.configured);
    console.log("[account delete] selected key name", envDebug.selectedKeyName);
    console.log("[account delete] secret key exists", envDebug.secretKeyExists);
    console.log("[account delete] secret key trimmed length", envDebug.secretKeyTrimmedLength);
    console.log("[account delete] supabase env key names", envDebug.supabaseEnvKeyNames);

    const body = (await request.json()) as { confirmation?: string };

    if (body.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Type DELETE exactly to confirm account deletion." },
        { status: 400 },
      );
    }

    const authHeader = request.headers.get("Authorization");
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSupabaseServiceRoleConfigured()) {
      return NextResponse.json(
        {
          error:
            "Account deletion is not configured on the server. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY. (ACCOUNT_DELETE_SERVICE_ROLE_MISSING)",
          code: "ACCOUNT_DELETE_SERVICE_ROLE_MISSING",
          debug: {
            keyInProcessEnv: envDebug.keyInProcessEnv,
            keyInObjectKeys: envDebug.keyInObjectKeys,
            trimmedLength: envDebug.trimmedLength,
            secretKeyExists: envDebug.secretKeyExists,
            secretKeyTrimmedLength: envDebug.secretKeyTrimmedLength,
            selectedKeyName: envDebug.selectedKeyName,
            supabaseEnvKeyNames: envDebug.supabaseEnvKeyNames,
          },
        },
        { status: 500 },
      );
    }

    const supabaseUrl = getSupabaseProjectUrl();
    const anonKey = getSupabaseAnonKey();
    const userClient = createClient(supabaseUrl, anonKey, {
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

    const { data: authData, error: authError } = await userClient.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authData.user.id;

    await removeUserStorageObjects(userId);

    const { error: deleteDataError } = await userClient.rpc("delete_account_data");

    if (deleteDataError) {
      return NextResponse.json({ error: deleteDataError.message }, { status: 409 });
    }

    const admin = createSupabaseAdminClient();
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      return NextResponse.json(
        { error: "Account data was removed, but auth deletion failed. Contact support." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete account",
      },
      { status: 500 },
    );
  }
}
