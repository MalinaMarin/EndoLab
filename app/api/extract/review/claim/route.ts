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
    const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    const { data, error } = await supabase
      .from("reviews")
      .update({ claimed_by: reviewer, claimed_at: new Date().toISOString(), locked_until: lockUntil })
      .eq("id", id)
      .is("claimed_by", null)
      .filter("status", "eq", "pending")
      .select();

    if (error) {
      return NextResponse.json({ error: "Could not claim review", details: error.message }, { status: 500 });
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json({ error: "Review already claimed or not available" }, { status: 409 });
    }

    return NextResponse.json({ success: true, claimed: data[0] ?? data });
  } catch (err) {
    return NextResponse.json({ error: "Claim failed", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
