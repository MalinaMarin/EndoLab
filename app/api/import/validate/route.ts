import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/account";

export async function POST(request: Request) {
  try {
    const context = await getUserContext();
    if (!context || context.accountType !== "clinic") {
      return NextResponse.json({ error: "Clinic account required." }, { status: 403 });
    }
    const body = (await request.json()) as { cases?: unknown[] };
    const cases = Array.isArray(body.cases) ? body.cases : [];

    if (cases.length === 0) return NextResponse.json({ error: "No cases provided." }, { status: 400 });

    const errors: { index: number; errors: string[] }[] = [];

    for (let i = 0; i < cases.length; i++) {
      const c = typeof cases[i] === "object" && cases[i] !== null ? (cases[i] as Record<string, any>) : {};
      const rowErrors: string[] = [];
      if (!c.title || String(c.title).trim().length === 0) {
        rowErrors.push("Missing title.");
      }
      const hasReport = !!(c.reportText && String(c.reportText).trim().length > 20);
      const hasSymptoms = Array.isArray(c.symptoms) ? (c.symptoms as any[]).length > 0 : !!(c.symptoms && String(c.symptoms).trim().length > 0);
      if (!hasReport && !hasSymptoms) rowErrors.push("Missing narrative report or symptoms.");

      if (rowErrors.length > 0) errors.push({ index: i, errors: rowErrors });
    }

    return NextResponse.json({ success: errors.length === 0, errors });
  } catch (err) {
    return NextResponse.json({ error: "Validation failed.", message: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
