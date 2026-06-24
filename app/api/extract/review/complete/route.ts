import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth) return auth;
    const body = await request.json();
    const { id, reviewer } = body as { id?: string; reviewer?: string };
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("reviews").update({ status: "reviewed", reviewer: reviewer ?? null, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Could not update review", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
