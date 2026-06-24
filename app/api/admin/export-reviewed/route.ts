import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin";
import { SCOPES } from "@/lib/scopes";

function ndjsonStringify(obj: any) {
  return JSON.stringify(obj) + "\n";
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request, SCOPES.EXPORT_WRITE);
    if (auth) return auth;
    const supabase = createSupabaseServerClient();

    // fetch reviewed rows
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("id, created_at, corrected, reviewed_at")
      .eq("status", "reviewed")
      .order("reviewed_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "Could not load reviewed rows", details: error.message }, { status: 500 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `exports/reviews-${timestamp}.ndjson`;

    let ndjson = "";
    for (const r of reviews ?? []) {
      ndjson += ndjsonStringify({
        created_at: r.created_at,
        reviewed_at: r.reviewed_at,
        corrected: r.corrected,
      });
    }

    const uploadRes = await supabase.storage.from("case-files").upload(path, Buffer.from(ndjson), { upsert: true, contentType: "application/x-ndjson" });
    if (uploadRes.error) {
      await supabase.from("export_jobs").insert({ path, record_count: (reviews ?? []).length, status: "failure", error: uploadRes.error.message });
      return NextResponse.json({ error: "Could not upload export", details: uploadRes.error.message }, { status: 500 });
    }

    const signedRes = await supabase.storage.from("case-files").createSignedUrl(path, 60 * 60);
    const signedUrl = signedRes.data?.signedUrl ?? null;

    await supabase.from("export_jobs").insert({ path, public_url: null, record_count: (reviews ?? []).length, status: "success" });

    return NextResponse.json({ success: true, count: (reviews ?? []).length, url: signedUrl });
  } catch (err) {
    return NextResponse.json({ error: "Export failed", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
