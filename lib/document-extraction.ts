import type { EndoCase } from "@/lib/types";

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
