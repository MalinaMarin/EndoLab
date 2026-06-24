import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildCaseInsertPayload } from "@/lib/case-creation";
import { extractCaseInfo } from "@/lib/document-extraction";
import { EndoCase } from "@/lib/types";
import { getUserContext } from "@/lib/account";

function splitTextLines(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/) 
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const context = await getUserContext();
    if (!context || context.accountType !== "clinic" || !context.organizationId) {
      return NextResponse.json({ error: "Clinic account required." }, { status: 403 });
    }
    const body = await request.json();
    const records = Array.isArray(body.cases) ? (body.cases as Array<Record<string, unknown>>) : [];

    if (records.length === 0) {
      return NextResponse.json({ error: "No cases found in import payload." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const rows = records.map((record: Record<string, unknown>) => {
      const title = String(record.title ?? "Untitled case").trim();
      const age = record.age ? Number(record.age) : null;
      const country = record.country ? String(record.country).trim() : null;
      const symptoms = splitTextLines(record.symptoms);
      const reportText = String(record.reportText ?? "").trim();
      const extracted = reportText ? extractCaseInfo(reportText) : null;
      const diseaseMap = extracted?.diseaseMap ?? {
        ovaries: "unknown",
        bowel: "unknown",
        bladder: "unknown",
        uterosacral: "unknown",
        adhesions: "low",
      };
      const surgeries = extracted?.surgeries ?? [];
      const imaging = extracted?.imaging ?? splitTextLines(record.imaging);
      const uncertaintyFlags = extracted?.uncertaintyFlags ?? splitTextLines(record.uncertaintyFlags);
      const missingInfo = extracted?.missingInfo ?? splitTextLines(record.missingInfo);
      const severity: EndoCase["severity"] = symptoms.length >= 5 ? "HIGH" : symptoms.length >= 3 ? "MEDIUM" : "LOW";

      return {
        ...buildCaseInsertPayload({
        id: crypto.randomUUID(),
        title,
        age,
        country,
        symptoms,
        imaging,
        surgeries,
        diseaseMap,
        uncertaintyFlags: uncertaintyFlags.length > 0 ? uncertaintyFlags : ["Review imported clinical documentation for completeness."],
        missingInfo: missingInfo.length > 0 ? missingInfo : ["Confirm imaging and pathology notes for imported case."],
        severity,
        complexityNote: "Imported from clinic batch upload.",
        status: "imported",
        sourceLabel: "clinic batch import",
        }),
        organization_id: context.organizationId,
        owner_user_id: null,
      };
    });

    const { error } = await supabase.from("cases").insert(rows);
    if (error) {
      return NextResponse.json({ error: "Import failed.", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, imported: rows.length });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Bulk import failed.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
