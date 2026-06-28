"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { EndoCase } from "@/lib/types";
import type { DocumentProfile, ExtractionEvidence } from "@/lib/document-extraction";
import { AlertTriangle, CheckCircle2, FileSearch2 } from "lucide-react";

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
  evidence = [],
  documentProfile,
  confidenceScore,
  humanConfirmationRequired = false,
  reportText,
  onSave,
}: {
  extracted: ExtractedCaseStructure;
  evidence?: ExtractionEvidence[];
  documentProfile?: DocumentProfile | null;
  confidenceScore?: number | null;
  humanConfirmationRequired?: boolean;
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Review extracted fields</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Confirm the structured data below. Findings with weak evidence should be corrected before the case is submitted.
          </p>
        </div>
        {typeof confidenceScore === "number" ? (
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">Extraction confidence</p>
            <p className="mt-1 text-2xl font-semibold text-violet-950">{confidenceScore}%</p>
          </div>
        ) : null}
      </div>

      {humanConfirmationRequired ? (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Human confirmation is required because some findings are uncertain, inferred from missing information, or not fully supported by a source sentence.</p>
        </div>
      ) : null}

      {documentProfile ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-3">
          <ProfileItem label="Document type" value={documentProfile.documentType.replace("_", " ")} />
          <ProfileItem label="Duplicate fingerprint" value={documentProfile.duplicateFingerprint} />
          <ProfileItem label="Dates detected" value={documentProfile.detectedDates.length ? documentProfile.detectedDates.join(", ") : "None detected"} />
          {documentProfile.providerCandidates.length ? (
            <div className="md:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Provider hints</p>
              <p className="mt-1 text-slate-700">{documentProfile.providerCandidates.join(" | ")}</p>
            </div>
          ) : null}
          {documentProfile.qualityWarnings.length ? (
            <div className="md:col-span-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              {documentProfile.qualityWarnings.join(" ")}
            </div>
          ) : null}
        </div>
      ) : null}

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

      {evidence.length ? (
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <FileSearch2 className="h-4 w-4 text-violet-700" />
            Source evidence
          </h4>
          <div className="mt-3 space-y-3">
            {evidence.slice(0, 12).map((entry, index) => (
              <article key={`${entry.field}-${entry.value}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{entry.label}: {entry.value}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{entry.rationale}</p>
                  </div>
                  <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${confidenceClass(entry.confidence)}`}>
                    {entry.confidence === "high" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    {entry.confidence}
                  </span>
                </div>
                <blockquote className="mt-3 rounded-md border-l-4 border-violet-200 bg-violet-50/70 px-3 py-2 text-sm leading-6 text-violet-950">
                  {entry.sourceSentence}
                </blockquote>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function splitCommaSeparated(value: string) {
  return value.split(/,|\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function confidenceClass(confidence: ExtractionEvidence["confidence"]) {
  if (confidence === "high") return "bg-emerald-50 text-emerald-800";
  if (confidence === "medium") return "bg-amber-50 text-amber-800";
  return "bg-rose-50 text-rose-800";
}
