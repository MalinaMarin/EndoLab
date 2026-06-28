import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { getCase } from "@/lib/cases-store";
import { buildSurgeonExpertiseTags, getRecommendedSpecialistFocus } from "@/lib/case-utils";
import { getUserContext } from "@/lib/account";

type RouteProps = {
  params: Promise<{ id: string }>;
};

const PAGE_SIZE: [number, number] = [595.28, 841.89];
const PAGE_MARGIN = 50;
const FONT_SIZE = 11;
const LINE_GAP = 16;
const VIOLET = rgb(0.29, 0.12, 0.72);
const TEAL = rgb(0, 0.48, 0.45);
const SLATE = rgb(0.1, 0.14, 0.22);
const MUTED = rgb(0.39, 0.45, 0.55);

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ").filter(Boolean);
    let currentLine = "";

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, size);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    if (paragraphs.length > 1) {
      lines.push("");
    }
  }

  return lines;
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params;
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const item = await getCase(id, context);

  if (!item) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage(PAGE_SIZE);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const referralGuidance = getRecommendedSpecialistFocus(item);
  const expertiseTags = buildSurgeonExpertiseTags(item);

  let y = PAGE_SIZE[1] - PAGE_MARGIN;
  const left = PAGE_MARGIN;
  const maxWidth = PAGE_SIZE[0] - PAGE_MARGIN * 2;

  const newPage = () => {
    page = pdfDoc.addPage(PAGE_SIZE);
    y = PAGE_SIZE[1] - PAGE_MARGIN;
  };

  const ensureSpace = (height: number) => {
    if (y - height < PAGE_MARGIN) newPage();
  };

  const drawText = (text: string, options?: { x?: number; size?: number; useBold?: boolean; color?: ReturnType<typeof rgb> }) => {
    const size = options?.size ?? FONT_SIZE;
    ensureSpace(size + 4);
    page.drawText(text, {
      x: options?.x ?? left,
      y,
      size,
      font: options?.useBold ? bold : font,
      color: options?.color ?? SLATE,
    });
    y -= size + 5;
  };

  const drawLines = (lines: string[], useBold = false, color = SLATE) => {
    for (const line of lines) {
      ensureSpace(LINE_GAP);

      page.drawText(line, {
        x: left,
        y,
        size: FONT_SIZE,
        font: useBold ? bold : font,
        color,
      });

      y -= LINE_GAP;
    }
  };

  const drawSection = (title: string, content: string[]) => {
    ensureSpace(60);
    y -= 8;
    page.drawRectangle({
      x: left,
      y: y - 24,
      width: maxWidth,
      height: 28,
      color: rgb(0.96, 0.95, 1),
      borderColor: rgb(0.83, 0.78, 0.98),
      borderWidth: 0.8,
    });
    page.drawText(title.toUpperCase(), { x: left + 12, y: y - 14, size: 10, font: bold, color: VIOLET });
    y -= 40;
    const safeContent = content.length ? content : ["No entries recorded."];
    safeContent.forEach((entry) => drawLines(wrapText(`- ${entry}`, font, FONT_SIZE, maxWidth - 10), false));
  };

  const readiness = item.paymentStatus === "paid" || item.paymentStatus === "not_required" ? "Eligible for specialist referral" : "Payment or clinic eligibility pending";

  page.drawRectangle({ x: 0, y: PAGE_SIZE[1] - 120, width: PAGE_SIZE[0], height: 120, color: rgb(0.98, 0.97, 1) });
  page.drawText("EndoLab", { x: left, y: PAGE_SIZE[1] - 58, size: 24, font: bold, color: VIOLET });
  page.drawText("Referral-ready endometriosis case packet", { x: left, y: PAGE_SIZE[1] - 80, size: 12, font, color: MUTED });
  page.drawText(new Date().toISOString().slice(0, 10), { x: PAGE_SIZE[0] - PAGE_MARGIN - 72, y: PAGE_SIZE[1] - 58, size: 11, font: bold, color: TEAL });
  y = PAGE_SIZE[1] - 145;

  drawLines(wrapText(item.title, bold, 18, maxWidth), true, SLATE);
  drawText(`Case ID: ${item.id}`, { size: 10, color: MUTED });
  drawText(`Patient: ${item.patient.age ? `${item.patient.age} years` : "age not recorded"}${item.patient.country ? `, ${item.patient.country}` : ""}`, { size: 10, color: MUTED });
  drawText(`Severity: ${item.severity} | Referral state: ${readiness}`, { size: 10, color: TEAL, useBold: true });

  y -= 8;
  page.drawRectangle({
    x: left,
    y: y - 72,
    width: maxWidth,
    height: 78,
    color: rgb(0.94, 0.99, 0.98),
    borderColor: rgb(0.67, 0.92, 0.88),
    borderWidth: 0.8,
  });
  page.drawText("CLINICAL SNAPSHOT", { x: left + 14, y: y - 18, size: 10, font: bold, color: TEAL });
  const snapshot = wrapText(item.summary, font, 11, maxWidth - 28).slice(0, 3);
  snapshot.forEach((line, index) => page.drawText(line, { x: left + 14, y: y - 38 - index * 15, size: 11, font, color: SLATE }));
  y -= 92;

  drawSection("Symptoms", item.symptoms);
  drawSection("Disease map", [
    `Ovaries: ${item.diseaseMap.ovaries.replace("_", " ")}`,
    `Bowel: ${item.diseaseMap.bowel.replace("_", " ")}`,
    `Bladder: ${item.diseaseMap.bladder.replace("_", " ")}`,
    `Uterosacral: ${item.diseaseMap.uterosacral.replace("_", " ")}`,
    `Adhesions: ${item.diseaseMap.adhesions}`,
  ]);
  drawSection("Surgical history", item.surgeries.map((surgery) => `${surgery.year || "Date unknown"} - ${surgery.type}; completeness: ${surgery.completeness}; ${surgery.notes}`));
  drawSection("Imaging and documents", item.imaging);
  drawSection("Timeline", item.timeline.map((entry) => `${entry.date}: ${entry.label} (${entry.type})`));
  drawSection("Missing records", item.missingInfo);
  drawSection("Clinical uncertainty", item.uncertaintyFlags);
  drawSection("Referral guidance", referralGuidance);
  drawSection("Suggested surgeon expertise", expertiseTags);

  ensureSpace(44);
  y -= 12;
  page.drawLine({ start: { x: left, y }, end: { x: left + maxWidth, y }, thickness: 0.8, color: rgb(0.86, 0.88, 0.92) });
  y -= 18;
  drawLines(
    wrapText(
      "This packet organizes patient-provided and clinic-provided records for clinician review. It is not a diagnosis, emergency service, or replacement for professional medical judgment.",
      font,
      9,
      maxWidth,
    ),
    false,
    MUTED,
  );

  const bytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="endolab-clinical-packet-${item.id}.pdf"`,
    },
  });
}
