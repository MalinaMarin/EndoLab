import { NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cleanText, enforceRateLimit } from "@/lib/request-safety";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "account-signup", limit: 6, windowMs: 60_000 });
  if (limited) return NextResponse.json({ error: "Too many signup attempts." }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    fullName?: string;
    accountType?: "patient" | "clinic";
    clinicName?: string;
  };
  const email = cleanText(body.email, 254).toLowerCase();
  const fullName = cleanText(body.fullName, 120);
  const clinicName = cleanText(body.clinicName, 160);
  const accountType = body.accountType === "clinic" ? "clinic" : "patient";

  if (!email || !fullName || !body.password || body.password.length < 10) {
    return NextResponse.json({ error: "Name, email, and a password of at least 10 characters are required." }, { status: 400 });
  }
  if (accountType === "clinic" && !clinicName) {
    return NextResponse.json({ error: "Clinic name is required." }, { status: 400 });
  }

  const auth = await createSupabaseAuthClient();
  const origin = new URL(request.url).origin;
  const { data, error } = await auth.auth.signUp({
    email,
    password: body.password,
    options: {
      data: { full_name: fullName, account_type: accountType, clinic_name: clinicName || undefined },
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
    },
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Could not create account." }, { status: 400 });
  }

  const admin = createSupabaseServerClient();
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email,
    full_name: fullName,
    account_type: accountType,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: "Could not initialize the account profile." }, { status: 500 });
  }

  if (accountType === "clinic") {
    const { data: invitation } = await admin
      .from("organization_invitations")
      .select("id,organization_id,role")
      .eq("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (invitation) {
      const { error: membershipError } = await admin.from("organization_memberships").upsert({
        organization_id: invitation.organization_id,
        user_id: data.user.id,
        role: invitation.role,
        status: "active",
      });
      if (membershipError) {
        await admin.auth.admin.deleteUser(data.user.id);
        return NextResponse.json({ error: "Could not join the invited clinic workspace." }, { status: 500 });
      }
      await admin.from("organization_invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invitation.id);
    } else {
      const { data: organization, error: organizationError } = await admin
        .from("organizations")
        .insert({ name: clinicName, created_by: data.user.id })
        .select("id")
        .single();
      if (organizationError || !organization) {
        await admin.auth.admin.deleteUser(data.user.id);
        return NextResponse.json({ error: "Account created, but clinic setup failed." }, { status: 500 });
      }
      const { error: ownerMembershipError } = await admin.from("organization_memberships").insert({
        organization_id: organization.id,
        user_id: data.user.id,
        role: "owner",
        status: "active",
      });
      if (ownerMembershipError) {
        await admin.from("organizations").delete().eq("id", organization.id);
        await admin.auth.admin.deleteUser(data.user.id);
        return NextResponse.json({ error: "Could not create the clinic owner membership." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({
    success: true,
    confirmationRequired: !data.session,
    destination: accountType === "clinic" ? "/clinic/dashboard" : "/patient/dashboard",
  });
}
