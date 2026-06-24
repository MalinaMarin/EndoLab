import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/account";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cleanText, enforceRateLimit } from "@/lib/request-safety";

export async function PATCH(request: Request) {
  const limited = enforceRateLimit(request, { key: "case-assign", limit: 30, windowMs: 60_000 });
  if (limited) return NextResponse.json({ error: "Too many assignment updates." }, { status: 429 });

  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (context.accountType !== "clinic" || !context.organizationId) {
    return NextResponse.json({ error: "Clinic access required." }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const caseIds = Array.isArray(body.caseIds)
    ? body.caseIds.map((value: unknown) => cleanText(value, 80)).filter(Boolean).slice(0, 50)
    : [];
  const assignedTo = cleanText(body.assignedTo, 100);

  if (!caseIds.length || !assignedTo) {
    return NextResponse.json({ error: "Select at least one case and an assignee." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: accessible, error: accessError } = await supabase
    .from("cases")
    .select("id")
    .eq("organization_id", context.organizationId!)
    .in("id", caseIds);

  if (accessError) return NextResponse.json({ error: accessError.message }, { status: 500 });
  const accessibleIds = (accessible ?? []).map((row) => row.id);
  if (accessibleIds.length !== caseIds.length) {
    return NextResponse.json({ error: "One or more selected cases are unavailable to this clinic." }, { status: 403 });
  }

  const { error } = await supabase
    .from("cases")
    .update({ assigned_to: assignedTo })
    .eq("organization_id", context.organizationId!)
    .in("id", accessibleIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: accessibleIds.length, assignedTo });
}
