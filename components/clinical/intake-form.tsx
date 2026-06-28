"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, FileText, HeartPulse, Save, UploadCloud, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import ExtractReview from "@/components/clinical/extract-review";
import EditableDiseaseMap from "@/components/clinical/editable-disease-map";
import SurgeriesEditor from "@/components/clinical/surgeries-editor";
import type { EndoCase } from "@/lib/types";
import { generateCaseSummary } from "@/lib/case-utils";
import type { DocumentProfile, ExtractionEvidence } from "@/lib/document-extraction";

type ExtractedCaseStructure = {
  symptoms: string[];
  diseaseMap: EndoCase["diseaseMap"];
  surgeries: EndoCase["surgeries"];
  imaging: string[];
  uncertaintyFlags: string[];
  missingInfo: string[];
};

type Draft = {
  title: string;
  age: string;
  country: string;
  symptoms: string;
  structuredSymptoms: string[];
  reportText: string;
  diseaseMap: EndoCase["diseaseMap"];
  surgeries: EndoCase["surgeries"];
  uncertaintyFlags: string[];
  missingInfo: string[];
  consent: boolean;
};

const DRAFT_KEY = "endolab-intake-draft-v2";
const defaultDiseaseMap: EndoCase["diseaseMap"] = {
  ovaries: "unknown",
  bowel: "unknown",
  bladder: "unknown",
  uterosacral: "unknown",
  adhesions: "low",
};
const steps = [
  { title: "About you", detail: "Case context", icon: UserRound },
  { title: "Symptoms", detail: "History and priorities", icon: HeartPulse },
  { title: "Records", detail: "Reports and files", icon: UploadCloud },
  { title: "Review findings", detail: "Confirm structure", icon: FileText },
  { title: "Submit", detail: "Consent and finish", icon: ClipboardCheck },
];

export function IntakeForm({ paymentEnabled, accountType }: { paymentEnabled: boolean; accountType: "patient" | "clinic" }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    title: "",
    age: "",
    country: "",
    symptoms: "",
    structuredSymptoms: [],
    reportText: "",
    diseaseMap: defaultDiseaseMap,
    surgeries: [],
    uncertaintyFlags: [],
    missingInfo: [],
    consent: false,
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [latestExtracted, setLatestExtracted] = useState<ExtractedCaseStructure | null>(null);
  const [latestEvidence, setLatestEvidence] = useState<ExtractionEvidence[]>([]);
  const [latestDocumentProfile, setLatestDocumentProfile] = useState<DocumentProfile | null>(null);
  const [latestConfidenceScore, setLatestConfidenceScore] = useState<number | null>(null);
  const [humanConfirmationRequired, setHumanConfirmationRequired] = useState(false);
  const [editingStructure, setEditingStructure] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const stored = window.localStorage.getItem(DRAFT_KEY);
    if (!stored) return;
    try {
      setDraft((current) => ({ ...current, ...(JSON.parse(stored) as Partial<Draft>) }));
      setSavedAt("Restored");
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const summaryPreview = useMemo(() => {
    const symptomList = draft.structuredSymptoms.length ? draft.structuredSymptoms : splitLines(draft.symptoms);
    if (!draft.title || symptomList.length === 0) return "Add a title and symptoms to generate your case summary.";
    return generateCaseSummary({
      title: draft.title,
      symptoms: symptomList,
      imaging: draft.reportText ? ["Clinical report supplied"] : [],
      surgeries: draft.surgeries,
      diseaseMap: draft.diseaseMap,
    });
  }, [draft]);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function canContinue() {
    if (step === 0) return Boolean(draft.title.trim() && draft.age && draft.country.trim());
    if (step === 1) return Boolean(draft.symptoms.trim());
    return true;
  }

  async function extract() {
    const sourceText = [draft.symptoms.trim(), draft.reportText.trim()].filter(Boolean).join("\n\n");
    if (!sourceText) {
      toast.show({ title: "Add case history", message: "Describe your symptoms or paste a clinical report first.", type: "info" });
      return;
    }
    setIsExtracting(true);
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText }),
      });
      const payload = await response.json() as {
        extracted?: ExtractedCaseStructure;
        evidence?: ExtractionEvidence[];
        documentProfile?: DocumentProfile;
        confidenceScore?: number;
        humanConfirmationRequired?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.extracted) throw new Error(payload.error ?? "Extraction failed.");
      const extracted = payload.extracted;
      setLatestExtracted(extracted);
      setLatestEvidence(payload.evidence ?? []);
      setLatestDocumentProfile(payload.documentProfile ?? null);
      setLatestConfidenceScore(payload.confidenceScore ?? null);
      setHumanConfirmationRequired(Boolean(payload.humanConfirmationRequired));
      setDraft((current) => ({
        ...current,
        structuredSymptoms: extracted.symptoms.length ? extracted.symptoms : current.structuredSymptoms,
        diseaseMap: extracted.diseaseMap,
        surgeries: extracted.surgeries.length ? extracted.surgeries : current.surgeries,
        uncertaintyFlags: extracted.uncertaintyFlags,
        missingInfo: extracted.missingInfo,
      }));
      setStep(3);
      toast.show({ title: "Findings structured", message: "Review the source evidence before confirming this case.", type: "success" });
    } catch (error) {
      toast.show({ title: "Extraction failed", message: error instanceof Error ? error.message : "Extraction failed.", type: "error" });
    } finally {
      setIsExtracting(false);
    }
  }

  async function submit() {
    if (!draft.consent) {
      toast.show({ title: "Consent required", message: "Confirm that you are authorized to submit these records.", type: "info" });
      return;
    }
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("title", draft.title);
      formData.set("age", draft.age);
      formData.set("country", draft.country);
      formData.set("symptoms", (draft.structuredSymptoms.length ? draft.structuredSymptoms : splitLines(draft.symptoms)).join("\n"));
      formData.set("reportText", draft.reportText);
      formData.set("diseaseMap", JSON.stringify(draft.diseaseMap));
      formData.set("surgeries", JSON.stringify(draft.surgeries));
      formData.set("uncertaintyFlags", JSON.stringify(draft.uncertaintyFlags));
      formData.set("missingInfo", JSON.stringify(draft.missingInfo));
      formData.set("privacyConsent", "accepted");
      formData.set("consentVersion", "2026-06-24");
      if (accountType === "clinic") formData.set("sourceLabel", "clinic coordinator intake");
      documents.forEach((file) => formData.append("documents", file));

      const response = await fetch("/api/cases", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.id) throw new Error(payload.error ?? payload.details ?? "Could not create case.");
      setCaseId(payload.id);
      window.localStorage.removeItem(DRAFT_KEY);
      toast.show({ title: "Case created", message: "Your structured case is now in your private workspace.", type: "success" });
    } catch (error) {
      toast.show({ title: "Submission failed", message: error instanceof Error ? error.message : "Submission failed.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function checkout() {
    if (!caseId) return;
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId }),
    });
    const payload = await response.json();
    if (response.ok && payload.url) window.location.assign(payload.url);
    else toast.show({ title: "Checkout unavailable", message: payload.error ?? "Checkout could not be started.", type: "error" });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-violet-200 bg-white shadow-[0_20px_50px_-38px_rgba(76,29,149,0.55)]">
      <div className="border-b border-violet-100 bg-violet-50/70 px-5 py-4 md:px-7">
        <div className="flex items-center justify-between gap-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-violet-800">
            <Save className="h-4 w-4" /> {savedAt ? `Draft saved ${savedAt}` : "Draft saves automatically"}
          </p>
          <p className="text-sm font-semibold text-violet-700">{step + 1} of {steps.length}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100">
          <div className="h-full bg-violet-700 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <div className="mt-4 hidden grid-cols-5 gap-2 md:grid">
          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <button key={item.title} type="button" onClick={() => setStep(index)} className={`rounded-lg px-3 py-2 text-left ${index === step ? "bg-white text-violet-950 shadow-sm" : "text-slate-500"}`}>
                <span className="flex items-center gap-2 text-xs font-semibold"><Icon className="h-3.5 w-3.5" /> {item.title}</span>
                <span className="mt-1 block text-xs">{item.detail}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[430px] p-5 md:p-7">
        <h2 className="text-2xl font-semibold text-slate-950">{steps[step].title}</h2>
        <p className="mt-1 text-sm text-slate-600">{steps[step].detail}</p>

        <div className="mt-6">
          {step === 0 ? (
            <div className="space-y-5">
              <Field label="Case title">
                <input value={draft.title} onChange={(event) => update("title", event.target.value)} maxLength={160} placeholder="Example: Persistent bowel pain after prior surgery" className="h-12 w-full rounded-lg border border-slate-300 px-4" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Age"><input type="number" min={18} max={100} value={draft.age} onChange={(event) => update("age", event.target.value)} className="h-12 w-full rounded-lg border border-slate-300 px-4" /></Field>
                <Field label="Country"><input value={draft.country} onChange={(event) => update("country", event.target.value)} maxLength={80} className="h-12 w-full rounded-lg border border-slate-300 px-4" /></Field>
              </div>
              <p className="rounded-lg bg-violet-50 p-4 text-sm leading-6 text-violet-900">Use a descriptive case title rather than your name. Your identity already stays attached securely through your account.</p>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <Field label="Symptoms and history">
                <textarea value={draft.symptoms} onChange={(event) => update("symptoms", event.target.value)} maxLength={12000} placeholder="Describe pain patterns, cycle timing, prior diagnoses, treatments, surgeries, and your main concern." className="min-h-56 w-full rounded-lg border border-slate-300 p-4" />
              </Field>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                <p className="text-sm font-semibold text-violet-950">Live summary preview</p>
                <p className="mt-2 text-sm leading-6 text-violet-900">{summaryPreview}</p>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <Field label="Clinical or MRI report text">
                <textarea value={draft.reportText} onChange={(event) => update("reportText", event.target.value)} maxLength={100000} placeholder="Paste MRI findings, operative notes, pathology, or specialist letters." className="min-h-48 w-full rounded-lg border border-slate-300 p-4" />
              </Field>
              <Button type="button" variant="outline" onClick={extract} disabled={isExtracting || (!draft.reportText.trim() && !draft.symptoms.trim())}>
                <FileText className="h-4 w-4" /> {isExtracting ? "Structuring case..." : "Structure case details"}
              </Button>
              <Field label="Documents">
                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-violet-300 bg-violet-50/50 p-5 text-center">
                  <UploadCloud className="h-6 w-6 text-violet-700" />
                  <span className="mt-2 text-sm font-semibold text-violet-950">Choose medical records</span>
                  <span className="mt-1 text-xs text-slate-500">PDF, JPG, PNG, or DICOM. Up to 5 files, 20 MB each.</span>
                  <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.dcm,application/pdf,image/jpeg,image/png,application/dicom" className="sr-only" onChange={(event) => setDocuments(Array.from(event.target.files ?? []).slice(0, 5))} />
                </label>
              </Field>
              {documents.length ? (
                <ul className="space-y-2 text-sm text-slate-700">
                  {documents.map((file) => <li key={`${file.name}-${file.size}`} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="truncate">{file.name}</span><span>{Math.ceil(file.size / 1024)} KB</span></li>)}
                </ul>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-slate-600">Confirm automated suggestions before they enter your case.</p>
                <button type="button" onClick={() => setEditingStructure((value) => !value)} className="text-sm font-semibold text-violet-700 underline">{editingStructure ? "Close editors" : "Edit findings"}</button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ReviewPanel title="Disease map">
                  {editingStructure ? <EditableDiseaseMap value={draft.diseaseMap} onChange={(value) => update("diseaseMap", value)} /> : <DiseaseMap value={draft.diseaseMap} />}
                </ReviewPanel>
                <ReviewPanel title="Surgical history">
                  {editingStructure ? <SurgeriesEditor value={draft.surgeries} onChange={(value) => update("surgeries", value)} /> : (
                    <div className="space-y-2 text-sm text-slate-700">{draft.surgeries.length ? draft.surgeries.map((surgery, index) => <div key={`${surgery.type}-${index}`}><p className="font-semibold">{surgery.year || "Date unknown"} - {surgery.type}</p>{surgery.notes ? <p className="mt-1 text-xs text-slate-500">{surgery.notes}</p> : null}</div>) : <p>No surgery found in the provided history. Choose “Edit findings” to add one manually.</p>}</div>
                  )}
                </ReviewPanel>
              </div>
              {latestExtracted ? (
                <ExtractReview
                  extracted={latestExtracted}
                  evidence={latestEvidence}
                  documentProfile={latestDocumentProfile}
                  confidenceScore={latestConfidenceScore}
                  humanConfirmationRequired={humanConfirmationRequired}
                  reportText={[draft.symptoms, draft.reportText].filter(Boolean).join("\n\n")}
                  onSave={(corrected) => setDraft((current) => ({
                    ...current,
                    structuredSymptoms: corrected.symptoms?.length ? corrected.symptoms : current.structuredSymptoms,
                    diseaseMap: corrected.diseaseMap || current.diseaseMap,
                    surgeries: corrected.surgeries || current.surgeries,
                    uncertaintyFlags: corrected.uncertaintyFlags || current.uncertaintyFlags,
                    missingInfo: corrected.missingInfo || current.missingInfo,
                  }))}
                />
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No report was structured. You can continue and a specialist can review the case manually.</p>
              )}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-5">
                <p className="text-sm font-semibold text-violet-950">Case packet preview</p>
                <p className="mt-2 text-sm leading-6 text-violet-900">{summaryPreview}</p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <SummaryItem label="Documents" value={`${documents.length} selected`} />
                  <SummaryItem label="Prior surgeries" value={String(draft.surgeries.length)} />
                  <SummaryItem label="Record gaps" value={String(draft.missingInfo.length)} />
                </dl>
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 text-sm leading-6 text-slate-700">
                <input type="checkbox" checked={draft.consent} onChange={(event) => update("consent", event.target.checked)} className="mt-1 h-4 w-4 accent-violet-700" />
                <span>I confirm I am authorized to submit these records and consent to processing under the <Link href="/privacy" className="font-semibold text-violet-700 underline">Privacy Notice</Link>. I understand EndoLab does not diagnose or replace medical care.</span>
              </label>
              {caseId ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                  <p className="font-semibold text-emerald-900">Case created successfully</p>
                  <p className="mt-1 text-sm text-emerald-800">It is now available in your private workspace.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button asChild variant="outline"><Link href={`/doctor/case/${caseId}`}>Open case</Link></Button>
                    {accountType === "patient" ? <Button asChild variant="outline"><Link href="/patient/dashboard">My dashboard</Link></Button> : null}
                    {accountType === "patient" && paymentEnabled ? <Button type="button" onClick={checkout}>Continue to payment</Button> : null}
                  </div>
                </div>
              ) : (
                <Button type="button" size="lg" onClick={submit} disabled={isSubmitting || !draft.consent}>
                  <Check className="h-4 w-4" /> {isSubmitting ? "Creating case..." : "Create my case"}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {!caseId ? (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-4 md:px-7">
          <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ChevronLeft className="h-4 w-4" /> Back</Button>
          {step < steps.length - 1 ? (
            <Button type="button" disabled={!canContinue() || isExtracting} onClick={() => step === 2 ? void extract() : setStep((value) => value + 1)}>
              {step === 2 && isExtracting ? "Structuring case..." : "Continue"} <ChevronRight className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function splitLines(value: string) {
  return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-800">{label}</span>{children}</label>;
}

function ReviewPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-slate-200 bg-slate-50 p-4"><h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">{title}</h3>{children}</section>;
}

function DiseaseMap({ value }: { value: EndoCase["diseaseMap"] }) {
  return <dl className="grid grid-cols-2 gap-2 text-sm text-slate-700">{Object.entries(value).map(([key, item]) => <div key={key}><dt className="capitalize text-slate-500">{key}</dt><dd className="font-semibold capitalize text-slate-900">{item.replace("_", " ")}</dd></div>)}</dl>;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-violet-700">{label}</dt><dd className="mt-1 font-semibold text-violet-950">{value}</dd></div>;
}
