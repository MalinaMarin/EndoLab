import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";

export async function POST() {
  const auth = await createSupabaseAuthClient();
  await auth.auth.signOut();
  return NextResponse.json({ success: true });
}
