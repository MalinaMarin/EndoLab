import { NextResponse } from "next/server";
import { canAccessCase, getUserContext } from "@/lib/account";
import { extractCaseIntelligence } from "@/lib/document-extraction";
import { cleanText, enforceRateLimit } from "@/lib/request-safety";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteProps = {
  params: Promise<{ id: string; documentId: string }>;
};

function confidenceFrom(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export async function POST(request: Request, { params }: RouteProps) {
  const { id, documentId } = await params;
  const limited = enforceRateLimit(request, { key: "document-ocr", limit: 20, windowMs: 60_000 });
  if (limited) return NextResponse.json({ error: "Too many OCR updates. Please wait before trying again." }, { status: 429 });

  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await canAccessCase(id, context))) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const action = cleanText(body.action, 40);
  const supabase = createSupabaseServerClient();

  const { data: document, error: documentError } = await supabase
    .from("case_documents")
    .select("id, case_id, name, extraction_status, ocr_status, metadata")
    .eq("id", documentId)
    .eq("case_id", id)
    .maybeSingle();

  if (documentError) {
    return NextResponse.json({
      error: "Document OCR tracking is not initialized. Run the latest Supabase schema before using OCR.",
      details: documentError.message,
    }, { status: 500 });
  }
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  if (action === "queue") {
    const { error } = await supabase
      .from("case_documents")
      .update({
        extraction_status: "ocr_queued",
        ocr_status: "queued",
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .eq("case_id", id);

    if (error) return NextResponse.json({ error: "Could not queue OCR.", details: error.message }, { status: 500 });
    return NextResponse.json({ success: true, status: "queued" });
  }

  const ocrText = cleanText(body.ocrText, 200_000);
  if (ocrText.length < 20) {
    return NextResponse.json({ error: "OCR text must contain at least 20 characters." }, { status: 400 });
  }

  const provider = cleanText(body.provider, 80) || "Manual OCR entry";
  const ocrConfidence = confidenceFrom(body.confidence);
  const intelligence = extractCaseIntelligence(ocrText);
  const metadata = typeof document.metadata === "object" && document.metadata !== null ? document.metadata : {};

  const { error } = await supabase
    .from("case_documents")
    .update({
      extraction_status: "ocr_complete",
      ocr_status: "complete",
      ocr_text: ocrText,
      ocr_confidence: ocrConfidence,
      ocr_provider: provider,
      ocr_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        ...metadata,
        label: `${document.name} OCR complete`,
        extractionWarning: intelligence.humanConfirmationRequired
          ? "OCR text was captured. Structured findings need human confirmation before clinical use."
          : null,
        documentProfile: intelligence.documentProfile,
        evidenceCount: intelligence.evidence.length,
      },
    })
    .eq("id", documentId)
    .eq("case_id", id);

  if (error) return NextResponse.json({ error: "Could not save OCR text.", details: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    status: "complete",
    intelligence,
  });
}
