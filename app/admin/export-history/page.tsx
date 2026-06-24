import { createSupabaseServerClient } from "@/lib/supabase-server";
import ExportHistoryTable from "@/components/admin/export-history-table";
import { requireAdminPage } from "@/lib/admin";
import { SCOPES } from "@/lib/scopes";

export default async function ExportHistoryPage() {
  await requireAdminPage(SCOPES.EXPORT_READ);

  const supabase = createSupabaseServerClient();
  const { data: exports, error } = await supabase
    .from("export_jobs")
    .select("id, created_at, path, record_count, status, error, deidentified")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return <div className="p-6">Unable to load export history: {error.message}</div>;
  }

  const latest = exports?.[0];

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-violet-950">Export history</h1>
            <p className="mt-2 text-sm text-violet-700">Latest scheduled export and the last 20 export jobs.</p>
          </div>
        </div>

        {latest ? (
          <div className="mt-8 rounded-3xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-violet-700">Latest export</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-violet-600">File</p>
                <p className="mt-1 text-base font-medium text-violet-950">{latest.path}</p>
              </div>
              <div>
                <p className="text-sm text-violet-600">Records</p>
                <p className="mt-1 text-base font-medium text-violet-950">{latest.record_count}</p>
              </div>
              <div>
                <p className="text-sm text-violet-600">Status</p>
                <p className="mt-1 text-base font-medium text-violet-950">{latest.status}</p>
              </div>
              <div>
                <p className="text-sm text-violet-600">Created</p>
                <p className="mt-1 text-base font-medium text-violet-950">{new Date(latest.created_at).toLocaleString()}</p>
              </div>
            </div>
            {latest.error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                Export error: {latest.error}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-8 text-sm text-violet-700">No export history yet.</p>
        )}

        <div className="mt-10">
          <h2 className="text-2xl font-semibold text-violet-950">Recent exports</h2>
          <div className="mt-4">
            <ExportHistoryTable initialJobs={exports ?? []} />
          </div>
        </div>
      </section>
    </main>
  );
}
