import { EndoCase } from "@/lib/types";
export { matchSpecialists } from "@/lib/specialists";

function locationLabel(value: string) {
  return value.replace("_", " ");
}

export function generateCaseSummary(params: {
  title: string;
  symptoms: string[];
  imaging: string[];
  surgeries: EndoCase["surgeries"];
  diseaseMap: EndoCase["diseaseMap"];
}) {
  const { title, symptoms, imaging, surgeries, diseaseMap } = params;
  const affected = [
    diseaseMap.ovaries,
    diseaseMap.bowel,
    diseaseMap.bladder,
    diseaseMap.uterosacral,
  ].filter((value) => value === "likely" || value === "suspected").length;

  const symptomPreview = symptoms.length > 0 ? symptoms.slice(0, 3).join(", ") : "no key symptoms recorded";
  const surgeryText = surgeries.length > 0 ? `${surgeries.length} prior surgical record(s)` : "no prior surgery documented";
  const imagingText = imaging.length > 0 ? `${imaging.length} imaging entry(ies) available` : "no imaging reports available";

  return `Case titled "${title}" with ${symptoms.length} symptom item(s), including ${symptomPreview}. Summary suggests ${affected > 0 ? `${affected} affected compartment(s)` : "unclear compartment involvement"}, ${surgeryText}, and ${imagingText}.`;
}

export function buildClinicalSummary(item: EndoCase) {
  const compartments = [
    { label: "Ovaries", value: item.diseaseMap.ovaries },
    { label: "Bowel", value: item.diseaseMap.bowel },
    { label: "Bladder", value: item.diseaseMap.bladder },
    { label: "Uterosacral ligaments", value: item.diseaseMap.uterosacral },
  ];

  const affected = compartments
    .filter((compartment) => compartment.value === "likely" || compartment.value === "suspected")
    .map((compartment) => `${compartment.label}: ${locationLabel(compartment.value)}`);

  const summary: string[] = [];
  summary.push(`Severity rated ${item.severity.toLowerCase()} with ${item.symptoms.length} key symptom(s).`);
  summary.push(`Medical records include ${item.imaging.length} imaging entries and ${item.surgeries.length} surgical event(s).`);

  if (affected.length > 0) {
    summary.push(`Probable disease compartments: ${affected.join(", ")}.`);
  } else {
    summary.push("Disease compartment involvement is currently unclear.");
  }

  if (item.surgeries.length > 0) {
    const incomplete = item.surgeries.filter((surgery) => surgery.completeness !== "complete").length;
    summary.push(
      incomplete > 0
        ? `${incomplete} prior surgical record(s) suggest partial or unclear excision completeness.`
        : "Prior surgical reports document complete compartment assessment."
    );
  } else {
    summary.push("No prior surgical staging or excision details are available.");
  }

  if (item.uncertaintyFlags.length > 0) {
    summary.push(`Uncertainty indicators: ${item.uncertaintyFlags.length} items require specialist review.`);
  }

  if (item.missingInfo.length > 0) {
    summary.push(`Missing critical documentation: ${item.missingInfo.length} item(s).`);
  }

  return summary.slice(0, 7);
}

export function getDataCompletenessLabel(item: EndoCase) {
  const missing = item.missingInfo.length;
  if (missing === 0) return "Complete documentation";
  if (missing <= 2) return "Partial documentation";
  return "Documentation gaps detected";
}

export function getCaseDisposition(item: EndoCase) {
  const qualityScore = calculateCaseQualityScore(item);

  if (item.missingInfo.length >= 3 || item.uncertaintyFlags.length >= 2 || qualityScore < 68) {
    return "Needs further documentation before final surgical planning";
  }

  if (qualityScore >= 84 && item.missingInfo.length <= 1) {
    return "Ready for specialist review and second opinion";
  }

  return "Recommend multidisciplinary endometriosis review";
}

export function buildSecondOpinionRecommendation(item: EndoCase) {
  const disposition = getCaseDisposition(item);
  const actions: string[] = [disposition];

  if (item.surgeries.length === 0) {
    actions.push("Consider diagnostic staging by an experienced endometriosis surgeon.");
  }

  if (item.uncertaintyFlags.length > 0) {
    actions.push("Request specialist review of discordant imaging and symptoms.");
  }

  if (item.missingInfo.length > 0) {
    actions.push("Obtain missing operative, pathology, or MRI protocol documentation.");
  }

  return actions;
}

export function calculateCaseQualityScore(item: EndoCase) {
  let score = 100;

  if (item.severity === "HIGH") score -= 10;
  if (item.severity === "MEDIUM") score -= 4;
  score -= item.missingInfo.length * 8;
  score -= item.uncertaintyFlags.length * 6;
  if (item.surgeries.length === 0) score -= 6;
  if (item.surgeries.some((surgery) => surgery.completeness !== "complete")) score -= 4;

  return Math.max(18, Math.min(100, score));
}

export function calculateReferralReadinessScore(item: EndoCase) {
  return calculateCaseQualityScore(item);
}

export function getReferralReadinessLabel(score: number) {
  if (score >= 84) return "Ready for specialist review";
  if (score >= 68) return "Needs focused record chase";
  return "Not referral-ready yet";
}

export function getCaseQualityLabel(score: number) {
  if (score >= 84) return "Clinical readiness";
  if (score >= 68) return "Needs focused review";
  return "Requires specialist clarification";
}

export function buildMissingRecordWorkflow(item: EndoCase) {
  if (item.missingInfo.length === 0) {
    return [
      "No critical missing records detected.",
      "Confirm consent and send the case package for specialist review.",
    ];
  }

  return item.missingInfo.map((entry, index) => {
    const owner = index === 0 ? "Patient coordinator" : index === 1 ? "Clinic admin" : "Records team";
    return `${owner}: request ${entry.toLowerCase()} before final referral.`;
  });
}

export function buildGovernedLearningSignals(item: EndoCase) {
  const signals: string[] = [];

  if (item.uncertaintyFlags.length > 0) {
    signals.push(`${item.uncertaintyFlags.length} uncertainty item(s) ready for reviewer correction.`);
  }

  if (item.missingInfo.length > 0) {
    signals.push(`${item.missingInfo.length} documentation gap(s) can train the missing-records checklist.`);
  }

  if (item.surgeries.some((surgery) => surgery.completeness !== "complete")) {
    signals.push("Surgical completeness labels can improve future referral readiness scoring.");
  }

  if (signals.length === 0) {
    signals.push("Reviewed case can be exported as a high-confidence deidentified training example.");
  }

  return signals;
}

export function buildClinicalActionItems(item: EndoCase) {
  const actions: string[] = [];

  if (item.missingInfo.length > 0) {
    actions.push(`Obtain missing documentation: ${item.missingInfo.length} critical item(s).`);
  }

  if (item.uncertaintyFlags.length > 0) {
    actions.push("Resolve conflicting findings with specialist review and targeted imaging.");
  }

  if (item.surgeries.length > 0 && item.surgeries.some((surgery) => surgery.completeness !== "complete")) {
    actions.push("Clarify prior surgical completeness and compartment mapping.");
  }

  if (item.surgeries.length === 0) {
    actions.push("Consider diagnostic staging or multidisciplinary specialist assessment.");
  }

  if (actions.length === 0) {
    actions.push("Case appears well documented; validate findings with a specialist review.");
  }

  return actions;
}

export function getReviewPriority(item: EndoCase) {
  if (item.severity === "HIGH" || item.uncertaintyFlags.length >= 2) {
    return "High priority review";
  }
  if (item.severity === "MEDIUM") {
    return "Priority review recommended";
  }
  return "Routine review";
}

export function getRecommendedSpecialistFocus(item: EndoCase) {
  const recommendations: string[] = [];

  if (item.diseaseMap.bowel === "likely" || item.diseaseMap.bowel === "suspected") {
    recommendations.push("Bowel/rectosigmoid expertise required due to suspected posterior compartment disease.");
  }
  if (item.diseaseMap.bladder === "likely" || item.diseaseMap.bladder === "suspected") {
    recommendations.push("Bladder and ureteral mapping expertise recommended for potential urinary tract involvement.");
  }
  if (item.diseaseMap.uterosacral === "likely" || item.diseaseMap.uterosacral === "suspected") {
    recommendations.push("Deep infiltrating endometriosis specialist review advised for uterosacral and retrocervical disease.");
  }
  if (item.surgeries.length === 0) {
    recommendations.push("Diagnostic surgical staging by an experienced endometriosis surgeon is preferred over repeated non-specialist procedures.");
  } else if (item.surgeries.some((surgery) => surgery.completeness !== "complete")) {
    recommendations.push("Prior surgical completeness unclear; refer to a specialist who performs full compartment mapping.");
  }

  if (item.missingInfo.length > 0) {
    recommendations.push("Request missing operative or pathology documentation before final surgical planning when possible.");
  }

  if (recommendations.length === 0) {
    recommendations.push("General endometriosis surgeon review is appropriate; confirm that the surgeon has documented excision expertise.");
  }

  return recommendations;
}

export function buildSurgeonExpertiseTags(item: EndoCase) {
  const tags: string[] = [];

  if (item.diseaseMap.bowel === "likely" || item.diseaseMap.bowel === "suspected") {
    tags.push("Bowel DIE expertise");
  }

  if (item.diseaseMap.bladder === "likely" || item.diseaseMap.bladder === "suspected") {
    tags.push("Urinary tract/bladder expertise");
  }

  if (item.diseaseMap.uterosacral === "likely" || item.diseaseMap.uterosacral === "suspected") {
    tags.push("Deep infiltrating endometriosis expertise");
  }

  if (item.surgeries.length > 0) {
    tags.push("Surgical excision review");
  }

  if (item.uncertaintyFlags.length > 0) {
    tags.push("Conflict resolution");
  }

  if (item.missingInfo.length > 0) {
    tags.push("Documentation validation");
  }

  if (tags.length === 0) {
    tags.push("Endometriosis specialist review");
  }

  return tags;
}
