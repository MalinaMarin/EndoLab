"use client";

import React from "react";

const KNOWN_FIELDS = [
  "(ignore)",
  "title",
  "reportText",
  "symptoms",
  "age",
  "country",
  "imaging",
  "procedureNotes",
  "mrn",
  "patientName",
];

export default function FieldMapper({ headers, mapping, setMapping }: { headers: string[]; mapping: Record<string, string>; setMapping: (m: Record<string, string>) => void; }) {
  function update(header: string, value: string) {
    const next = { ...mapping, [header]: value };
    setMapping(next);
  }

  function guessField(header: string) {
    const normalized = header.toLowerCase().replace(/[\s_\-]+/g, " ").trim();
    if (normalized.includes("patient name") || normalized === "name") return "patientName";
    if (normalized.includes("mrn") || normalized.includes("patient id") || normalized === "id") return "mrn";
    if (normalized.includes("title")) return "title";
    if (normalized.includes("diagnosis") || normalized.includes("note") || normalized.includes("report") || normalized.includes("summary") || normalized.includes("clinical")) return "reportText";
    if (normalized.includes("symptom")) return "symptoms";
    if (normalized.includes("age")) return "age";
    if (normalized.includes("country")) return "country";
    if (normalized.includes("imaging") || normalized.includes("scan") || normalized.includes("ultrasound") || normalized.includes("mri")) return "imaging";
    if (normalized.includes("procedure") || normalized.includes("surgery") || normalized.includes("operative")) return "procedureNotes";
    return "(ignore)";
  }

  function applySuggestion() {
    const next: Record<string, string> = {};
    headers.forEach((header) => {
      next[header] = guessField(header);
    });
    setMapping(next);
  }

  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-violet-950">Field mapping</h3>
          <p className="mt-2 text-sm text-violet-700">Map CSV headers to EndoLab fields so imported rows are correctly parsed.</p>
        </div>
        <button type="button" onClick={applySuggestion} className="rounded-full border px-3 py-1 text-sm text-violet-700 hover:bg-violet-50">
          Suggest mapping
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {headers.map((h) => (
          <div key={h} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-violet-900">{h}</p>
            </div>
            <select value={mapping[h] ?? KNOWN_FIELDS[0]} onChange={(e) => update(h, e.target.value)} className="rounded-xl border p-2 text-sm">
              {KNOWN_FIELDS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
