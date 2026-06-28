import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserContext } from "@/lib/account";
import { cleanText } from "@/lib/request-safety";

export async function DELETE(_request: Request, routeContext: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await routeContext.params;
    const caseId = cleanText(id, 80);
    const context = await getUserContext();
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (context.accountType !== "patient") return NextResponse.json({ error: "Clinic cases cannot be permanently deleted here." }, { status: 403 });

    const supabase = createSupabaseServerClient();
    const { data: ownedCase, error: accessError } = await supabase
      .from("cases")
      .select("id")
      .eq("id", caseId)
      .eq("owner_user_id", context.user.id)
      .maybeSingle();
    if (accessError) return NextResponse.json({ error: "Could not verify case ownership.", details: accessError.message }, { status: 500 });
    if (!ownedCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });

    const { data: files } = await supabase.storage.from("case-files").list(caseId, { limit: 1000 });
    if (files?.length) {
      await supabase.storage.from("case-files").remove(files.map((file) => `${caseId}/${file.name}`));
    }
    await supabase.from("referrals").delete().eq("case_id", caseId);
    await supabase.from("reviews").delete().eq("case_id", caseId);
    const { error } = await supabase.from("cases").delete().eq("id", caseId).eq("owner_user_id", context.user.id);
    if (error) return NextResponse.json({ error: "Could not delete case.", details: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed.", message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
