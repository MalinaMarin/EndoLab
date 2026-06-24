import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { canAccessCase, getUserContext } from "@/lib/account";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportText, corrected, caseId } = body as { reportText?: string; corrected?: any; caseId?: string };
    if (!reportText || !corrected) {
      return NextResponse.json({ error: "reportText and corrected payload required" }, { status: 400 });
    }
    const context = await getUserContext();
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (caseId && !(await canAccessCase(caseId, context))) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("reviews").insert({
      case_id: caseId ?? null,
      report_text: reportText,
      corrected: corrected,
      status: "pending",
      organization_id: context.organizationId ?? null,
    });

    if (error) {
      console.error("Could not persist extraction review audit:", error.message);
      return NextResponse.json({
        success: true,
        persisted: false,
        warning: "Review audit storage is unavailable. Corrections were still applied to the active case draft.",
      });
    }

    return NextResponse.json({ success: true, persisted: true });
  } catch (error) {
    return NextResponse.json({ error: "Review save failed", message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
