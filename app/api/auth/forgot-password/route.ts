import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";
import { cleanText, enforceRateLimit } from "@/lib/request-safety";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "forgot-password", limit: 5, windowMs: 60_000 });
  if (limited) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const { email } = (await request.json().catch(() => ({}))) as { email?: string };
  const cleanEmail = cleanText(email, 254).toLowerCase();
  if (!cleanEmail) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const auth = await createSupabaseAuthClient();
  await auth.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: `${new URL(request.url).origin}/auth/callback?next=/reset-password`,
  });
  return NextResponse.json({ success: true });
}
