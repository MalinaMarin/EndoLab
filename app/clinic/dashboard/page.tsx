import Link from "next/link";
import { ShieldCheck, UploadCloud, UsersRound } from "lucide-react";
import { CaseQueue } from "@/components/clinic/case-queue";
import { Button } from "@/components/ui/button";
import { listCases } from "@/lib/cases-store";
import { buildMissingRecordTasks, getCaseWorkflowStatus, getClinicWorkflowSummary } from "@/lib/workflow";
import { requireClinic } from "@/lib/account";

export const dynamic = "force-dynamic";

export default async function ClinicDashboardPage() {
  const context = await requireClinic();
  const cases = await listCases(context);
  const summary = getClinicWorkflowSummary(cases);
  const recordChaseCases = cases.filter((item) => getCaseWorkflowStatus(item) === "record_chase");
  const missingTasks = recordChaseCases.flatMap(buildMissingRecordTasks).slice(0, 8);
  const assignees = Array.from(new Set([
    context.fullName,
    ...cases.map((item) => item.assignedTo).filter((value): value is string => Boolean(value)),
  ]));

  return (
    <main className="work-surface min-h-screen bg-[linear-gradient(to_bottom,rgba(245,243,255,0.72),rgba(255,255,255,1))]">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">
            <ShieldCheck className="h-4 w-4" />
            {context.organizationName ?? "Clinic"} operating dashboard
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-950 md:text-4xl">Referral readiness command center</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
                Separate referral-ready cases from record-chase work, triage uncertainty, and prepare specialist packets from one queue.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/clinic/import">
                  <UploadCloud className="h-4 w-4" />
                  Import records
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/doctor/inbox">Doctor inbox</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/clinic/team"><UsersRound className="h-4 w-4" /> Team</Link>
              </Button>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Total cases" value={summary.total} />
          <Metric label="Ready" value={summary.ready_for_review} tone="ready" />
          <Metric label="Record chase" value={summary.record_chase} tone="warning" />
          <Metric label="High severity" value={summary.highSeverity} tone="critical" />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <CaseQueue cases={cases} assignees={assignees} />

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.45)]">
            <h2 className="text-lg font-semibold text-slate-950">Missing-record tasks</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The highest-leverage clinic workflow is turning uncertain cases into complete second-opinion packets.
            </p>
            <div className="mt-4 space-y-3">
              {missingTasks.length > 0 ? (
                missingTasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">{task.label}</p>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${task.priority === "high" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs font-medium text-slate-700">{task.caseTitle}</p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600">
                      <span>{task.owner}</span>
                      <Link className="font-semibold text-teal-700 hover:text-teal-900" href={`/doctor/case/${task.caseId}`}>
                        Open case
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  No missing-record tasks detected.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "ready" | "warning" | "critical" }) {
  const toneClass = {
    neutral: "bg-white text-slate-950",
    ready: "bg-emerald-50 text-emerald-900",
    warning: "bg-amber-50 text-amber-900",
    critical: "bg-rose-50 text-rose-900",
  }[tone];

  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${toneClass}`}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
