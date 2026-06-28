import assert from "node:assert/strict";
import test from "node:test";
import { extractCaseInfo, extractCaseIntelligence } from "../lib/document-extraction.ts";

test("negated bowel findings are not marked likely", () => {
  const result = extractCaseInfo("MRI demonstrates no bowel nodularity and no evidence of rectosigmoid involvement.");
  assert.equal(result.diseaseMap.bowel, "ruled_out");
});

test("uncertain compartment wording remains suspected", () => {
  const result = extractCaseInfo("Possible uterosacral endometriosis. Cannot exclude bladder involvement.");
  assert.equal(result.diseaseMap.uterosacral, "suspected");
  assert.equal(result.diseaseMap.bladder, "suspected");
});

test("urinary symptoms alone do not imply bladder disease", () => {
  const result = extractCaseInfo("Patient reports urinary urgency and pelvic pain. MRI is otherwise normal.");
  assert.equal(result.diseaseMap.bladder, "unknown");
});

test("incomplete surgery is not labeled complete and undated surgery stays unknown", () => {
  const result = extractCaseInfo("Prior laparoscopy with incomplete excision. Operative date unavailable.");
  assert.equal(result.surgeries[0]?.completeness, "partial");
  assert.equal(result.surgeries[0]?.year, 0);
});

test("generic patient-reported surgery with month and year is extracted", () => {
  const result = extractCaseInfo("I had surgery in May 2022.");
  assert.equal(result.surgeries[0]?.year, 2022);
  assert.equal(result.surgeries[0]?.type, "Surgery (type not specified)");
  assert.match(result.surgeries[0]?.notes ?? "", /May 2022/);
});

test("negated generic surgery is not extracted", () => {
  const result = extractCaseInfo("I have never had surgery.");
  assert.equal(result.surgeries.length, 0);
});

test("document intelligence returns evidence and human confirmation flags", () => {
  const result = extractCaseIntelligence("Bucharest Endometriosis Clinic. MRI pelvis May 2026 shows suspected rectosigmoid involvement. Pathology report is unavailable.");
  assert.equal(result.documentProfile.documentType, "mri_report");
  assert.ok(result.documentProfile.detectedDates.includes("May 2026"));
  assert.ok(result.documentProfile.providerCandidates.some((item) => item.includes("Clinic")));
  assert.ok(result.evidence.some((item) => item.field === "diseaseMap" && item.sourceSentence.includes("rectosigmoid")));
  assert.equal(result.humanConfirmationRequired, true);
});

test("duplicate fingerprint is stable for similar report text", () => {
  const first = extractCaseIntelligence("MRI pelvis 2025-01-02 shows bowel tethering.");
  const second = extractCaseIntelligence("MRI pelvis 2026-04-20 shows bowel tethering.");
  assert.equal(first.documentProfile.duplicateFingerprint, second.documentProfile.duplicateFingerprint);
});
