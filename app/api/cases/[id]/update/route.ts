import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { canAccessCase, getUserContext } from "@/lib/account";

export async function PATCH(request: Request, routeContext: { params: Promise<{ id: string }> }) {
  try {
    const params = await routeContext.params;
    const caseId = String((params && params.id) ?? "").trim();
    if (!caseId) return NextResponse.json({ error: "Missing case id." }, { status: 400 });
    const userContext = await getUserContext();
    if (!userContext) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!(await canAccessCase(caseId, userContext))) return NextResponse.json({ error: "Case not found." }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.diseaseMap) updates.disease_map = body.diseaseMap;
    if (body.surgeries) updates.surgeries = body.surgeries;
    if (typeof body.summary === "string") updates.summary = body.summary;
    if (body.timeline) updates.timeline = body.timeline;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("cases").update(updates).eq("id", caseId);
    if (error) {
      return NextResponse.json({ error: "Could not update case.", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: updates });
  } catch (err) {
    return NextResponse.json({ error: "Update failed.", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
