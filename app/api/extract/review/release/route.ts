import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request);
    if (auth) return auth;
    const body = await request.json();
    const { id, reviewer } = body as { id?: string; reviewer?: string };
    if (!id || !reviewer) {
      return NextResponse.json({ error: "id and reviewer are required" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    // Only release if claimed_by matches the reviewer
    const { data: existing, error: fetchErr } = await supabase.from("reviews").select("claimed_by").eq("id", id).maybeSingle();
    if (fetchErr) {
      return NextResponse.json({ error: "Could not fetch review", details: fetchErr.message }, { status: 500 });
    }
    if (!existing) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    if (existing.claimed_by !== reviewer) return NextResponse.json({ error: "Not allowed to release" }, { status: 403 });

    const { error } = await supabase.from("reviews").update({ claimed_by: null, claimed_at: null, locked_until: null }).eq("id", id);
    if (error) return NextResponse.json({ error: "Could not release claim", details: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Release failed", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
