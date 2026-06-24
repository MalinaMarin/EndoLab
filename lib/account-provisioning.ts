import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function ensureAccountProvisioned(user: User) {
  const admin = createSupabaseServerClient();
  const accountType = user.user_metadata?.account_type === "clinic" ? "clinic" : "patient";
  const email = user.email?.trim().toLowerCase();
  const fullName = String(user.user_metadata?.full_name ?? email ?? "EndoLab user").slice(0, 120);
  const clinicName = String(user.user_metadata?.clinic_name ?? `${fullName}'s clinic`).slice(0, 160);
  if (!email) return { error: "Account email is missing." };

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    email,
    full_name: fullName,
    account_type: accountType,
  });
  if (profileError) return { error: profileError.message };

  if (accountType === "patient") return { success: true };

  const { data: existingMembership } = await admin
    .from("organization_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (existingMembership) return { success: true };

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
    const { error } = await admin.from("organization_memberships").insert({
      organization_id: invitation.organization_id,
      user_id: user.id,
      role: invitation.role,
      status: "active",
    });
    if (error) return { error: error.message };
    await admin.from("organization_invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invitation.id);
    return { success: true };
  }

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .insert({ name: clinicName, created_by: user.id })
    .select("id")
    .single();
  if (organizationError || !organization) return { error: organizationError?.message ?? "Clinic creation failed." };

  const { error: membershipError } = await admin.from("organization_memberships").insert({
    organization_id: organization.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });
  if (membershipError) return { error: membershipError.message };
  return { success: true };
}
