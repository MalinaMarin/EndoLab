import { listConsents } from "@/lib/admin";
import ExportTrigger from "@/components/admin/export-trigger";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function GovernancePage() {
  await requireAdminPage();
  let consents = [] as any[];
  try {
    consents = await listConsents(50);
  } catch {
    consents = [];
  }

  return (
    <main className="min-h-screen py-10">
      <div className="mx-auto max-w-5xl px-6">
        <h1 className="text-2xl font-semibold mb-6">Governance & Consent</h1>

        <section className="rounded-xl border bg-white p-6 mb-6">
          <h2 className="font-semibold">User consents</h2>
          <p className="text-sm text-gray-500">Recent consent records.</p>
          <ul className="mt-4 space-y-3 text-sm">
            {consents.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.user_id}</div>
                  <div className="text-xs text-gray-500">{c.consent_version ?? "v1"} — {new Date(c.created_at).toLocaleString()}</div>
                </div>
                <div className={`text-sm ${c.consent_given ? "text-emerald-600" : "text-rose-600"}`}>{c.consent_given ? "Given" : "Revoked"}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Export & de-identification</h2>
          <p className="text-sm text-gray-500">Exports are stored privately and opened through short-lived secure links. Keep de-identification enabled unless a contracted data transfer explicitly requires identifiable records.</p>
          {/* client component handles interactions */}
          <ExportTrigger />
        </section>
      </div>
    </main>
  );
}
