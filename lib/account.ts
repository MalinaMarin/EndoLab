import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type AccountType = "patient" | "clinic";
export type ClinicRole = "owner" | "doctor" | "coordinator";

export type UserContext = {
  user: User;
  accountType: AccountType;
  fullName: string;
  organizationId?: string;
  organizationName?: string;
  clinicRole?: ClinicRole;
};

export async function getUserContext(): Promise<UserContext | null> {
  const auth = await createSupabaseAuthClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const admin = createSupabaseServerClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("account_type,full_name")
    .eq("id", user.id)
    .maybeSingle();

  const accountType = profile?.account_type === "clinic" ? "clinic" : "patient";
  const context: UserContext = {
    user,
    accountType,
    fullName: profile?.full_name || user.user_metadata?.full_name || user.email || "EndoLab user",
  };

  if (accountType === "clinic") {
    const { data: membership } = await admin
      .from("organization_memberships")
      .select("organization_id,role,organizations(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (membership) {
      const organization = Array.isArray(membership.organizations)
        ? membership.organizations[0]
        : membership.organizations;
      context.organizationId = membership.organization_id;
      context.organizationName = organization?.name;
      context.clinicRole = membership.role as ClinicRole;
    }
  }

  return context;
}

export async function requireUser() {
  const context = await getUserContext();
  if (!context) redirect("/login");
  return context;
}

export async function requirePatient() {
  const context = await requireUser();
  if (context.accountType !== "patient") redirect("/clinic/dashboard");
  return context;
}

export async function requireClinic() {
  const context = await requireUser();
  if (context.accountType !== "clinic" || !context.organizationId) redirect("/patient/dashboard");
  return context;
}

export async function canAccessCase(caseId: string, context: UserContext) {
  const admin = createSupabaseServerClient();
  let query = admin.from("cases").select("id").eq("id", caseId);
  query = context.accountType === "clinic"
    ? query.eq("organization_id", context.organizationId!)
    : query.eq("owner_user_id", context.user.id);
  const { data } = await query.maybeSingle();
  return Boolean(data);
}
