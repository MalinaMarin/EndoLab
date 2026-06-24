import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserContext } from "@/lib/account";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { consentGiven, consentVersion, details } = body;
    const context = await getUserContext();
    if (!context) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("user_consents")
      .upsert({ user_id: context.user.id, consent_given: !!consentGiven, consent_at: new Date().toISOString(), consent_version: consentVersion, details })
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const context = await getUserContext();
    if (!context) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("user_consents").select("*").eq("user_id", context.user.id).limit(1);
    if (error) throw error;
    return NextResponse.json({ success: true, data: data?.[0] ?? null });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
