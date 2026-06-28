import type { UserContext } from "@/lib/account";
import type { DicomMetadata } from "@/lib/document-files";

type ClassifiedDocument = {
  kind: "pdf" | "image" | "dicom" | "other";
  label: string;
  extraction: {
    text: string;
    status: "extracted" | "needs_ocr" | "unsupported" | "empty";
    warning?: string;
  };
  metadata?: DicomMetadata | null;
};

export type CaseDocumentRecord = {
  case_id: string;
  path: string;
  name: string;
  content_type: string;
  size_bytes: number;
  kind: ClassifiedDocument["kind"];
  extraction_status: "pending" | "extracted" | "needs_ocr" | "ocr_queued" | "ocr_complete" | "unsupported" | "failed";
  ocr_status: "not_required" | "queued" | "complete" | "failed";
  extracted_text: string | null;
  metadata: Record<string, unknown>;
  organization_id: string | null;
  created_by: string;
};

export function isMissingDocumentTableError(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "42P01" || /case_documents/i.test(error?.message ?? "");
}

export function buildCaseDocumentRecord({
  caseId,
  path,
  file,
  classification,
  context,
}: {
  caseId: string;
  path: string;
  file: File;
  classification: ClassifiedDocument;
  context: UserContext;
}): CaseDocumentRecord {
  const needsOcr = classification.extraction.status === "needs_ocr";
  const extractionStatus = classification.extraction.status === "empty" ? "pending" : classification.extraction.status;
  const extractedText = classification.extraction.status === "extracted"
    ? classification.extraction.text.slice(0, 200_000)
    : null;

  return {
    case_id: caseId,
    path,
    name: file.name,
    content_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    kind: classification.kind,
    extraction_status: needsOcr ? "ocr_queued" : extractionStatus,
    ocr_status: needsOcr ? "queued" : "not_required",
    extracted_text: extractedText,
    metadata: {
      label: classification.label,
      extractionWarning: classification.extraction.warning ?? null,
      dicomMetadata: classification.metadata ?? null,
    },
    organization_id: context.organizationId ?? null,
    created_by: context.user.id,
  };
}

export function documentClassificationFromRow(row: {
  kind: CaseDocumentRecord["kind"];
  extraction_status: CaseDocumentRecord["extraction_status"];
  ocr_status: CaseDocumentRecord["ocr_status"];
  ocr_confidence?: number | null;
  metadata?: Record<string, unknown> | null;
}) {
  const metadata = row.metadata ?? {};
  return {
    kind: row.kind,
    label: typeof metadata.label === "string" ? metadata.label : "Stored clinical document",
    extractionStatus: row.extraction_status,
    extractionWarning: typeof metadata.extractionWarning === "string" ? metadata.extractionWarning : null,
    ocrStatus: row.ocr_status,
    ocrConfidence: row.ocr_confidence ?? null,
    dicomMetadata: metadata.dicomMetadata as DicomMetadata | null,
  };
}
