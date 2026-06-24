import { AccountSettingsForm } from "@/components/auth/account-settings-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireUser } from "@/lib/account";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const context = await requireUser();

  return (
    <main className="min-h-screen bg-slate-50/70 px-6 py-10">
      <section className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Account settings</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{context.fullName}</h1>
        <p className="mt-2 text-sm text-slate-600">{context.user.email}</p>
        <p className="mt-1 text-sm capitalize text-slate-500">
          {context.accountType === "clinic" ? `${context.clinicRole} at ${context.organizationName}` : "Patient account"}
        </p>
        <AccountSettingsForm
          fullName={context.fullName}
          organizationName={context.organizationName}
          canEditOrganization={context.clinicRole === "owner"}
        />
        <div className="mt-6 border-t border-slate-200 pt-5">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
