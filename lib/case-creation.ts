import { EndoCase } from "@/lib/types";
import { generateCaseSummary } from "@/lib/case-utils";

export function buildCaseInsertPayload(params: {
  id: string;
  title: string;
  age: number | null;
  country: string | null;
  symptoms: string[];
  imaging: string[];
  surgeries: EndoCase["surgeries"];
  diseaseMap: EndoCase["diseaseMap"];
  uncertaintyFlags: string[];
  missingInfo: string[];
  severity: EndoCase["severity"];
  complexityNote: string;
  status?: string;
  sourceLabel?: string;
}) {
  const {
    id,
    title,
    age,
    country,
    symptoms,
    imaging,
    surgeries,
    diseaseMap,
    uncertaintyFlags,
    missingInfo,
    severity,
    complexityNote,
    status = "submitted",
    sourceLabel,
  } = params;

  const timeline: EndoCase["timeline"] = [
    {
      date: new Date().toISOString().slice(0, 10),
      label: sourceLabel ? `Case imported from ${sourceLabel}` : "Case submitted to EndoLab",
      type: "diagnosis",
    },
  ];

  return {
    id,
    title,
    age,
    country,
    summary: generateCaseSummary({ title, symptoms, imaging, surgeries, diseaseMap }),
    timeline,
    disease_map: diseaseMap,
    surgeries,
    imaging,
    symptoms,
    uncertainty_flags: uncertaintyFlags,
    missing_info: missingInfo,
    severity,
    complexity_note: complexityNote,
    status,
    payment_status: status === "imported" ? "not_required" : "unpaid",
  };
}
