"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, FileImage, FileText, RefreshCw, ScanLine, ScanSearch, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type DicomMetadata = {
  patientName?: string;
  studyDate?: string;
  modality?: string;
  studyDescription?: string;
  seriesDescription?: string;
  manufacturer?: string;
  rows?: number;
  columns?: number;
  transferSyntaxUid?: string;
};

type CaseDocument = {
  id?: string;
  name: string;
  path: string;
  size: number | null;
  contentType: string | null;
  signedUrl: string | null;
  ocrTextPreview: string | null;
  classification: null | {
    kind: "pdf" | "image" | "dicom" | "other";
    label: string;
    extractionStatus: "pending" | "extracted" | "needs_ocr" | "ocr_queued" | "ocr_complete" | "unsupported" | "empty" | "failed";
    extractionWarning: string | null;
    ocrStatus: "not_required" | "queued" | "complete" | "failed";
    ocrConfidence: number | null;
    dicomMetadata: DicomMetadata | null;
  };
};

export function CaseDocumentWorkspace({ caseId }: { caseId: string }) {
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ocrDrafts, setOcrDrafts] = useState<Record<string, string>>({});
  const [ocrBusy, setOcrBusy] = useState<string | null>(null);
  const toast = useToast();

  const loadDocuments = useCallback(async function loadDocuments() {
    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/documents`, { cache: "no-store" });
      const payload = await response.json() as { documents?: CaseDocument[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load documents.");
      setDocuments(payload.documents ?? []);
    } catch (error) {
      toast.show({ title: "Documents unavailable", message: error instanceof Error ? error.message : "Could not load documents.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [caseId, toast]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).slice(0, 5).forEach((file) => formData.append("documents", file));
    try {
      const response = await fetch(`/api/cases/${caseId}/documents`, { method: "POST", body: formData });
      const payload = await response.json() as { uploaded?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Upload failed.");
      toast.show({ title: "Documents uploaded", message: `${payload.uploaded ?? 0} document(s) added to this case.`, type: "success" });
      await loadDocuments();
    } catch (error) {
      toast.show({ title: "Upload failed", message: error instanceof Error ? error.message : "Could not upload documents.", type: "error" });
    } finally {
      setUploading(false);
    }
  }

  async function queueOcr(document: CaseDocument) {
    if (!document.id) {
      toast.show({ title: "OCR tracking needs setup", message: "Run the latest Supabase schema to enable OCR status tracking for older stored files.", type: "error" });
      return;
    }
    setOcrBusy(document.id);
    try {
      const response = await fetch(`/api/cases/${caseId}/documents/${document.id}/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "queue" }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not queue OCR.");
      toast.show({ title: "OCR queued", message: "This document is ready for OCR provider processing or manual OCR text entry.", type: "success" });
      await loadDocuments();
    } catch (error) {
      toast.show({ title: "OCR unavailable", message: error instanceof Error ? error.message : "Could not queue OCR.", type: "error" });
    } finally {
      setOcrBusy(null);
    }
  }

  async function saveOcrText(document: CaseDocument) {
    if (!document.id) {
      toast.show({ title: "OCR tracking needs setup", message: "Run the latest Supabase schema before saving OCR text.", type: "error" });
      return;
    }
    const ocrText = ocrDrafts[document.id]?.trim() ?? "";
    if (ocrText.length < 20) {
      toast.show({ title: "OCR text is too short", message: "Paste the OCR output or corrected text before saving.", type: "error" });
      return;
    }
    setOcrBusy(document.id);
    try {
      const response = await fetch(`/api/cases/${caseId}/documents/${document.id}/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", ocrText, provider: "Manual OCR review" }),
      });
      const payload = await response.json() as { error?: string; intelligence?: { evidence?: unknown[]; confidenceScore?: number } };
      if (!response.ok) throw new Error(payload.error ?? "Could not save OCR text.");
      toast.show({
        title: "OCR text saved",
        message: `${payload.intelligence?.evidence?.length ?? 0} evidence item(s) extracted for human confirmation.`,
        type: "success",
      });
      setOcrDrafts((current) => ({ ...current, [document.id!]: "" }));
      await loadDocuments();
    } catch (error) {
      toast.show({ title: "OCR save failed", message: error instanceof Error ? error.message : "Could not save OCR text.", type: "error" });
    } finally {
      setOcrBusy(null);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">
            <ScanSearch className="h-4 w-4" />
            Documents and imaging workspace
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Text PDFs are parsed when possible. Scanned PDFs/images move into an OCR queue. DICOM files show metadata and secure access links.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={loadDocuments} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-violet-700 px-3 text-sm font-semibold text-white hover:bg-violet-800">
            <UploadCloud className="h-4 w-4" />
            {uploading ? "Uploading..." : "Add files"}
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.dcm,application/pdf,image/jpeg,image/png,application/dicom" className="sr-only" onChange={(event) => void upload(event.target.files)} />
          </label>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Loading documents...</p> : null}
        {!loading && documents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No uploaded documents yet.
          </p>
        ) : null}
        {documents.map((document) => (
          <article key={document.path} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-slate-950">
                  {document.classification?.kind === "image" ? <FileImage className="h-4 w-4 text-violet-700" /> : <FileText className="h-4 w-4 text-violet-700" />}
                  <span className="truncate">{document.name}</span>
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{document.classification?.label ?? document.contentType ?? "Stored document"}</p>
              </div>
              {document.signedUrl ? (
                <a href={document.signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">
                  <Download className="h-4 w-4" />
                  Open
                </a>
              ) : null}
            </div>

            {document.classification?.extractionWarning ? (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                {document.classification.extractionWarning}
              </p>
            ) : null}

            {document.classification?.ocrStatus === "queued" || document.classification?.extractionStatus === "needs_ocr" || document.classification?.extractionStatus === "ocr_queued" ? (
              <div className="mt-3 rounded-lg border border-violet-200 bg-white p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-violet-950">
                      <ScanLine className="h-4 w-4 text-violet-700" />
                      OCR queued
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Paste OCR output here when your OCR provider or reviewer has processed this file. EndoLab will extract structured evidence for confirmation.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => void queueOcr(document)} disabled={ocrBusy === document.id}>
                    <ScanLine className="h-4 w-4" />
                    Queue OCR
                  </Button>
                </div>
                <textarea
                  className="mt-3 min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  placeholder="Paste OCR text from the scanned report here..."
                  value={document.id ? ocrDrafts[document.id] ?? "" : ""}
                  onChange={(event) => document.id ? setOcrDrafts((current) => ({ ...current, [document.id!]: event.target.value })) : undefined}
                />
                <div className="mt-2 flex justify-end">
                  <Button type="button" size="sm" onClick={() => void saveOcrText(document)} disabled={!document.id || ocrBusy === document.id}>
                    <CheckCircle2 className="h-4 w-4" />
                    Save OCR text
                  </Button>
                </div>
              </div>
            ) : null}

            {document.classification?.ocrStatus === "complete" ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
                <p className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  OCR complete{document.classification.ocrConfidence !== null ? ` · ${document.classification.ocrConfidence}% confidence` : ""}
                </p>
                {document.ocrTextPreview ? <p className="mt-1 text-emerald-900">{document.ocrTextPreview}</p> : null}
              </div>
            ) : null}

            {document.classification?.dicomMetadata ? (
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(document.classification.dicomMetadata).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => (
                  <div key={key} className="rounded-md border border-slate-200 bg-white p-3">
                    <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{key.replace(/([A-Z])/g, " $1")}</dt>
                    <dd className="mt-1 font-semibold text-slate-800">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
