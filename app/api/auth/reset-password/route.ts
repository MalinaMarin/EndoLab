import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  const { password } = (await request.json().catch(() => ({}))) as { password?: string };
  if (!password || password.length < 10) {
    return NextResponse.json({ error: "Password must contain at least 10 characters." }, { status: 400 });
  }
  const auth = await createSupabaseAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Password reset session has expired." }, { status: 401 });
  const { error } = await auth.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
