import { NextResponse, connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ACCOUNT_DELETION_FAILED_MESSAGE } from "@/lib/accountDeletion";
import { removeUserStorageObjects } from "@/lib/accountDeletionStorage";
import { authenticateSupabaseRequest } from "@/lib/api/authenticateSupabaseRequest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

export async function POST(request: Request) {
  try {
    await connection();

    const body = (await request.json()) as { confirmation?: string };

    if (body.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Type DELETE exactly to confirm account deletion." },
        { status: 400 },
      );
    }

    const auth = await authenticateSupabaseRequest(request);

    if (!auth) {
      return NextResponse.json(
        { error: "You need to sign in again before deleting your account." },
        { status: 401 },
      );
    }

    const userClient = createClient(getSupabaseProjectUrl(), getSupabaseAnonKey(), {
      global: {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    await removeUserStorageObjects(userClient, auth.userId);

    const { error: deleteDataError } = await userClient.rpc("delete_account_data");

    if (deleteDataError) {
      return NextResponse.json({ error: ACCOUNT_DELETION_FAILED_MESSAGE }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: ACCOUNT_DELETION_FAILED_MESSAGE }, { status: 500 });
  }
}
