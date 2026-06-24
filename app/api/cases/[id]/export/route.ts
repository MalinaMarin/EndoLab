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

  const drawLines = (lines: string[], useBold = false) => {
    for (const line of lines) {
      if (y < PAGE_MARGIN + LINE_GAP) {
        page = pdfDoc.addPage(PAGE_SIZE);
        y = PAGE_SIZE[1] - PAGE_MARGIN;
      }

      page.drawText(line, {
        x: left,
        y,
        size: FONT_SIZE,
        font: useBold ? bold : font,
        color: rgb(0.1, 0.1, 0.1),
      });

      y -= LINE_GAP;
    }
  };

  drawLines(wrapText("EndoLab Case Summary", bold, FONT_SIZE, maxWidth), true);
  drawLines(wrapText(`Case ID: ${item.id}`, font, FONT_SIZE, maxWidth));
  drawLines(wrapText(`Title: ${item.title}`, font, FONT_SIZE, maxWidth));
  drawLines(wrapText(`Severity: ${item.severity}`, font, FONT_SIZE, maxWidth));
  y -= LINE_GAP;

  drawLines(wrapText("Clinical Summary", bold, FONT_SIZE, maxWidth), true);
  drawLines(wrapText(item.summary, font, FONT_SIZE, maxWidth));
  y -= LINE_GAP;

  drawLines(wrapText("Symptoms", bold, FONT_SIZE, maxWidth), true);
  item.symptoms.forEach((symptom) => drawLines(wrapText(`- ${symptom}`, font, FONT_SIZE, maxWidth)));
  y -= LINE_GAP;

  drawLines(wrapText("Timeline", bold, FONT_SIZE, maxWidth), true);
  item.timeline.forEach((entry) => drawLines(wrapText(`- ${entry.date}: ${entry.label} (${entry.type})`, font, FONT_SIZE, maxWidth)));
  y -= LINE_GAP;

  drawLines(wrapText("Uncertainty Flags", bold, FONT_SIZE, maxWidth), true);
  item.uncertaintyFlags.forEach((flag) => drawLines(wrapText(`- ${flag}`, font, FONT_SIZE, maxWidth)));
  y -= LINE_GAP;

  drawLines(wrapText("Missing Information", bold, FONT_SIZE, maxWidth), true);
  item.missingInfo.forEach((entry) => drawLines(wrapText(`- ${entry}`, font, FONT_SIZE, maxWidth)));
  y -= LINE_GAP;

  drawLines(wrapText("Referral Guidance", bold, FONT_SIZE, maxWidth), true);
  referralGuidance.forEach((entry) => drawLines(wrapText(`- ${entry}`, font, FONT_SIZE, maxWidth)));
  y -= LINE_GAP;

  drawLines(wrapText("Surgeon Expertise Tags", bold, FONT_SIZE, maxWidth), true);
  drawLines(wrapText(expertiseTags.join(", "), font, FONT_SIZE, maxWidth));

  const bytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="endolab-${item.id}.pdf"`,
    },
  });
}
