import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/account";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cleanText } from "@/lib/request-safety";

export async function POST(request: Request) {
  const context = await getUserContext();
  if (!context || context.accountType !== "clinic" || !context.organizationId) {
    return NextResponse.json({ error: "Clinic account required." }, { status: 403 });
  }
  if (context.clinicRole !== "owner") {
    return NextResponse.json({ error: "Only clinic owners can invite staff." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string; role?: string };
  const email = cleanText(body.email, 254).toLowerCase();
  const role = body.role === "coordinator" ? "coordinator" : "doctor";
  if (!email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });

  const admin = createSupabaseServerClient();
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id,account_type")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    if (existingProfile.account_type !== "clinic") {
      return NextResponse.json({ error: "That email belongs to a patient account and cannot be added as clinic staff." }, { status: 409 });
    }
    const { data: activeMembership } = await admin
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", existingProfile.id)
      .eq("status", "active")
      .maybeSingle();
    if (activeMembership && activeMembership.organization_id !== context.organizationId) {
      return NextResponse.json({ error: "That user already belongs to another clinic workspace." }, { status: 409 });
    }
    const { error: membershipError } = await admin.from("organization_memberships").upsert(
      {
        organization_id: context.organizationId,
        user_id: existingProfile.id,
        role,
        status: "active",
      },
      { onConflict: "organization_id,user_id" },
    );
    if (membershipError) return NextResponse.json({ error: "Could not add clinic member." }, { status: 500 });
    return NextResponse.json({ success: true, joinedImmediately: true });
  }

  const { data: existing } = await admin
    .from("organization_invitations")
    .select("id")
    .eq("organization_id", context.organizationId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();
  const invitationPayload = {
      organization_id: context.organizationId,
      email,
      role,
      invited_by: context.user.id,
      status: "pending",
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  const { error } = existing
    ? await admin.from("organization_invitations").update(invitationPayload).eq("id", existing.id)
    : await admin.from("organization_invitations").insert(invitationPayload);
  if (error) return NextResponse.json({ error: "Could not create invitation.", details: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
