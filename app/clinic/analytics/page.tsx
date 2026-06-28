import Link from "next/link";
import { ArrowLeft, BarChart3, CheckCircle2, Clock3, FileWarning, TrendingUp, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireClinic } from "@/lib/account";
import { calculateReferralReadinessScore } from "@/lib/case-utils";
import { listCases } from "@/lib/cases-store";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { buildMissingRecordTasks, getCaseWorkflowStatus, getClinicWorkflowSummary } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export default async function ClinicAnalyticsPage() {
  const context = await requireClinic();
  const cases = await listCases(context);
  const summary = getClinicWorkflowSummary(cases);
  const readinessScores = cases.map(calculateReferralReadinessScore);
  const averageReadiness = readinessScores.length
    ? Math.round(readinessScores.reduce((total, score) => total + score, 0) / readinessScores.length)
    : 0;
  const missingTasks = cases.flatMap(buildMissingRecordTasks);
  const readyCases = cases.filter((item) => getCaseWorkflowStatus(item) === "ready_for_review");
  const triageCases = cases.filter((item) => getCaseWorkflowStatus(item) === "needs_triage");
  const recordChaseCases = cases.filter((item) => getCaseWorkflowStatus(item) === "record_chase");
  const estimatedCoordinatorMinutes = cases.length * 12 + missingTasks.length * 18 + triageCases.length * 20;
  const consultsProtected = readyCases.length + recordChaseCases.length;

  const supabase = createSupabaseServerClient();
  const referralQuery = supabase
    .from("referrals")
    .select("id,status,created_at,case_id")
    .order("created_at", { ascending: false })
    .limit(200);
  const scopedReferralQuery = context.organizationId
    ? referralQuery.eq("organization_id", context.organizationId)
    : referralQuery;
  const { data: referrals } = await scopedReferralQuery;
  const referralCounts = (referrals ?? []).reduce(
    (acc, referral) => {
      const status = String(referral.status ?? "pending");
      if (status === "accepted") acc.accepted += 1;
      else if (status === "declined") acc.declined += 1;
      else acc.pending += 1;
      return acc;
    },
    { pending: 0, accepted: 0, declined: 0 },
  );

  return (
    <main className="work-surface min-h-screen bg-[linear-gradient(to_bottom,rgba(245,243,255,0.76),rgba(255,255,255,1))]">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/clinic/dashboard"><ArrowLeft className="h-4 w-4" /> Back to clinic dashboard</Link>
          </Button>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">
            <BarChart3 className="h-4 w-4" />
            Clinic value dashboard
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-950 md:text-4xl">Referral operations analytics</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
                Show exactly how EndoLab protects specialist time: fewer incomplete consults, faster record chasing, and clearer referral readiness.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/clinic/import">Import more cases</Link>
            </Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric icon={UsersRound} label="Active cases tracked" value={summary.total} detail="Cases visible to this clinic workspace." />
          <Metric icon={CheckCircle2} label="Referral-ready" value={summary.ready_for_review} detail={`${averageReadiness}% average readiness score.`} tone="ready" />
          <Metric icon={FileWarning} label="Missing-record tasks" value={summary.missingTasks} detail={`${recordChaseCases.length} case(s) need record chase.`} tone="warning" />
          <Metric icon={Clock3} label="Coordinator time surfaced" value={`${estimatedCoordinatorMinutes}m`} detail="Estimated manual triage and chasing effort made visible." tone="violet" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Readiness funnel</h2>
                <p className="mt-1 text-sm text-slate-600">A simple operational view for coordinators and center leads.</p>
              </div>
              <TrendingUp className="h-5 w-5 text-teal-700" />
            </div>
            <div className="mt-6 space-y-4">
              <FunnelRow label="Ready for specialist review" value={readyCases.length} total={Math.max(cases.length, 1)} tone="bg-emerald-500" />
              <FunnelRow label="Needs clinical triage" value={triageCases.length} total={Math.max(cases.length, 1)} tone="bg-violet-500" />
              <FunnelRow label="Needs record chase" value={recordChaseCases.length} total={Math.max(cases.length, 1)} tone="bg-amber-500" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <SmallMetric label="Pending referrals" value={referralCounts.pending} />
              <SmallMetric label="Accepted referrals" value={referralCounts.accepted} />
              <SmallMetric label="Declined referrals" value={referralCounts.declined} />
            </div>
          </section>

          <aside className="rounded-lg border border-teal-200 bg-teal-50/80 p-6">
            <h2 className="text-xl font-semibold text-teal-950">Business case</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-teal-950/85">
              <ValuePoint label="Incomplete consults avoided" value={consultsProtected} detail="Cases are either referral-ready or have explicit missing-record work before booking specialist time." />
              <ValuePoint label="Coordinator workload clarified" value={missingTasks.length} detail="Each missing item becomes an owner-ready task instead of a hidden inbox problem." />
              <ValuePoint label="Specialist capacity protected" value={`${Math.max(0, Math.round(averageReadiness - 60))}%`} detail="A directional readiness lift over an unstructured intake baseline." />
            </div>
          </aside>
        </div>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-950">Top record gaps</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {missingTasks.slice(0, 8).map((task) => (
              <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{task.label}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${task.priority === "high" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>
                    {task.priority}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{task.caseTitle}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{task.owner}</p>
              </div>
            ))}
            {missingTasks.length === 0 ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                No missing-record tasks detected in the current clinic queue.
              </p>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: typeof BarChart3;
  label: string;
  value: number | string;
  detail: string;
  tone?: "neutral" | "ready" | "warning" | "violet";
}) {
  const toneClass = {
    neutral: "bg-white text-slate-950",
    ready: "bg-emerald-50 text-emerald-950",
    warning: "bg-amber-50 text-amber-950",
    violet: "bg-violet-50 text-violet-950",
  }[tone];

  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${toneClass}`}>
      <Icon className="h-5 w-5 text-teal-700" />
      <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function FunnelRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const width = Math.round((value / total) * 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="text-slate-600">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ValuePoint({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="rounded-lg border border-teal-200 bg-white/70 p-4">
      <p className="text-2xl font-semibold text-teal-950">{value}</p>
      <p className="mt-1 font-semibold">{label}</p>
      <p className="mt-2 text-sm leading-6 text-teal-900/75">{detail}</p>
    </div>
  );
}
