import { NextResponse } from "next/server";
import { canAccessCase, getUserContext } from "@/lib/account";
import { buildCaseDocumentRecord, documentClassificationFromRow, isMissingDocumentTableError } from "@/lib/case-documents";
import { classifyUploadedDocument } from "@/lib/document-files";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enforceRateLimit, isAllowedClinicalFile } from "@/lib/request-safety";

type RouteProps = {
  params: Promise<{ id: string }>;
};

function displayNameFromPath(path: string) {
  const filename = path.split("/").pop() ?? path;
  return filename.replace(/^\d+-/, "");
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params;
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await canAccessCase(id, context))) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const supabase = createSupabaseServerClient();
  const trackedDocuments = await supabase
    .from("case_documents")
    .select("id, created_at, path, name, content_type, size_bytes, kind, extraction_status, ocr_status, ocr_confidence, ocr_text, metadata")
    .eq("case_id", id)
    .order("created_at", { ascending: false });

  if (!trackedDocuments.error && trackedDocuments.data?.length) {
    const documents = await Promise.all(trackedDocuments.data.map(async (document) => {
      const signed = await supabase.storage.from("case-files").createSignedUrl(document.path, 60 * 10);
      return {
        id: document.id,
        name: document.name,
        path: document.path,
        size: document.size_bytes,
        contentType: document.content_type,
        signedUrl: signed.data?.signedUrl ?? null,
        ocrTextPreview: typeof document.ocr_text === "string" ? document.ocr_text.slice(0, 220) : null,
        classification: documentClassificationFromRow(document),
      };
    }));
    return NextResponse.json({ success: true, documents });
  }

  if (trackedDocuments.error && !isMissingDocumentTableError(trackedDocuments.error)) {
    return NextResponse.json({ error: "Could not load document tracking.", details: trackedDocuments.error.message }, { status: 500 });
  }

  const { data: files, error } = await supabase.storage.from("case-files").list(id, { limit: 100 });
  if (error) return NextResponse.json({ error: "Could not list documents.", details: error.message }, { status: 500 });

  const documents = await Promise.all((files ?? []).map(async (file) => {
    const path = `${id}/${file.name}`;
    const signed = await supabase.storage.from("case-files").createSignedUrl(path, 60 * 10);
    const downloaded = await supabase.storage.from("case-files").download(path);
    let classification = null as null | ReturnType<typeof classifyUploadedDocument>;
    if (downloaded.data) {
      const buffer = Buffer.from(await downloaded.data.arrayBuffer());
      const fakeFile = new File([buffer], displayNameFromPath(path), { type: file.metadata?.mimetype ?? "application/octet-stream" });
      classification = classifyUploadedDocument(fakeFile, buffer);
    }
    return {
      name: displayNameFromPath(path),
      path,
      size: file.metadata?.size ?? null,
      contentType: file.metadata?.mimetype ?? null,
      signedUrl: signed.data?.signedUrl ?? null,
      ocrTextPreview: null,
      classification: classification ? {
        kind: classification.kind,
        label: classification.label,
        extractionStatus: classification.extraction.status,
        extractionWarning: classification.extraction.warning ?? null,
        ocrStatus: classification.extraction.status === "needs_ocr" ? "queued" : "not_required",
        ocrConfidence: null,
        dicomMetadata: "metadata" in classification ? classification.metadata ?? null : null,
      } : null,
    };
  }));

  return NextResponse.json({ success: true, documents });
}

export async function POST(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const limited = enforceRateLimit(request, { key: "case-document-upload", limit: 12, windowMs: 60_000 });
  if (limited) {
    return NextResponse.json({ error: "Too many upload requests." }, { status: 429 });
  }
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await canAccessCase(id, context))) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const formData = await request.formData();
  const files = formData.getAll("documents").filter((value): value is File => value instanceof File && value.size > 0);
  if (!files.length) return NextResponse.json({ error: "No documents supplied." }, { status: 400 });
  if (files.length > 5) return NextResponse.json({ error: "Upload at most 5 documents at a time." }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const uploaded: string[] = [];
  const labels: string[] = [];
  const documentRows = [];

  for (const file of files) {
    if (!isAllowedClinicalFile(file)) {
      return NextResponse.json({ error: `Unsupported or oversized file: ${file.name}` }, { status: 400 });
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${id}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const classified = classifyUploadedDocument(file, buffer);
    const { error } = await supabase.storage.from("case-files").upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
    });
    if (error) return NextResponse.json({ error: `Could not upload ${file.name}.`, details: error.message }, { status: 500 });
    uploaded.push(`storage://${path}`);
    labels.push(classified.label);
    documentRows.push(buildCaseDocumentRecord({
      caseId: id,
      path,
      file,
      classification: classified,
      context,
    }));
  }

  const { data: existingCase } = await supabase.from("cases").select("imaging").eq("id", id).maybeSingle();
  const imaging = Array.isArray(existingCase?.imaging) ? existingCase.imaging : [];
  await supabase.from("cases").update({ imaging: [...imaging, ...uploaded, ...labels] }).eq("id", id);

  if (documentRows.length > 0) {
    const { error: documentError } = await supabase.from("case_documents").insert(documentRows);
    if (documentError && !isMissingDocumentTableError(documentError)) {
      return NextResponse.json({
        error: "Documents uploaded, but OCR tracking could not be initialized.",
        details: documentError.message,
      }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, uploaded: uploaded.length });
}
