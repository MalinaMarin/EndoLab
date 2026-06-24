import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserContext } from "@/lib/account";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const user = await getUserContext();
    if (!user || user.accountType !== "clinic" || !user.organizationId) {
      return NextResponse.json({ error: "Clinic account required." }, { status: 403 });
    }
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("import_audits").select("*").eq("id", id).eq("organization_id", user.organizationId).limit(1);
    if (error) return NextResponse.json({ error: "Failed to fetch audit.", details: error.message }, { status: 500 });
    if (!data || data.length === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ success: true, audit: data[0] });
  } catch (err) {
    return NextResponse.json({ error: "Fetch failed.", message: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const user = await getUserContext();
    if (!user || user.accountType !== "clinic" || !user.organizationId) {
      return NextResponse.json({ error: "Clinic account required." }, { status: 403 });
    }
    const body = (await request.json()) as { audit?: any; name?: string };
    if (!body?.audit) return NextResponse.json({ error: "No audit payload provided." }, { status: 400 });

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("import_audits")
      .update({ per_row: body.audit.perRow ?? [], summary: body.audit.summary ?? {}, name: body.name ?? null })
      .eq("id", id)
      .eq("organization_id", user.organizationId)
      .select();

    if (error) return NextResponse.json({ error: "Failed to update audit.", details: error.message }, { status: 500 });
    return NextResponse.json({ success: true, audit: data?.[0] ?? null });
  } catch (err) {
    return NextResponse.json({ error: "Update failed.", message: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
