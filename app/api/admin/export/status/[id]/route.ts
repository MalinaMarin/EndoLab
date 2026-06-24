import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin";
import { SCOPES } from "@/lib/scopes";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req, SCOPES.EXPORT_READ);
    if (auth) return auth;
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("export_jobs").select("*").eq("id", id).limit(1);
    if (error) throw error;
    const job = data?.[0] ?? null;
    const signedUrl = job?.status === "success" && job.path
      ? (await supabase.storage.from("case-files").createSignedUrl(job.path, 60 * 15)).data?.signedUrl ?? null
      : null;
    return NextResponse.json({ success: true, job: job ? { ...job, public_url: signedUrl } : null });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
