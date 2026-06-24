import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";
import { ensureAccountProvisioned } from "@/lib/account-provisioning";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") || "/account";
  if (code) {
    const auth = await createSupabaseAuthClient();
    const { data } = await auth.auth.exchangeCodeForSession(code);
    if (data.user) await ensureAccountProvisioned(data.user);
  }
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/account", request.url));
}
