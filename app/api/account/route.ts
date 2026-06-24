import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/account";
import { cleanText } from "@/lib/request-safety";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function PATCH(request: Request) {
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { fullName?: string; organizationName?: string };
  const fullName = cleanText(body.fullName, 120);
  const organizationName = cleanText(body.organizationName, 160);
  if (!fullName) return NextResponse.json({ error: "Full name is required." }, { status: 400 });

  const admin = createSupabaseServerClient();
  const { error } = await admin.from("profiles").update({ full_name: fullName, updated_at: new Date().toISOString() }).eq("id", context.user.id);
  if (error) return NextResponse.json({ error: "Could not update profile." }, { status: 500 });

  if (organizationName && context.organizationId && context.clinicRole === "owner") {
    const { error: organizationError } = await admin.from("organizations").update({ name: organizationName }).eq("id", context.organizationId);
    if (organizationError) return NextResponse.json({ error: "Profile updated, but clinic name could not be changed." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
