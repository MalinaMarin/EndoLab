import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdminPage } from "@/lib/admin";

export default async function ImportAuditsPage() {
  await requireAdminPage();

  const supabase = createSupabaseServerClient();
  const { data: audits, error } = await supabase.from("import_audits").select("id, created_at, name, created_by, summary").order("created_at", { ascending: false }).limit(50);
  if (error) return <div className="p-6">Unable to load audits: {error.message}</div>;

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-violet-950">Import audits</h1>
        <p className="mt-2 text-sm text-violet-700">Recent import audits saved by clinics and admins.</p>

        <div className="mt-6 space-y-4">
          {audits && audits.length > 0 ? (
            audits.map((a: any) => (
              <div key={a.id} className="rounded-2xl border p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{a.name ?? `Audit ${new Date(a.created_at).toLocaleString()}`}</p>
                  <p className="text-sm text-violet-700">By {a.created_by ?? "system"} — {new Date(a.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <a href={`/api/import/audit/${a.id}`} className="rounded-full border px-3 py-1 text-sm">Download</a>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-violet-700">No audits found.</p>
          )}
        </div>
      </section>
    </main>
  );
}
