import { EndoCase } from "@/lib/types";

export const sampleCases: EndoCase[] = [
  {
    id: "ENDO-001",
    title: "Suspected bowel DIE recurrence after prior excision",
    patient: { age: 31, country: "Romania" },
    summary:
      "History of two prior laparoscopic surgeries with persistent pelvic pain and cyclic bowel symptoms. MRI report suggests posterior compartment involvement, with mismatch between symptoms and reported lesion extent.",
    timeline: [
      { date: "2019-06", label: "Pain onset and dysmenorrhea", type: "symptom" },
      { date: "2020-11", label: "First laparoscopy, partial excision", type: "surgery" },
      { date: "2022-04", label: "MRI pelvis with suspected rectosigmoid involvement", type: "imaging" },
      { date: "2023-02", label: "Second surgery for recurrence", type: "surgery" },
      { date: "2025-12", label: "Escalating bowel pain and bloating", type: "symptom" },
    ],
    diseaseMap: {
      ovaries: "suspected",
      bowel: "likely",
      bladder: "unknown",
      uterosacral: "likely",
      adhesions: "high",
    },
    surgeries: [
      {
        year: 2020,
        type: "Laparoscopic excision",
        notes: "Posterior compartment treated, no full compartment mapping in report.",
        completeness: "partial",
      },
      {
        year: 2023,
        type: "Repeat laparoscopic procedure",
        notes: "Adhesiolysis documented, bowel lesion details unclear.",
        completeness: "unknown",
      },
    ],
    imaging: ["MRI pelvis report (2022-04)", "Transvaginal ultrasound summary (2025-10)"],
    symptoms: ["Severe dysmenorrhea", "Bowel pain during menses", "Dyspareunia", "Fatigue"],
    uncertaintyFlags: [
      "MRI findings describe mild disease, but symptoms suggest deeper posterior involvement.",
      "Surgical notes do not confirm complete excision by compartment.",
    ],
    missingInfo: [
      "Full operative report from 2023 surgery",
      "Pathology report linked to posterior nodules",
      "Original MRI image sequences (DICOM)",
    ],
    severity: "HIGH",
    complexityNote: "Recurrence risk with unclear prior surgical completeness.",
  },
  {
    id: "ENDO-002",
    title: "Persistent pain despite hormonal suppression",
    patient: { age: 27, country: "France" },
    summary:
      "Ongoing pelvic pain despite continuous oral hormonal therapy. Prior imaging inconclusive and no prior surgical staging available.",
    timeline: [
      { date: "2021-03", label: "Initial chronic pelvic pain report", type: "symptom" },
      { date: "2021-08", label: "Started continuous combined pill", type: "diagnosis" },
      { date: "2024-01", label: "MRI read as non-specific", type: "imaging" },
      { date: "2026-01", label: "Referral for specialist review", type: "diagnosis" },
    ],
    diseaseMap: {
      ovaries: "suspected",
      bowel: "unknown",
      bladder: "ruled_out",
      uterosacral: "suspected",
      adhesions: "medium",
    },
    surgeries: [],
    imaging: ["MRI pelvis report (2024-01)"],
    symptoms: ["Cyclic pelvic pain", "Back pain", "Nausea during cycle"],
    uncertaintyFlags: [
      "No staging laparoscopy available.",
      "Hormonal protocol details incomplete in records.",
    ],
    missingInfo: [
      "Detailed hormonal regimen and adherence timeline",
      "Specialist ultrasound report",
    ],
    severity: "MEDIUM",
    complexityNote: "High symptom burden with limited objective documentation.",
  },
  {
    id: "ENDO-003",
    title: "Post-ER surgery case with unclear specialist follow-up",
    patient: { age: 35, country: "Ireland" },
    summary:
      "Emergency surgery performed for acute abdominal pain. Documentation does not clarify endometriosis compartment assessment or pathology linkage.",
    timeline: [
      { date: "2025-05", label: "ER admission for acute pain", type: "symptom" },
      { date: "2025-05", label: "Emergency laparoscopic surgery", type: "surgery" },
      { date: "2025-06", label: "Pathology: endometrial tissue confirmed", type: "diagnosis" },
      { date: "2026-02", label: "Pain recurrence with urinary symptoms", type: "symptom" },
    ],
    diseaseMap: {
      ovaries: "likely",
      bowel: "unknown",
      bladder: "suspected",
      uterosacral: "unknown",
      adhesions: "medium",
    },
    surgeries: [
      {
        year: 2025,
        type: "Emergency laparoscopy",
        notes: "Life-saving intervention; specialist endo mapping not documented.",
        completeness: "unknown",
      },
    ],
    imaging: ["CT abdomen from ER (2025-05)"],
    symptoms: ["Acute abdominal pain episodes", "Urinary urgency", "Pelvic pressure"],
    uncertaintyFlags: [
      "Emergency intervention likely prioritized stabilization over full excision strategy.",
    ],
    missingInfo: ["Specialist endometriosis surgeon assessment", "MRI pelvis protocol follow-up"],
    severity: "HIGH",
    complexityNote: "Requires specialist triage due to emergency surgery context.",
  },
];

export function getCaseById(id: string) {
  return sampleCases.find((item) => item.id === id);
}
