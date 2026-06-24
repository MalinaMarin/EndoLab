import { NextResponse } from "next/server";
import { getAnalyticsSummary, listRecentExports, requireAdmin } from "@/lib/admin";
import { SCOPES } from "@/lib/scopes";

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin(request, SCOPES.ANALYTICS_READ);
    if (auth) return auth;

    const summary = await getAnalyticsSummary();
    const recentExports = await listRecentExports(6);
    return NextResponse.json({ success: true, summary, recentExports });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
