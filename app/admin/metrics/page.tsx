import { createSupabaseServerClient } from "@/lib/supabase-server";
import ExportButton from "@/components/admin/export-button";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  await requireAdminPage();
  const supabase = createSupabaseServerClient();

  const recentReviewsRes = await supabase
    .from("reviews")
    .select("id, created_at, reviewed_at, corrected, reviewer, claimed_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const totalCountRes = await supabase.from("reviews").select("id", { count: "exact", head: true });
  const pendingRes = await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending");
  const reviewedRes = await supabase.from("reviews").select("id", { count: "exact", head: true }).eq("status", "reviewed");

  const total = totalCountRes.count ?? 0;
  const pending = pendingRes.count ?? 0;
  const reviewed = reviewedRes.count ?? 0;

  // compute avg time-to-review and corrections per field
  let avgTimeToReview = null as null | number;
  const fieldCounts: Record<string, number> = {};
  const recentReviews = recentReviewsRes.data ?? [];
  if (recentReviews.length > 0) {
    const durations: number[] = [];
    for (const r of recentReviews) {
      if (r.reviewed_at && r.created_at) {
        durations.push(new Date(r.reviewed_at).getTime() - new Date(r.created_at).getTime());
      }
      const corrected = r.corrected ?? {};
      for (const k of Object.keys(corrected)) {
        fieldCounts[k] = (fieldCounts[k] ?? 0) + 1;
      }
    }
    if (durations.length > 0) {
      avgTimeToReview = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-violet-950">Review metrics</h1>
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border p-4">Total reviews<br /><span className="text-2xl font-bold">{total}</span></div>
          <div className="rounded-xl border p-4">Pending<br /><span className="text-2xl font-bold">{pending}</span></div>
          <div className="rounded-xl border p-4">Reviewed<br /><span className="text-2xl font-bold">{reviewed}</span></div>
        </div>

        <div className="mt-6 rounded-xl border p-4">
          <h2 className="font-semibold">Avg time to review (sec)</h2>
          <p className="text-xl font-bold">{avgTimeToReview ?? "—"}</p>
        </div>

        <div className="mt-6 rounded-xl border p-4">
          <h2 className="font-semibold">Corrections per field (sample)</h2>
          <ul className="mt-2 list-disc pl-6">
            {Object.entries(fieldCounts).map(([k, v]) => (
              <li key={k} className="text-sm">{k}: {v}</li>
            ))}
            {Object.keys(fieldCounts).length === 0 ? <li className="text-sm">No corrections yet.</li> : null}
          </ul>
        </div>

        <div className="mt-6">
          <ExportButton />
        </div>
      </section>
    </main>
  );
}
