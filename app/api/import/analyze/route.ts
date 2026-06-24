import { NextResponse } from "next/server";
import { extractCaseInfo } from "@/lib/document-extraction";
import { getUserContext } from "@/lib/account";

export async function POST(request: Request) {
  try {
    const context = await getUserContext();
    if (!context || context.accountType !== "clinic") {
      return NextResponse.json({ error: "Clinic account required." }, { status: 403 });
    }
    const body = (await request.json()) as { cases?: unknown[] };
    const rows = Array.isArray(body.cases) ? body.cases : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "No cases provided for analysis." }, { status: 400 });
    }

    const perRow = rows.map((raw, idx) => {
      const row = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
      const title = String(row.title ?? "").trim();
      const reportText = String(row.reportText ?? "").trim();
      const symptoms = Array.isArray(row.symptoms)
        ? (row.symptoms as unknown[]).map((s) => String(s))
        : typeof row.symptoms === "string"
        ? String(row.symptoms).split(/,|;/).map((s) => s.trim()).filter(Boolean)
        : [];

      const warnings: string[] = [];
      if (!title) warnings.push("Missing title; consider adding a short case summary.");
      if (!reportText && symptoms.length === 0) warnings.push("No narrative or symptoms provided; extraction may be poor.");
      if (reportText && reportText.length < 80) warnings.push("Clinical note is short; important details may be missing.");

      // run lightweight extraction to see if diseaseMap was detected
      const extracted = reportText ? extractCaseInfo(reportText) : null;
      if (extracted && extracted.diseaseMap) {
        // check if anything is 'likely' to give positive signal
        const dm = extracted.diseaseMap as Record<string, unknown>;
        const positives = Object.values(dm).filter((v) => typeof v === "string" && (v === "likely" || v === "suspected"));
        if (positives.length === 0) warnings.push("Extraction detected disease map but found no likely/suspected sites.");
      }

      const suggestedSeverity = reportText ? (reportText.length > 400 ? "HIGH" : reportText.length > 200 ? "MEDIUM" : "LOW") : symptoms.length >= 3 ? "HIGH" : symptoms.length === 2 ? "MEDIUM" : "LOW";

      return {
        index: idx,
        title,
        reportTextPreview: reportText.slice(0, 320),
        symptoms,
        warnings,
        suggestedSeverity,
      };
    });

    const summary = {
      totalRows: rows.length,
      rowsWithWarnings: perRow.filter((r) => r.warnings.length > 0).length,
    };

    return NextResponse.json({ success: true, summary, perRow });
  } catch (error) {
    return NextResponse.json({ error: "Analyze failed.", message: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}
