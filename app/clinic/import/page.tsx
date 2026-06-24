import Link from "next/link";
import type { ComponentType } from "react";
import { BulkImport } from "@/components/clinical/bulk-import";
import { SmartImportWizard } from "@/components/clinical/smart-import-wizard";
import { ArrowLeft, ClipboardCheck, DatabaseZap, FileSearch2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireClinic } from "@/lib/account";

export default async function ClinicImportPage() {
  await requireClinic();
  return (
    <main className="min-h-screen bg-[linear-gradient(to_bottom,rgba(245,243,255,0.9),rgba(255,255,255,1))]">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Clinic connector</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">Bulk import patient records</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
                Let clinics upload existing patient export data for EndoLab to build structured case briefs,
                score referral readiness, chase missing records, and prepare reviewed case exports.
              </p>
            </div>
            <Button asChild variant="outline" size="lg">
              <Link href="/doctor/inbox">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to doctor inbox
              </Link>
            </Button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <WorkflowMetric icon={ClipboardCheck} label="Referral readiness" value="Triage every imported case before specialist time is booked." />
          <WorkflowMetric icon={FileSearch2} label="Record chasing" value="Separate referral-ready cases from cases missing operative or imaging evidence." />
          <WorkflowMetric icon={ShieldCheck} label="Reviewed exports" value="Package second-opinion summaries and deidentified datasets with audit context." />
          <WorkflowMetric icon={DatabaseZap} label="Learning loop" value="Use reviewer corrections to strengthen extraction and checklist performance." />
        </div>

        <div className="mb-8 rounded-lg border border-teal-200 bg-teal-50/80 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">EMR connector alpha</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                If your clinic uses an EMR system, this alpha connector simulates direct EMR integration so EndoLab can import structured patient summaries without first exporting CSV files.
              </p>
            </div>
            <Button asChild variant="secondary" size="lg">
              <Link href="/clinic/emr">Try EMR alpha</Link>
            </Button>
          </div>
        </div>

        {/* Smart import wizard provides CSV analysis and bulk audit before importing */}
        <div className="space-y-8">
          <SmartImportWizard />
          <BulkImport />
        </div>
      </section>
    </main>
  );
}

function WorkflowMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <Icon className="h-5 w-5 text-teal-700" />
      <h2 className="mt-3 text-lg font-semibold text-slate-950">{label}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{value}</p>
    </div>
  );
}
