import { NextResponse } from "next/server";
import { extractCaseIntelligence } from "@/lib/document-extraction";
import { enforceRateLimit } from "@/lib/request-safety";

export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, { key: "extract", limit: 30, windowMs: 60_000 });
    if (limited) {
      return NextResponse.json({ error: "Too many extraction requests." }, { status: 429 });
    }
    const { text } = (await request.json()) as { text?: string };
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required for extraction." }, { status: 400 });
    }
    if (text.length > 100_000) {
      return NextResponse.json({ error: "Report text is too long." }, { status: 413 });
    }

    const intelligence = extractCaseIntelligence(text);
    return NextResponse.json({ success: true, ...intelligence });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Extraction failed.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
