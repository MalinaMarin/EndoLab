import assert from "node:assert/strict";
import test from "node:test";
import { cleanText, enforceRateLimit, isAllowedClinicalFile } from "../lib/request-safety.ts";

test("cleanText trims and caps untrusted text", () => {
  assert.equal(cleanText("  abcdef  ", 4), "abcd");
  assert.equal(cleanText(null, 10), "");
});

test("clinical files enforce type and size limits", () => {
  assert.equal(isAllowedClinicalFile(new File(["report"], "report.pdf", { type: "application/pdf" })), true);
  assert.equal(isAllowedClinicalFile(new File(["script"], "script.html", { type: "text/html" })), false);
  assert.equal(
    isAllowedClinicalFile(new File([new Uint8Array(20 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" })),
    false,
  );
});

test("rate limiting blocks requests after the configured allowance", () => {
  const request = new Request("http://localhost/api/test", { headers: { "x-forwarded-for": "203.0.113.50" } });
  const key = `test-${Date.now()}`;
  assert.equal(enforceRateLimit(request, { key, limit: 2, windowMs: 10_000 }), null);
  assert.equal(enforceRateLimit(request, { key, limit: 2, windowMs: 10_000 }), null);
  assert.ok(enforceRateLimit(request, { key, limit: 2, windowMs: 10_000 }));
});
