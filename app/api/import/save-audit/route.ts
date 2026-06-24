import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserContext } from "@/lib/account";

export async function POST(request: Request) {
  try {
    const context = await getUserContext();
    if (!context || context.accountType !== "clinic" || !context.organizationId) {
      return NextResponse.json({ error: "Clinic account required." }, { status: 403 });
    }
    const body = (await request.json()) as {
      name?: string;
      audit?: unknown;
      originalHeaders?: string[];
      createdBy?: string;
    };

    if (!body.audit) return NextResponse.json({ error: "No audit provided." }, { status: 400 });

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("import_audits").insert([
      {
        name: body.name ?? null,
        created_by: body.createdBy ?? null,
        summary: (body.audit as any).summary ?? {},
        per_row: (body.audit as any).perRow ?? [],
        original_headers: body.originalHeaders ?? [],
        organization_id: context.organizationId,
      },
    ]).select("id");

    if (error) return NextResponse.json({ error: "Failed to save audit.", details: error.message }, { status: 500 });

    const inserted = data as any[] | null;
    return NextResponse.json({ success: true, id: inserted?.[0]?.id });
  } catch (err) {
    return NextResponse.json({ error: "Save audit failed.", message: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
