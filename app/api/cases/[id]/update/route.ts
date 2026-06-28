import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserContext } from "@/lib/account";
import { generateCaseSummary } from "@/lib/case-utils";
import { cleanText } from "@/lib/request-safety";
import type { EndoCase } from "@/lib/types";

function severityFor(symptoms: string[]): EndoCase["severity"] {
  if (symptoms.length >= 5) return "HIGH";
  if (symptoms.length >= 3) return "MEDIUM";
  return "LOW";
}

export async function PATCH(request: Request, routeContext: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await routeContext.params;
    const caseId = cleanText(id, 80);
    const context = await getUserContext();
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const supabase = createSupabaseServerClient();
    let accessQuery = supabase.from("cases").select("*").eq("id", caseId);
    accessQuery = context.accountType === "patient"
      ? accessQuery.eq("owner_user_id", context.user.id)
      : accessQuery.eq("organization_id", context.organizationId!);
    const { data: existing, error: accessError } = await accessQuery.maybeSingle();
    if (accessError) return NextResponse.json({ error: "Could not load case.", details: accessError.message }, { status: 500 });
    if (!existing) return NextResponse.json({ error: "Case not found." }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.lifecycle === "archive") {
      if (context.accountType !== "patient") return NextResponse.json({ error: "Only patients can archive personal cases." }, { status: 403 });
      updates.status = "archived";
    } else if (body.lifecycle === "restore") {
      if (context.accountType !== "patient") return NextResponse.json({ error: "Only patients can restore personal cases." }, { status: 403 });
      const { data: activeCase } = await supabase
        .from("cases")
        .select("id")
        .eq("owner_user_id", context.user.id)
        .neq("status", "archived")
        .neq("id", caseId)
        .limit(1)
        .maybeSingle();
      if (activeCase) {
        return NextResponse.json({ error: "Archive your current active case before restoring this one.", caseId: activeCase.id }, { status: 409 });
      }
      updates.status = "submitted";
    } else {
      if (body.title !== undefined) {
        const title = cleanText(body.title, 160);
        if (!title) return NextResponse.json({ error: "Case title is required." }, { status: 400 });
        updates.title = title;
      }
      if (body.age !== undefined) {
        const age = Number(body.age);
        if (!Number.isInteger(age) || age < 18 || age > 100) return NextResponse.json({ error: "Age must be between 18 and 100." }, { status: 400 });
        updates.age = age;
      }
      if (body.country !== undefined) updates.country = cleanText(body.country, 80) || null;
      if (Array.isArray(body.symptoms)) {
        const symptoms = body.symptoms.map((value: unknown) => cleanText(value, 500)).filter(Boolean).slice(0, 40);
        if (!symptoms.length) return NextResponse.json({ error: "At least one symptom or clinical concern is required." }, { status: 400 });
        updates.symptoms = symptoms;
        updates.severity = severityFor(symptoms);
      }
      if (Array.isArray(body.uncertaintyFlags)) updates.uncertainty_flags = body.uncertaintyFlags.map((value: unknown) => cleanText(value, 500)).filter(Boolean).slice(0, 40);
      if (Array.isArray(body.missingInfo)) updates.missing_info = body.missingInfo.map((value: unknown) => cleanText(value, 500)).filter(Boolean).slice(0, 40);
      if (body.diseaseMap) updates.disease_map = body.diseaseMap;
      if (Array.isArray(body.surgeries)) updates.surgeries = body.surgeries.slice(0, 20);
      if (body.timeline) updates.timeline = body.timeline;

      const nextTitle = String(updates.title ?? existing.title);
      const nextSymptoms = (updates.symptoms ?? existing.symptoms ?? []) as string[];
      const nextSurgeries = (updates.surgeries ?? existing.surgeries ?? []) as EndoCase["surgeries"];
      const nextDiseaseMap = (updates.disease_map ?? existing.disease_map) as EndoCase["diseaseMap"];
      updates.summary = generateCaseSummary({
        title: nextTitle,
        symptoms: nextSymptoms,
        imaging: existing.imaging ?? [],
        surgeries: nextSurgeries,
        diseaseMap: nextDiseaseMap,
      });
    }

    if (!Object.keys(updates).length) return NextResponse.json({ error: "No updatable fields provided." }, { status: 400 });

    let updateQuery = supabase.from("cases").update(updates).eq("id", caseId);
    updateQuery = context.accountType === "patient"
      ? updateQuery.eq("owner_user_id", context.user.id)
      : updateQuery.eq("organization_id", context.organizationId!);
    const { error } = await updateQuery;
    if (error) return NextResponse.json({ error: "Could not update case.", details: error.message }, { status: 500 });

    return NextResponse.json({ success: true, updated: updates });
  } catch (error) {
    return NextResponse.json({ error: "Update failed.", message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
