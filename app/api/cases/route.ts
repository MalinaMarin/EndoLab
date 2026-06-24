import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { EndoCase } from "@/lib/types";
import { buildCaseInsertPayload } from "@/lib/case-creation";
import { cleanText, enforceRateLimit, isAllowedClinicalFile } from "@/lib/request-safety";
import { getUserContext } from "@/lib/account";

function splitLines(value: string) {
  return value
    .split(/\r?\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (typeof value === "string" && value.trim()) {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return (value as T) ?? fallback;
}

function deriveSeverity(symptoms: string[]): EndoCase["severity"] {
  if (symptoms.length >= 5) return "HIGH";
  if (symptoms.length >= 3) return "MEDIUM";
  return "LOW";
}

async function parseRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    return {
      title: String(body.title ?? "").trim(),
      age: body.age ? Number(body.age) : null,
      country: body.country ? String(body.country).trim() : null,
      symptoms: Array.isArray(body.symptoms) ? body.symptoms.map(String) : splitLines(String(body.symptoms ?? "")),
      reportText: String(body.reportText ?? "").trim(),
      diseaseMap: parseJsonField(body.diseaseMap, {
        ovaries: "unknown",
        bowel: "unknown",
        bladder: "unknown",
        uterosacral: "unknown",
        adhesions: "low",
      } as EndoCase["diseaseMap"]),
      surgeries: parseJsonField(body.surgeries, [] as EndoCase["surgeries"]),
      imaging: Array.isArray(body.imaging) ? body.imaging.map(String) : splitLines(String(body.imaging ?? "")),
      uncertaintyFlags: Array.isArray(body.uncertaintyFlags) ? body.uncertaintyFlags.map(String) : parseJsonField(body.uncertaintyFlags, [] as string[]),
      missingInfo: Array.isArray(body.missingInfo) ? body.missingInfo.map(String) : parseJsonField(body.missingInfo, [] as string[]),
      sourceLabel: String(body.sourceLabel ?? ""),
      privacyConsent: body.privacyConsent === true || body.privacyConsent === "accepted",
      consentVersion: cleanText(body.consentVersion, 40),
    };
  }

  const formData = await request.formData();
  return {
    title: String(formData.get("title") ?? "").trim(),
    age: String(formData.get("age") ?? "").trim() ? Number(String(formData.get("age"))) : null,
    country: String(formData.get("country") ?? "").trim() || null,
    symptoms: splitLines(String(formData.get("symptoms") ?? "")),
    reportText: String(formData.get("reportText") ?? "").trim(),
    diseaseMap: parseJsonField(formData.get("diseaseMap"), {
      ovaries: "unknown",
      bowel: "unknown",
      bladder: "unknown",
      uterosacral: "unknown",
      adhesions: "low",
    } as EndoCase["diseaseMap"]),
    surgeries: parseJsonField(formData.get("surgeries"), [] as EndoCase["surgeries"]),
    imaging: parseJsonField(formData.get("imaging"), [] as string[]),
    uncertaintyFlags: parseJsonField(formData.get("uncertaintyFlags"), [] as string[]),
    missingInfo: parseJsonField(formData.get("missingInfo"), [] as string[]),
    sourceLabel: String(formData.get("sourceLabel") ?? ""),
    documents: formData.getAll("documents"),
    privacyConsent: formData.get("privacyConsent") === "accepted",
    consentVersion: cleanText(formData.get("consentVersion"), 40),
  };
}

export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, { key: "case-create", limit: 12, windowMs: 60_000 });
    if (limited) {
      return NextResponse.json(
        { error: "Too many submissions. Please wait before trying again." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }

    const supabase = createSupabaseServerClient();
    const context = await getUserContext();
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const payload = await parseRequest(request);

    if (!payload.title || payload.symptoms.length === 0) {
      return NextResponse.json({ error: "Title and symptoms are required." }, { status: 400 });
    }
    if (payload.title.length > 160 || payload.symptoms.length > 40) {
      return NextResponse.json({ error: "Case content exceeds the supported limits." }, { status: 400 });
    }
    if (payload.age !== null && (!Number.isInteger(payload.age) || payload.age < 18 || payload.age > 100)) {
      return NextResponse.json({ error: "Age must be between 18 and 100." }, { status: 400 });
    }
    if (payload.sourceLabel === "clinic batch import" && context.accountType !== "clinic") {
      return NextResponse.json({ error: "Clinic import access required." }, { status: 403 });
    }
    if (payload.sourceLabel !== "clinic batch import" && !payload.privacyConsent) {
      return NextResponse.json({ error: "Privacy consent is required." }, { status: 400 });
    }

    const severity = deriveSeverity(payload.symptoms);
    const id = crypto.randomUUID();
    const uploadedEntries: string[] = [];

    if (Array.isArray(payload.documents)) {
      const files = payload.documents.filter((value): value is File => value instanceof File && value.size > 0);
      if (files.length > 5) {
        return NextResponse.json({ error: "A maximum of 5 documents can be uploaded per submission." }, { status: 400 });
      }
      for (const value of files) {
        if (!isAllowedClinicalFile(value)) {
          return NextResponse.json({ error: `Unsupported or oversized file: ${value.name}` }, { status: 400 });
        }
        const safeName = value.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `${id}/${Date.now()}-${safeName}`;
        const bytes = Buffer.from(await value.arrayBuffer());

        const { error } = await supabase.storage.from("case-files").upload(path, bytes, {
          contentType: value.type || "application/octet-stream",
        });

        if (!error) {
          uploadedEntries.push(`storage://${path}`);
        } else {
          return NextResponse.json({ error: `Could not securely upload ${value.name}.`, details: error.message }, { status: 500 });
        }
      }
    }

    const insertPayload = buildCaseInsertPayload({
      id,
      title: payload.title,
      age: payload.age,
      country: payload.country,
      symptoms: payload.symptoms,
      imaging: [...payload.imaging, ...uploadedEntries],
      surgeries: payload.surgeries,
      diseaseMap: payload.diseaseMap,
      uncertaintyFlags: payload.uncertaintyFlags.length > 0 ? payload.uncertaintyFlags : ["Initial automated structuring pending specialist validation."],
      missingInfo: payload.missingInfo.length > 0 ? payload.missingInfo : ["Operative notes", "Pathology report", "MRI protocol details"],
      severity,
      complexityNote: payload.sourceLabel ? `Submitted from ${payload.sourceLabel}.` : "Newly submitted case awaiting specialist review.",
      status: payload.sourceLabel === "clinic batch import" ? "imported" : "submitted",
      sourceLabel: payload.sourceLabel,
    });

    const { error } = await supabase.from("cases").insert({
      ...insertPayload,
      consent_version: payload.consentVersion || null,
      consent_at: payload.privacyConsent ? new Date().toISOString() : null,
      owner_user_id: context.accountType === "patient" ? context.user.id : null,
      organization_id: context.accountType === "clinic" ? context.organizationId : null,
    });
    if (error) {
      return NextResponse.json(
        {
          error:
            "Could not save case. Ensure Supabase table 'cases' and storage bucket 'case-files' exist.",
          details: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ id, severity });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Case creation failed.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
