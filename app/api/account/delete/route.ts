import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { removeUserStorageObjects } from "@/lib/accountDeletionStorage";

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

export async function POST(request: Request) {
  console.log("[account delete] route hit", true);

  try {
    await connection();

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

    await removeUserStorageObjects(userClient, userId);

    const { error: deleteDataError } = await userClient.rpc("delete_account_data");

    if (deleteDataError) {
      console.error("[account delete] delete_account_data failed:", deleteDataError.message);
      return NextResponse.json({ error: deleteDataError.message }, { status: 409 });
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
