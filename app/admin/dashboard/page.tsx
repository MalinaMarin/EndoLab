import { listRecentExports, getAnalyticsSummary, listConsents } from "@/lib/admin";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminPage();
  let summary = { totalCases: 0, totalReviews: 0, totalExports: 0 };
  let recentExports: any[] = [];
  let consents: any[] = [];
  try {
    summary = await getAnalyticsSummary();
    recentExports = await listRecentExports(6);
    consents = await listConsents(6);
  } catch {
    // gracefully degrade if Supabase is not reachable during build/prerender
    summary = { totalCases: 0, totalReviews: 0, totalExports: 0 };
    recentExports = [];
    consents = [];
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-6">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
          <nav className="space-x-4">
            <Link href="/admin/governance" className="text-sm text-violet-700">Governance</Link>
          </nav>
        </header>

        <section className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-sm text-gray-500">Total cases</h3>
            <div className="mt-2 text-2xl font-bold">{summary.totalCases}</div>
          </div>
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-sm text-gray-500">Total reviews</h3>
            <div className="mt-2 text-2xl font-bold">{summary.totalReviews}</div>
          </div>
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-sm text-gray-500">Exports</h3>
            <div className="mt-2 text-2xl font-bold">{summary.totalExports}</div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Recent exports</h2>
            <ul className="space-y-3 text-sm">
              {recentExports.map((ex: any) => (
                <li key={ex.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{ex.path}</div>
                    <div className="text-xs text-gray-500">{new Date(ex.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-sm text-gray-700">{ex.record_count} rows</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Recent consents</h2>
            <ul className="space-y-3 text-sm">
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
          </div>
        </section>
      </div>
    </main>
  );
}
