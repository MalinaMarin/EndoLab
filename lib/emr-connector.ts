import { buildCaseInsertPayload } from "@/lib/case-creation";
import { extractCaseInfo } from "@/lib/document-extraction";
import { CaseSeverity } from "@/lib/types";

export type EmrRecord = {
  id: string;
  patientName: string;
  mrn: string;
  age: number;
  country: string;
  diagnosis: string;
  symptoms: string;
  imagingFindings: string;
  procedureNotes: string;
  clinicalNote: string;
  lastUpdated: string;
  sourceSystem: string;
};

export const demoEmrRecords: EmrRecord[] = [
  {
    id: "emr-record-1",
    patientName: "Ava Ramos",
    mrn: "EMR-8231",
    age: 34,
    country: "US",
    diagnosis: "Suspected endometriosis with pelvic pain",
    symptoms: "Chronic pelvic pain, painful intercourse, fatigue",
    imagingFindings: "Pelvic MRI shows right ovarian endometrioma; possible adenomyosis.",
    procedureNotes: "Laparoscopy planned for pelvic evaluation and possible excision of endometriotic lesions.",
    clinicalNote:
      "Patient reports worsening dysmenorrhea and dyspareunia. MRI demonstrates a 3.4cm right ovarian cyst consistent with endometrioma and thickened uterosacral ligaments. No bowel nodularity was identified. Recommend referral to specialist for surgical evaluation.",
    lastUpdated: "2026-05-22T14:20:00Z",
    sourceSystem: "Demo EMR Alpha",
  },
  {
    id: "emr-record-2",
    patientName: "Mia Chen",
    mrn: "EMR-9274",
    age: 29,
    country: "US",
    diagnosis: "Endometriosis evaluation after failed medical therapy",
    symptoms: "Heavy menstrual bleeding, lower abdominal cramps, irregular cycles",
    imagingFindings: "Transvaginal ultrasound reveals bilateral ovarian cysts and nodularity along the pelvic sidewall.",
    procedureNotes: "No prior pelvic surgery; conservative management with hormonal therapy attempted.",
    clinicalNote:
      "Patient has persistent pelvic pain despite a 6-month course of combined oral contraception and NSAIDs. Ultrasound findings are suggestive of bilateral endometriotic cysts. She requests referral for specialist surgical consultation and further treatment planning.",
    lastUpdated: "2026-05-29T09:05:00Z",
    sourceSystem: "Demo EMR Alpha",
  },
];

export function getEmrRecordSeverity(record: EmrRecord): CaseSeverity {
  const symptomCount = record.symptoms.split(/,|;/).filter(Boolean).length;
  if (symptomCount >= 3) return "HIGH";
  if (symptomCount === 2) return "MEDIUM";
  return "LOW";
}

export function buildCasePayloadFromEmr(record: EmrRecord) {
  const extracted = extractCaseInfo(record.clinicalNote || record.procedureNotes || "");
  const diseaseMap = extracted?.diseaseMap ?? {
    ovaries: "unknown",
    bowel: "unknown",
    bladder: "unknown",
    uterosacral: "unknown",
    adhesions: "low",
  };

  const surgeries = extracted?.surgeries ?? [];
  const imaging = extracted?.imaging ?? record.imagingFindings.split(/,|;/).map((item) => item.trim()).filter(Boolean);
  const symptoms = record.symptoms.split(/,|;/).map((item) => item.trim()).filter(Boolean);
  const uncertaintyFlags = extracted?.uncertaintyFlags ?? ["Validate EMR findings and confirm prior imaging reports."];
  const missingInfo = extracted?.missingInfo ?? ["Confirm surgical history and pathology details from the EMR record."];

  return buildCaseInsertPayload({
    id: crypto.randomUUID(),
    title: `${record.patientName} — ${record.diagnosis}`,
    age: record.age,
    country: record.country,
    symptoms,
    imaging,
    surgeries,
    diseaseMap,
    uncertaintyFlags,
    missingInfo,
    severity: getEmrRecordSeverity(record),
    complexityNote: "Imported from EMR connector alpha.",
    sourceLabel: record.sourceSystem,
  });
}
