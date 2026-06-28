import { calculateReferralReadinessScore, getRecommendedSpecialistFocus } from "./case-utils.ts";
import type { EndoCase } from "./types.ts";

export type IntelligenceSignal = {
  id: string;
  label: string;
  finding: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  action: string;
  guardrail: string;
};

export type IntelligenceProfile = {
  confidenceScore: number;
  confidenceLabel: "High confidence" | "Moderate confidence" | "Low confidence";
  permittedUse: string;
  prohibitedUse: string;
  signals: IntelligenceSignal[];
  humanReviewRequired: boolean;
};

function evidenceList(items: string[], fallback: string) {
  return items.length ? items.slice(0, 3) : [fallback];
}

function confidenceForEvidence(count: number, hasUncertainty: boolean): IntelligenceSignal["confidence"] {
  if (count >= 2 && !hasUncertainty) return "high";
  if (count >= 1) return "medium";
  return "low";
}

function confidenceScore(item: EndoCase) {
  let score = calculateReferralReadinessScore(item);
  if (item.imaging.length === 0) score -= 10;
  if (item.symptoms.length === 0) score -= 10;
  if (item.missingInfo.length > 0) score -= Math.min(18, item.missingInfo.length * 6);
  if (item.uncertaintyFlags.length > 0) score -= Math.min(18, item.uncertaintyFlags.length * 6);
  if (item.surgeries.some((surgery) => surgery.completeness === "unknown")) score -= 6;
  return Math.max(10, Math.min(100, score));
}

function confidenceLabel(score: number): IntelligenceProfile["confidenceLabel"] {
  if (score >= 82) return "High confidence";
  if (score >= 62) return "Moderate confidence";
  return "Low confidence";
}

export function buildIntelligenceProfile(item: EndoCase): IntelligenceProfile {
  const score = confidenceScore(item);
  const signals: IntelligenceSignal[] = [];
  const hasUncertainty = item.uncertaintyFlags.length > 0;
  const posteriorEvidence = [
    ...item.imaging.filter((entry) => /mri|ultrasound|bowel|rectosigmoid|uterosacral|posterior/i.test(entry)),
    ...item.symptoms.filter((entry) => /bowel|rectal|deep|dyspareunia|pelvic/i.test(entry)),
    ...item.timeline.filter((entry) => /bowel|rectosigmoid|uterosacral|posterior|mri/i.test(entry.label)).map((entry) => `${entry.date}: ${entry.label}`),
  ];

  if (item.diseaseMap.bowel === "likely" || item.diseaseMap.bowel === "suspected" || item.diseaseMap.uterosacral === "likely" || item.diseaseMap.uterosacral === "suspected") {
    signals.push({
      id: "posterior-compartment",
      label: "Posterior compartment signal",
      finding: "Case may need posterior-compartment expertise rather than general endometriosis routing.",
      confidence: confidenceForEvidence(posteriorEvidence.length, hasUncertainty),
      evidence: evidenceList(posteriorEvidence, "Disease map indicates possible posterior involvement, but source evidence is incomplete."),
      action: "Ask a clinician to verify the disease map and confirm whether bowel, rectosigmoid, or uterosacral expertise is needed.",
      guardrail: "This signal routes specialist fit; it must not be presented as an automated diagnosis.",
    });
  }

  if (item.missingInfo.length > 0) {
    signals.push({
      id: "missing-records",
      label: "Missing-record burden",
      finding: `${item.missingInfo.length} record gap(s) may reduce referral quality.`,
      confidence: "high",
      evidence: item.missingInfo.slice(0, 4),
      action: "Request these records before final surgical planning or mark why they are unavailable.",
      guardrail: "A missing-record checklist is administrative support; it should not decide whether care is appropriate.",
    });
  }

  if (item.surgeries.length > 0) {
    const incomplete = item.surgeries.filter((surgery) => surgery.completeness !== "complete");
    signals.push({
      id: "surgical-completeness",
      label: "Surgical history quality",
      finding: incomplete.length ? "Prior surgery completeness is partial or unclear." : "Prior surgical documentation appears more complete.",
      confidence: confidenceForEvidence(item.surgeries.length, incomplete.length > 0 || hasUncertainty),
      evidence: item.surgeries.map((surgery) => `${surgery.year || "Date unknown"}: ${surgery.type}; completeness ${surgery.completeness}`).slice(0, 4),
      action: incomplete.length ? "Obtain operative and pathology reports before final referral decisions." : "Have a clinician confirm the operative report supports the completeness label.",
      guardrail: "Completeness labels are record-quality labels, not outcome predictions.",
    });
  }

  if (item.uncertaintyFlags.length > 0) {
    signals.push({
      id: "uncertainty",
      label: "Human review trigger",
      finding: "The case contains uncertain, conflicting, or incomplete clinical wording.",
      confidence: "high",
      evidence: item.uncertaintyFlags.slice(0, 4),
      action: "Route to clinician review before using the packet for specialist referral.",
      guardrail: "Uncertainty should increase human review, not produce automated conclusions.",
    });
  }

  const specialistGuidance = getRecommendedSpecialistFocus(item);
  if (specialistGuidance.length > 0) {
    signals.push({
      id: "specialist-fit",
      label: "Specialist-fit rationale",
      finding: "Suggested specialist focus is explainable from disease map, surgical history, and record gaps.",
      confidence: confidenceForEvidence(specialistGuidance.length, hasUncertainty),
      evidence: specialistGuidance.slice(0, 4),
      action: "Use this as a routing explanation after a clinician confirms the structured case data.",
      guardrail: "Do not rank or guarantee surgeons; show transparent fit criteria only.",
    });
  }

  if (signals.length === 0) {
    signals.push({
      id: "low-evidence",
      label: "Insufficient evidence",
      finding: "The case does not yet contain enough structured evidence for meaningful automated assistance.",
      confidence: "low",
      evidence: ["Add symptoms, imaging reports, operative notes, pathology, or specialist letters."],
      action: "Collect records before using automated routing or readiness labels.",
      guardrail: "Low-evidence cases should default to manual clinician review.",
    });
  }

  return {
    confidenceScore: score,
    confidenceLabel: confidenceLabel(score),
    permittedUse: "Organize records, surface documentation gaps, explain referral-readiness signals, and support clinician review.",
    prohibitedUse: "Do not diagnose, detect disease from images, choose treatment, replace clinician judgment, or guarantee surgeon quality.",
    signals,
    humanReviewRequired: signals.some((signal) => signal.confidence !== "high") || item.uncertaintyFlags.length > 0 || item.missingInfo.length > 0,
  };
}
