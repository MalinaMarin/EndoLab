import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";
import { enforceRateLimit } from "@/lib/request-safety";
import { ensureAccountProvisioned } from "@/lib/account-provisioning";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "account-login", limit: 12, windowMs: 60_000 });
  if (limited) return NextResponse.json({ error: "Too many login attempts." }, { status: 429 });

  const { email, password } = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const auth = await createSupabaseAuthClient();
  const { data, error } = await auth.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  const provisioned = await ensureAccountProvisioned(data.user);
  if (provisioned.error) {
    await auth.auth.signOut();
    return NextResponse.json({ error: "Account exists, but its workspace could not be initialized. Apply the Supabase permissions migration and retry." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
