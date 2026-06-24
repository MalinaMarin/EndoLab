import assert from "node:assert/strict";
import test from "node:test";
import { extractCaseInfo } from "../lib/document-extraction.ts";

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
