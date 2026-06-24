"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { EndoCase } from "@/lib/types";

type ExtractedCaseStructure = {
  symptoms: string[];
  diseaseMap: EndoCase["diseaseMap"];
  surgeries: EndoCase["surgeries"];
  imaging: string[];
  uncertaintyFlags: string[];
  missingInfo: string[];
};

export default function ExtractReview({
  extracted,
  reportText,
  onSave,
}: {
  extracted: ExtractedCaseStructure;
  reportText: string;
  onSave: (corrected: ExtractedCaseStructure) => void;
}) {
  const [local, setLocal] = useState(() => ({ ...extracted }));
  const [symptomsText, setSymptomsText] = useState(() => extracted.symptoms.join("\n"));
  const [uncertaintyText, setUncertaintyText] = useState(() => extracted.uncertaintyFlags.join(", "));
  const [missingInfoText, setMissingInfoText] = useState(() => extracted.missingInfo.join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocal({ ...extracted });
    setSymptomsText(extracted.symptoms.join("\n"));
    setUncertaintyText(extracted.uncertaintyFlags.join(", "));
    setMissingInfoText(extracted.missingInfo.join(", "));
  }, [extracted]);

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    const corrected = {
      ...local,
      symptoms: splitLines(symptomsText),
      uncertaintyFlags: splitCommaSeparated(uncertaintyText),
      missingInfo: splitCommaSeparated(missingInfoText),
    };
    setLocal(corrected);
    onSave(corrected);
    try {
      const res = await fetch("/api/extract/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportText, corrected }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Save failed");
      setMessage(payload.persisted === false ? "Corrections applied to this case draft. Review audit storage is not configured." : "Corrections saved.");
    } catch (err) {
      setMessage(`Corrections applied to this case draft. ${err instanceof Error ? err.message : "Review audit could not be saved."}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Review extracted fields</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700">Symptoms (one per line)</label>
        <textarea
          className="mt-2 w-full rounded-lg border border-slate-300 p-3"
          value={symptomsText}
          onChange={(event) => setSymptomsText(event.target.value)}
          placeholder={"Pelvic pain\nPainful periods\nBloating"}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Uncertainty flags (comma separated)</label>
        <textarea
          className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 p-3"
          value={uncertaintyText}
          onChange={(event) => setUncertaintyText(event.target.value)}
          placeholder="Surgery type unclear, MRI findings need specialist confirmation"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Missing info (comma separated)</label>
        <textarea
          className="mt-2 min-h-20 w-full rounded-lg border border-slate-300 p-3"
          value={missingInfoText}
          onChange={(event) => setMissingInfoText(event.target.value)}
          placeholder="Operative report, Pathology report"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? "Saving..." : "Save corrections"}
        </Button>
        {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      </div>
    </div>
  );
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function splitCommaSeparated(value: string) {
  return value.split(/,|\r?\n/).map((item) => item.trim()).filter(Boolean);
}
