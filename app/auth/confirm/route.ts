import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = request.nextUrl.searchParams.get("next") || "/account";

  if (tokenHash && type) {
    const auth = await createSupabaseAuthClient();
    await auth.auth.verifyOtp({ token_hash: tokenHash, type: type as "signup" });
  }

  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/account", request.url));
}
