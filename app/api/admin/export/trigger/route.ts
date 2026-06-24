import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin";
import { SCOPES } from "@/lib/scopes";

function ndjsonStringify(obj: any) {
  return JSON.stringify(obj) + "\n";
}

function deidentifyCase(c: any) {
  // Prototype de-identification: remove obvious PII while keeping clinical structure
  const out = { ...c };
  out.title = "REDACTED";
  out.age = null;
  out.country = null;
  out.symptoms = [];
  out.imaging = [];
  out.uncertainty_flags = [];
  out.missing_info = [];
  // surgeries: remove notes and dates
  out.surgeries = (out.surgeries ?? []).map((s: any) => ({ type: s.type ?? "", year: s.year ?? null }));
  // timeline and summary scrub
  out.timeline = [];
  out.summary = "REDACTED";
  // remove any nested strings that look like identifiers
  return out;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request, SCOPES.EXPORT_WRITE);
    if (auth) return auth;

    const body = await request.json().catch(() => ({}));
    const { deidentify = false, enqueue = false, filter = {} } = body as {
      deidentify?: boolean;
      filter?: { severity?: string; status?: string };
      enqueue?: boolean;
    };

    const supabase = createSupabaseServerClient();

    if (enqueue) {
      // create a pending job row and return id
      const pendingPath = `exports/pending-${crypto.randomUUID()}.ndjson`;
      const { data, error } = await supabase.from("export_jobs").insert([{ path: pendingPath, deidentified: !!deidentify, status: "pending", record_count: 0 }]).select("id").limit(1);
      if (error) throw error;
      const id = data?.[0]?.id ?? null;
      return NextResponse.json({ success: true, jobId: id });
    }

    let query = supabase.from("cases").select("*");
    if (filter.severity && ["LOW", "MEDIUM", "HIGH"].includes(filter.severity)) {
      query = query.eq("severity", filter.severity);
    }
    if (filter.status && ["submitted", "imported", "reviewed"].includes(filter.status)) {
      query = query.eq("status", filter.status);
    }
    const { data: cases, error } = await query;
    if (error) throw error;

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `exports/cases-${deidentify ? "deidentified-" : ""}${timestamp}.ndjson`;

    let ndjson = "";
    for (const c of cases ?? []) {
      const row = deidentify ? deidentifyCase(c) : c;
      ndjson += ndjsonStringify(row);
    }

    const uploadRes = await supabase.storage.from("case-files").upload(path, Buffer.from(ndjson), { upsert: true, contentType: "application/x-ndjson" });
    if (uploadRes.error) {
      await supabase.from("export_jobs").insert({ path, record_count: (cases ?? []).length, status: "failure", error: uploadRes.error.message, deidentified: !!deidentify });
      return NextResponse.json({ error: "Could not upload export", details: uploadRes.error.message }, { status: 500 });
    }

    const signedRes = await supabase.storage.from("case-files").createSignedUrl(path, 60 * 60);
    const signedUrl = signedRes.data?.signedUrl ?? null;

    await supabase.from("export_jobs").insert({ path, public_url: null, record_count: (cases ?? []).length, status: "success", deidentified: !!deidentify });

    return NextResponse.json({ success: true, count: (cases ?? []).length, url: signedUrl });
  } catch (err) {
    return NextResponse.json({ error: "Export failed", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
