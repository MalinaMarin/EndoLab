import CompactSummaryCard from "@/components/clinical/compact-summary-card";
import { ActivitySquare } from "lucide-react";
import { listCases } from "@/lib/cases-store";
import { getCaseDisposition } from "@/lib/case-utils";
import { requireClinic } from "@/lib/account";

export const dynamic = "force-dynamic";

export default async function DoctorInboxPage() {
  const context = await requireClinic();
  const cases = await listCases(context);
  const highSeverityCount = cases.filter((item) => item.severity === "HIGH").length;
  const dispositionCounts = cases.reduce<Record<string, number>>((acc, item) => {
    const disposition = getCaseDisposition(item);
    acc[disposition] = (acc[disposition] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="work-surface min-h-screen bg-[linear-gradient(to_bottom,rgba(245,243,255,0.75),rgba(255,255,255,1))]">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">
            <ActivitySquare className="h-4 w-4" />
            Doctor and clinic workflow
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">Case inbox</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-700">
            Triage high-complexity endometriosis cases with referral readiness, record gaps, and structured clinical context.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700">
              {cases.length} total cases
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-medium text-rose-800">
              {highSeverityCount} high severity
            </span>
            {Object.entries(dispositionCounts).map(([label, count]) => (
              <span key={label} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700">
                {count} {label}
              </span>
            ))}
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          {cases.map((item) => (
            <CompactSummaryCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </main>
  );
}
