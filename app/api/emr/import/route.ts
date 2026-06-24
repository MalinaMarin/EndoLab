import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { demoEmrRecords, buildCasePayloadFromEmr } from "@/lib/emr-connector";
import { getUserContext } from "@/lib/account";

export async function POST(request: Request) {
  try {
    const context = await getUserContext();
    if (!context || context.accountType !== "clinic" || !context.organizationId) {
      return NextResponse.json({ error: "Clinic account required." }, { status: 403 });
    }
    const body = (await request.json()) as { ids?: unknown[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "No EMR record IDs provided." }, { status: 400 });
    }

    const selectedRecords = demoEmrRecords.filter((record) => ids.includes(record.id));
    if (selectedRecords.length === 0) {
      return NextResponse.json({ error: "No matching EMR records found." }, { status: 404 });
    }

    const rows = selectedRecords.map((record) => ({
      ...buildCasePayloadFromEmr(record),
      organization_id: context.organizationId,
      owner_user_id: null,
      payment_status: "not_required",
    }));
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("cases").insert(rows);

    if (error) {
      return NextResponse.json({ error: "Failed to import EMR cases.", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, imported: rows.length });
  } catch (error) {
    return NextResponse.json(
      {
        error: "EMR import failed.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
