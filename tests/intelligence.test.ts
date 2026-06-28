import assert from "node:assert/strict";
import test from "node:test";
import { buildIntelligenceProfile } from "../lib/intelligence.ts";
import type { EndoCase } from "../lib/types.ts";

const baseCase: EndoCase = {
  id: "test-case",
  title: "Complex endometriosis review",
  patient: { age: 34, country: "Romania" },
  summary: "Patient seeks specialist review for cyclic pelvic pain and bowel symptoms.",
  timeline: [
    { date: "2024-05", label: "MRI reported rectosigmoid tethering", type: "imaging" },
  ],
  diseaseMap: {
    ovaries: "unknown",
    bowel: "suspected",
    bladder: "unknown",
    uterosacral: "likely",
    adhesions: "medium",
  },
  surgeries: [
    { year: 2022, type: "Laparoscopic excision", notes: "Completeness unclear.", completeness: "unknown" },
  ],
  imaging: ["MRI pelvis report mentions rectosigmoid tethering"],
  symptoms: ["Cyclic pelvic pain", "Bowel pain during menses"],
  uncertaintyFlags: [],
  missingInfo: [],
  severity: "MEDIUM",
  complexityNote: "Needs specialist fit review.",
};

test("intelligence profile explains specialist fit without diagnostic wording", () => {
  const profile = buildIntelligenceProfile(baseCase);
  const specialistSignal = profile.signals.find((signal) => signal.id === "specialist-fit");

  assert.ok(specialistSignal);
  assert.match(specialistSignal.guardrail, /Do not rank or guarantee surgeons/);
  assert.match(profile.prohibitedUse, /Do not diagnose/);
});

test("uncertainty and missing records force human review", () => {
  const profile = buildIntelligenceProfile({
    ...baseCase,
    uncertaintyFlags: ["MRI and symptoms are discordant."],
    missingInfo: ["Pathology report is missing."],
  });

  assert.equal(profile.humanReviewRequired, true);
  assert.ok(profile.signals.some((signal) => signal.id === "uncertainty"));
  assert.ok(profile.signals.some((signal) => signal.id === "missing-records"));
});
