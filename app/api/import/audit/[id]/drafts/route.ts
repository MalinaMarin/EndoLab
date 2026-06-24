import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserContext } from "@/lib/account";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: auditId } = await context.params;
  if (!auditId) {
    return NextResponse.json({ error: "Missing audit id." }, { status: 400 });
  }

  try {
    const user = await getUserContext();
    if (!user || user.accountType !== "clinic" || !user.organizationId) {
      return NextResponse.json({ error: "Clinic account required." }, { status: 403 });
    }
    const supabase = createSupabaseServerClient();
    const { data: audit } = await supabase
      .from("import_audits")
      .select("id")
      .eq("id", auditId)
      .eq("organization_id", user.organizationId)
      .maybeSingle();
    if (!audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

    const body = (await request.json()) as { drafts?: Array<{ rowIndex: number; draftPayload: unknown; decision?: string }> };
    if (!Array.isArray(body.drafts)) {
      return NextResponse.json({ error: "Missing draft rows." }, { status: 400 });
    }

    const draftRows = body.drafts.map((draft) => ({
      audit_id: auditId,
      row_index: draft.rowIndex,
      draft_payload: draft.draftPayload,
      decision: draft.decision ?? null,
    }));

    const { error } = await supabase.from("import_draft_rows").upsert(draftRows, { onConflict: "audit_id,row_index" });

    if (error) {
      return NextResponse.json({ error: "Failed to save draft rows.", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Draft save failed.", message: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
