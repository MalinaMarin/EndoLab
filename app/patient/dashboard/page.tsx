import Link from "next/link";
import { ArrowRight, Check, ClipboardList, CreditCard, FileSearch2, Stethoscope, UploadCloud } from "lucide-react";
import CompactSummaryCard from "@/components/clinical/compact-summary-card";
import { Button } from "@/components/ui/button";
import { requirePatient } from "@/lib/account";
import { listCases } from "@/lib/cases-store";

export const dynamic = "force-dynamic";

export default async function PatientDashboardPage() {
  const context = await requirePatient();
  const cases = await listCases(context);

  return (
    <main className="min-h-screen bg-slate-50/70">
      <section className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">Private patient workspace</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Welcome, {context.fullName}</h1>
            <p className="mt-2 text-slate-600">Your cases, payment state, record gaps, and specialist referrals stay in one account.</p>
          </div>
          <Button asChild size="lg">
            <Link href="/intake"><ClipboardList className="h-4 w-4" /> Start a new case</Link>
          </Button>
        </header>

        {cases.length ? (
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <Metric icon={FileSearch2} label="Cases" value={cases.length} />
            <Metric icon={CreditCard} label="Paid cases" value={cases.filter((item) => item.paymentStatus === "paid").length} />
            <Metric icon={ClipboardList} label="Record gaps" value={cases.reduce((sum, item) => sum + item.missingInfo.length, 0)} />
          </div>
        ) : (
          <section className="mt-8 overflow-hidden rounded-lg border border-violet-200 bg-white shadow-[0_18px_44px_-34px_rgba(76,29,149,0.55)]">
            <div className="purple-band px-6 py-7 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-100">Your first case</p>
              <h2 className="mt-2 text-3xl font-semibold">Turn scattered records into a specialist-ready packet.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-violet-100">
                Start once, save your progress, and return whenever you have another report or document.
              </p>
              <Button asChild size="lg" className="mt-5 bg-white text-violet-800 hover:bg-violet-50">
                <Link href="/intake"><ClipboardList className="h-4 w-4" /> Create my first case</Link>
              </Button>
            </div>
            <div className="grid gap-0 divide-y divide-slate-100 md:grid-cols-5 md:divide-x md:divide-y-0">
              <JourneyStep number={1} icon={ClipboardList} title="Create case" detail="Symptoms and history" active />
              <JourneyStep number={2} icon={UploadCloud} title="Add records" detail="MRI and surgical notes" />
              <JourneyStep number={3} icon={FileSearch2} title="Review gaps" detail="See what is missing" />
              <JourneyStep number={4} icon={CreditCard} title="Confirm service" detail="Complete payment" />
              <JourneyStep number={5} icon={Stethoscope} title="Choose specialist" detail="Request the right review" />
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-950">My cases</h2>
            <Link href="/patient/specialists" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
              Browse specialists <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {cases.length ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cases.map((item) => <CompactSummaryCard key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50/50 p-5 text-sm text-violet-900">
              Your finished packet will contain a clinical summary, disease map, record-gap checklist, referral readiness, and specialist-fit guidance.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function JourneyStep({
  number,
  icon: Icon,
  title,
  detail,
  active = false,
}: {
  number: number;
  icon: typeof ClipboardList;
  title: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div className={`p-4 ${active ? "bg-violet-50" : "bg-white"}`}>
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-500"}`}>
          {active ? <Check className="h-3.5 w-3.5" /> : number}
        </span>
        <Icon className={`h-4 w-4 ${active ? "text-violet-700" : "text-slate-400"}`} />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof FileSearch2; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <Icon className="h-4 w-4 text-teal-700" />
      <p className="mt-3 text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
