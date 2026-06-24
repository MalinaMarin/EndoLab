import { createSupabaseServerClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import ClaimButton from "@/components/admin/claim-button";
import MarkReviewedButton from "@/components/admin/mark-reviewed-button";
import { cookies } from "next/headers";
import { requireAdminPage } from "@/lib/admin";

export default async function LabelingPage() {
  const cookieStore = await cookies();
  const reviewerEmail = cookieStore.get("reviewer_email")?.value ?? null;
  await requireAdminPage();

  const supabase = createSupabaseServerClient();
  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("id, created_at, case_id, report_text, corrected, claimed_by, claimed_at, locked_until")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return <div className="p-6">Unable to load reviews: {error.message}</div>;
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-violet-950">Labeling queue</h1>
            <p className="mt-2 text-sm text-violet-800">Pending extractor reviews awaiting human verification.</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-violet-700">Reviewer: {reviewerEmail ?? "(unknown)"}</p>
            <form action="/api/admin/logout" method="post">
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {reviews && reviews.length > 0 ? (
            reviews.map((r: any) => (
              <div key={r.id} className="rounded-2xl border border-violet-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-violet-700">{r.created_at}</p>
                    <p className="mt-2 text-base text-violet-900">{r.report_text?.slice(0, 800)}</p>
                    <pre className="mt-3 max-h-48 overflow-auto bg-gray-50 p-2 text-sm">{JSON.stringify(r.corrected, null, 2)}</pre>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    <ClaimButton id={r.id} claimedBy={r.claimed_by} />
                    <MarkReviewedButton id={r.id} reviewer={reviewerEmail ?? undefined} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-violet-700">No pending reviews.</p>
          )}
        </div>
      </section>
    </main>
  );
}
