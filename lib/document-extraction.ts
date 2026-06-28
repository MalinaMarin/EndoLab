import type { EndoCase } from "@/lib/types";

export type ExtractionEvidence = {
  field: "symptoms" | "diseaseMap" | "surgeries" | "imaging" | "uncertaintyFlags" | "missingInfo" | "document";
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
  sourceSentence: string;
  rationale: string;
};

export type DocumentProfile = {
  documentType: "mri_report" | "operative_note" | "pathology_report" | "clinic_letter" | "patient_history" | "unknown";
  detectedDates: string[];
  providerCandidates: string[];
  duplicateFingerprint: string;
  qualityWarnings: string[];
};

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .trim()
    .toLowerCase();
}

function parseSymptoms(text: string) {
  const lines = text.split(/\n|\.|\?|!/).map((line) => line.trim());
  const symptomKeywords = [
    "pelvic pain",
    "dysmenorrhea",
    "dyspareunia",
    "bloating",
    "constipation",
    "diarrhea",
    "urinary urgency",
    "urinary frequency",
    "ovarian pain",
    "lower abdominal pain",
    "fatigue",
    "infertility",
    "painful intercourse",
    "back pain",
  ];

  const symptoms = new Set<string>();
  for (const line of lines) {
    for (const keyword of symptomKeywords) {
      if (line.includes(keyword)) {
        symptoms.add(keyword);
      }
    }
    if (/pain|bleeding|infertility|constipation|diarrhea|urinary/.test(line)) {
      symptoms.add(line.replace(/\s+/g, " ").trim());
    }
  }

  return Array.from(symptoms).slice(0, 10);
}

function findClinicalMentions(text: string, keywords: string[]) {
  return keywords.flatMap((keyword) => {
    const mentions: Array<{ before: string; after: string }> = [];
    let cursor = 0;
    while (cursor < text.length) {
      const index = text.indexOf(keyword, cursor);
      if (index === -1) break;
      mentions.push({
        before: text.slice(Math.max(0, index - 55), index),
        after: text.slice(index, Math.min(text.length, index + keyword.length + 70)),
      });
      cursor = index + keyword.length;
    }
    return mentions;
  });
}

function splitSourceSentences(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function sentenceIncludes(sentence: string, keywords: string[]) {
  const normalized = normalizeText(sentence);
  return keywords.some((keyword) => normalized.includes(keyword));
}

function firstSentenceFor(text: string, keywords: string[]) {
  return splitSourceSentences(text).find((sentence) => sentenceIncludes(sentence, keywords)) ?? "";
}

function simpleFingerprint(text: string) {
  const normalized = normalizeText(text)
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\b(?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b/g, "")
    .replace(/\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])\b/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 5000);
  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `doc_${(hash >>> 0).toString(16)}`;
}

function compartmentLikelihood(text: string, keywords: string[]): EndoCase["diseaseMap"]["bowel"] {
  const mentions = findClinicalMentions(text, keywords);
  if (mentions.length === 0) return "unknown";

  const negated = mentions.every(({ before, after }) =>
    /\b(no|without|absent|negative for|free of|not identified|not seen|no evidence of)\b[^.!?]{0,45}$/.test(before) ||
    /\b(ruled out|not identified|not seen|absent)\b/.test(after),
  );
  if (negated) return "ruled_out";

  const uncertain = mentions.some(({ before, after }) =>
    /\b(suspected|possible|may represent|cannot exclude|equivocal|suggestive of)\b/.test(`${before} ${after}`),
  );
  if (uncertain) return "suspected";

  return "likely";
}

function parseDiseaseMap(text: string): EndoCase["diseaseMap"] {
  const normalized = normalizeText(text);
  const adhesionLikelihood = compartmentLikelihood(normalized, ["adhesion", "adhesions"]);
  return {
    ovaries: compartmentLikelihood(normalized, ["ovary", "ovarian", "endometrioma"]),
    bowel: compartmentLikelihood(normalized, ["bowel", "rectosigmoid", "sigmoid", "rectal"]),
    bladder: compartmentLikelihood(normalized, ["bladder", "ureter", "vesical"]),
    uterosacral: compartmentLikelihood(normalized, ["uterosacral", "sacrouterine", "retrocervical"]),
    adhesions: adhesionLikelihood === "likely" || adhesionLikelihood === "suspected" ? "high" : "low",
  };
}

function parseSurgeries(text: string) {
  const normalized = normalizeText(text);
  const surgeries: EndoCase["surgeries"] = [];
  const specificProcedure = normalized.match(/\b(laparoscopy|hysterectomy|endometriosis excision|resection|biopsy|adhesiolysis|stripping|ovarian cystectomy)\b/);
  const genericSurgery = normalized.match(/\b(had|underwent|previous|prior)\s+(?:a\s+)?surgery\b|\bsurgery\s+(?:in|on|during)\b/);
  const negatedSurgery = /\b(no|never had|without)\s+(?:prior\s+|previous\s+|a\s+)?surgery\b/.test(normalized);
  const surgeryMatch = specificProcedure ?? (!negatedSurgery ? genericSurgery : null);
  const yearMatch = normalized.match(/\b(19|20)\d{2}\b/g);
  const monthMatch = normalized.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/);

  if (surgeryMatch) {
    const year = yearMatch ? Number(yearMatch[yearMatch.length - 1]) : 0;
    const month = monthMatch?.[0];
    const dateNote = [month ? month[0].toUpperCase() + month.slice(1) : "", year || ""].filter(Boolean).join(" ");
    surgeries.push({
      year,
      type: specificProcedure?.[0] ?? "Surgery (type not specified)",
      notes: dateNote ? `Reported surgery date: ${dateNote}. Procedure details were not provided.` : "Extracted from patient history; procedure details were not provided.",
      completeness:
        /\bcomplete (excision|resection|removal)\b/.test(normalized) && !/\b(incomplete|partial|unclear)\b/.test(normalized)
          ? "complete"
          : /\b(incomplete|partial)\b/.test(normalized)
            ? "partial"
            : "unknown",
    });
  }

  return surgeries;
}

function parseImaging(text: string) {
  const normalized = normalizeText(text);
  const entries: string[] = [];

  if (normalized.includes("mri")) {
    entries.push("MRI report available");
  }
  if (normalized.includes("ultrasound") || normalized.includes("sonography")) {
    entries.push("Ultrasound report available");
  }
  if (normalized.includes("ct scan") || normalized.includes("computed tomography")) {
    entries.push("CT scan report available");
  }

  return entries;
}

function parseFlags(text: string) {
  const normalized = normalizeText(text);
  const flags: string[] = [];

  if (/suspected|possible|likely|cannot exclude|inconclusive|equivocal/.test(normalized)) {
    flags.push("Report contains uncertainty or suspected disease wording.");
  }
  if (/no clear|not definitive|unclear|discordant/.test(normalized)) {
    flags.push("Findings are not definitive and require specialist review.");
  }

  return flags;
}

function parseMissingInfo(text: string) {
  const normalized = normalizeText(text);
  const missing: string[] = [];

  if (!normalized.includes("mri") && !normalized.includes("ultrasound") && !normalized.includes("ct")) {
    missing.push("Imaging details are missing.");
  }
  if (!normalized.includes("surgery") && !normalized.includes("laparoscopy") && !normalized.includes("hysterectomy")) {
    missing.push("Surgical history is not available.");
  }
  if (!normalized.includes("pathology") && !normalized.includes("histology")) {
    missing.push("Pathology or histology summary is missing.");
  }

  return missing;
}

export function extractCaseInfo(text: string) {
  const cleanedText = text.trim();
  return {
    symptoms: parseSymptoms(cleanedText),
    diseaseMap: parseDiseaseMap(cleanedText),
    surgeries: parseSurgeries(cleanedText),
    imaging: parseImaging(cleanedText),
    uncertaintyFlags: parseFlags(cleanedText),
    missingInfo: parseMissingInfo(cleanedText),
  };
}

function detectDocumentProfile(text: string): DocumentProfile {
  const normalized = normalizeText(text);
  const detectedDates = Array.from(new Set([
    ...(text.match(/\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])\b/g) ?? []),
    ...(text.match(/\b(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[0-2])[-/.](?:19|20)\d{2}\b/g) ?? []),
    ...(text.match(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(?:19|20)\d{2}\b/gi) ?? []),
  ])).slice(0, 8);

  const providerCandidates = splitSourceSentences(text)
    .filter((sentence) => /\b(hospital|clinic|center|centre|institute|radiology|pathology|department|dr\.|prof\.)\b/i.test(sentence))
    .slice(0, 4);

  const qualityWarnings: string[] = [];
  if (text.trim().length < 160) qualityWarnings.push("Very short text; extraction may miss important context.");
  if (!/\b(mri|ultrasound|ct|laparoscopy|surgery|pathology|histology|symptom|pain)\b/i.test(text)) {
    qualityWarnings.push("Text does not look like a clinical history or medical report.");
  }

  let documentType: DocumentProfile["documentType"] = "unknown";
  if (/\b(mri|magnetic resonance|pelvic protocol|radiology)\b/.test(normalized)) documentType = "mri_report";
  else if (/\b(operative note|operation report|laparoscopy|surgery|excision|adhesiolysis)\b/.test(normalized)) documentType = "operative_note";
  else if (/\b(pathology|histology|biopsy)\b/.test(normalized)) documentType = "pathology_report";
  else if (/\b(dear doctor|clinic letter|consultation|assessment)\b/.test(normalized)) documentType = "clinic_letter";
  else if (/\b(i had|i have|patient reports|symptoms|pain)\b/.test(normalized)) documentType = "patient_history";

  return {
    documentType,
    detectedDates,
    providerCandidates,
    duplicateFingerprint: simpleFingerprint(text),
    qualityWarnings,
  };
}

function buildEvidence(text: string, extracted: ReturnType<typeof extractCaseInfo>, profile: DocumentProfile): ExtractionEvidence[] {
  const evidence: ExtractionEvidence[] = [];
  const add = (entry: ExtractionEvidence) => evidence.push(entry);

  for (const symptom of extracted.symptoms.slice(0, 8)) {
    const sourceSentence = firstSentenceFor(text, [symptom]) || firstSentenceFor(text, ["pain", "bleeding", "urinary", "constipation", "diarrhea"]);
    add({
      field: "symptoms",
      label: "Symptom",
      value: symptom,
      confidence: sourceSentence ? "high" : "low",
      sourceSentence: sourceSentence || "No direct source sentence found.",
      rationale: sourceSentence ? "Symptom wording appears directly in the source text." : "Symptom was inferred from limited text and needs confirmation.",
    });
  }

  const diseaseKeywords: Record<keyof EndoCase["diseaseMap"], string[]> = {
    ovaries: ["ovary", "ovarian", "endometrioma"],
    bowel: ["bowel", "rectosigmoid", "sigmoid", "rectal"],
    bladder: ["bladder", "ureter", "vesical"],
    uterosacral: ["uterosacral", "sacrouterine", "retrocervical"],
    adhesions: ["adhesion", "adhesions"],
  };
  for (const [location, value] of Object.entries(extracted.diseaseMap) as Array<[keyof EndoCase["diseaseMap"], string]>) {
    if (value === "unknown" || value === "low") continue;
    const sourceSentence = firstSentenceFor(text, diseaseKeywords[location]);
    add({
      field: "diseaseMap",
      label: `${location} finding`,
      value,
      confidence: sourceSentence && value !== "suspected" ? "high" : sourceSentence ? "medium" : "low",
      sourceSentence: sourceSentence || "No direct source sentence found.",
      rationale: value === "suspected" ? "Source wording suggests uncertainty." : "Source wording supports this compartment label.",
    });
  }

  for (const surgery of extracted.surgeries) {
    const sourceSentence = firstSentenceFor(text, ["surgery", "laparoscopy", "excision", "hysterectomy", "adhesiolysis", surgery.type.toLowerCase()]);
    add({
      field: "surgeries",
      label: "Surgical history",
      value: `${surgery.year || "Date unknown"} - ${surgery.type}`,
      confidence: sourceSentence && surgery.year ? "high" : sourceSentence ? "medium" : "low",
      sourceSentence: sourceSentence || "No direct source sentence found.",
      rationale: surgery.year ? "Surgery and year were detected from the source text." : "Surgery was detected but date or procedure details are incomplete.",
    });
  }

  for (const imaging of extracted.imaging) {
    const sourceSentence = firstSentenceFor(text, ["mri", "ultrasound", "sonography", "ct scan", "computed tomography"]);
    add({
      field: "imaging",
      label: "Imaging record",
      value: imaging,
      confidence: sourceSentence ? "high" : "medium",
      sourceSentence: sourceSentence || "Imaging modality detected without a complete source sentence.",
      rationale: "Imaging modality was detected from report text.",
    });
  }

  for (const flag of extracted.uncertaintyFlags) {
    const sourceSentence = firstSentenceFor(text, ["suspected", "possible", "likely", "cannot exclude", "inconclusive", "equivocal", "unclear", "discordant"]);
    add({
      field: "uncertaintyFlags",
      label: "Uncertainty",
      value: flag,
      confidence: sourceSentence ? "high" : "medium",
      sourceSentence: sourceSentence || "Uncertainty detected from report wording.",
      rationale: "Uncertain wording should trigger human verification.",
    });
  }

  for (const missing of extracted.missingInfo) {
    add({
      field: "missingInfo",
      label: "Missing information",
      value: missing,
      confidence: "medium",
      sourceSentence: "Derived from absence of expected document category in supplied text.",
      rationale: "Missing-record checks are checklist-based and require confirmation.",
    });
  }

  add({
    field: "document",
    label: "Document profile",
    value: profile.documentType.replace("_", " "),
    confidence: profile.documentType === "unknown" ? "low" : "medium",
    sourceSentence: profile.providerCandidates[0] ?? splitSourceSentences(text)[0] ?? "No source sentence available.",
    rationale: `Fingerprint ${profile.duplicateFingerprint}; use this to detect repeated uploads of similar text.`,
  });

  return evidence;
}

export function extractCaseIntelligence(text: string) {
  const cleanedText = text.trim();
  const extracted = extractCaseInfo(cleanedText);
  const documentProfile = detectDocumentProfile(cleanedText);
  const evidence = buildEvidence(cleanedText, extracted, documentProfile);
  const highConfidence = evidence.filter((entry) => entry.confidence === "high").length;
  const confidenceScore = evidence.length ? Math.round((highConfidence / evidence.length) * 100) : 0;

  return {
    extracted,
    evidence,
    documentProfile,
    confidenceScore,
    humanConfirmationRequired: evidence.some((entry) => entry.confidence !== "high") || extracted.uncertaintyFlags.length > 0 || extracted.missingInfo.length > 0,
  };
}
