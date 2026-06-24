import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin";
import { SCOPES } from "@/lib/scopes";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req, SCOPES.EXPORT_READ);
    if (auth) return auth;
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("export_jobs").select("id, created_at, path, public_url, record_count, status, error, deidentified").order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    const jobs = await Promise.all((data ?? []).map(async (job) => {
      const signedUrl = job.status === "success" && job.path
        ? (await supabase.storage.from("case-files").createSignedUrl(job.path, 60 * 15)).data?.signedUrl ?? null
        : null;
      return { ...job, public_url: signedUrl };
    }));
    return NextResponse.json({ success: true, jobs });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
