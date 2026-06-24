import { Building2, Mail, UsersRound } from "lucide-react";
import { InviteMemberForm } from "@/components/clinic/invite-member-form";
import { requireClinic } from "@/lib/account";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { MemberActions } from "@/components/clinic/member-actions";

export const dynamic = "force-dynamic";

export default async function ClinicTeamPage() {
  const context = await requireClinic();
  const admin = createSupabaseServerClient();
  const [{ data: memberships }, { data: invitations }] = await Promise.all([
    admin
      .from("organization_memberships")
      .select("id,role,status,user_id,profiles(full_name,email)")
      .eq("organization_id", context.organizationId!)
      .order("created_at"),
    admin
      .from("organization_invitations")
      .select("id,email,role,status,expires_at")
      .eq("organization_id", context.organizationId!)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50/70">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <header className="border-b border-slate-200 pb-6">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            <Building2 className="h-4 w-4" /> {context.organizationName}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Clinic team</h1>
          <p className="mt-2 text-slate-600">Manage staff access and roles inside this clinic workspace.</p>
        </header>

        {context.clinicRole === "owner" ? (
          <section className="mt-7 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-950">
              <Mail className="h-5 w-5 text-teal-700" /> Invite a teammate
            </h2>
            <InviteMemberForm />
          </section>
        ) : null}

        <section className="mt-7 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-950">
            <UsersRound className="h-5 w-5 text-teal-700" /> Active members
          </h2>
          <div className="mt-4 divide-y divide-slate-100">
            {(memberships ?? []).map((membership) => {
              const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
              return (
                <div key={membership.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-950">{profile?.full_name || "Clinic member"}</p>
                    <p className="text-slate-600">{profile?.email}</p>
                  </div>
                  {context.clinicRole === "owner" && membership.user_id !== context.user.id && membership.role !== "owner" ? (
                    <MemberActions membershipId={membership.id} role={membership.role} />
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium capitalize text-slate-700">{membership.role}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {invitations?.length ? (
          <section className="mt-7 rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Pending invitations</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-950">{invitation.email}</p>
                    <p className="text-slate-500">Expires {new Date(invitation.expires_at).toLocaleDateString()}</p>
                  </div>
                  <span className="capitalize text-slate-600">{invitation.role}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
