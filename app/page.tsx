import Link from "next/link";
import type { ComponentType } from "react";
import { AlertCircle, ArrowRight, Brain, Building2, CalendarDays, DatabaseZap, FileStack, ShieldCheck, Stethoscope, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(to_bottom,rgba(245,243,255,0.82),rgba(255,255,255,1)_48%,rgba(240,253,250,0.72))]">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 px-6 py-10 md:grid-cols-[1.04fr_0.96fr] md:py-12">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-900">
            <Stethoscope className="h-4 w-4" />
            Endometriosis referral intelligence
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] text-slate-950 md:text-6xl">
            Two connected paths for specialist-ready endometriosis care.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
            EndoLab gives clinics a governed case-intelligence workflow and gives patients a structured second-opinion journey with MRI/document review, surgeon fit, and referral readiness.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <AudiencePath
              icon={Building2}
              title="For doctors and clinics"
              description="Bulk import records, triage referral readiness, chase missing files, and prepare reviewed case packets."
              href="/clinic/dashboard"
              action="Open clinical workflow"
            />
            <AudiencePath
              icon={UsersRound}
              title="For patients"
              description="Build a second-opinion case, organize MRI/report evidence, and understand which surgeon expertise to seek."
              href="/patient"
              action="Open patient journey"
            />
          </div>

          <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            <ProofPoint label="82%" value="referral readiness" />
            <ProofPoint label="3 gaps" value="records to chase" />
            <ProofPoint label="Human review" value="governed learning" />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white/92 p-5 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.55)]">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">ENDO-001</p>
              <h2 className="text-2xl font-semibold text-slate-950">Bowel DIE recurrence risk</h2>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-800">High priority</span>
          </div>
          <div className="space-y-4">
            <InsightRow icon={CalendarDays} title="Timeline rebuilt" detail="2019 onset -> 2023 repeat surgery -> 2025 bowel pain escalation" />
            <InsightRow icon={FileStack} title="Surgical completeness" detail="Prior excision documented as partial; bowel lesion details unclear." />
            <InsightRow icon={AlertCircle} title="Uncertainty flags" detail="Symptoms exceed the recorded MRI severity; operative report missing." />
            <InsightRow icon={ShieldCheck} title="Referral readiness" detail="82% - needs focused record chase before final surgical planning." />
            <InsightRow icon={ShieldCheck} title="Referral focus" detail="Posterior compartment and colorectal endometriosis specialist review." />
          </div>
        </div>

        <div className="md:col-span-2 grid gap-6 md:grid-cols-3">
          <Feature
            title="Clinical memory layer"
            description="Understand a complex case in under two minutes."
            icon={Brain}
          />
          <Feature
            title="Referral routing"
            description="Turn disease map, severity, and surgical history into specialist focus."
            icon={CalendarDays}
          />
          <Feature
            title="Governed data loop"
            description="Reviewer corrections become deidentified labeling signals."
            icon={AlertCircle}
          />
        </div>

        <div className="md:col-span-2 grid gap-6 md:grid-cols-3">
          <MarketIdea
            icon={Stethoscope}
            title="Built for specialist centers"
            detail="Position EndoLab as pre-consult case intelligence, not a symptom checker or diagnosis bot."
          />
          <MarketIdea
            icon={FileStack}
            title="Records-to-chase workflow"
            detail="Show coordinators exactly which operative notes, pathology reports, MRI protocols, or DICOM files are missing."
          />
          <MarketIdea
            icon={DatabaseZap}
            title="Data moat with governance"
            detail="Every reviewed correction strengthens extraction, readiness scoring, and deidentified export quality."
          />
        </div>

        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-950 p-6 text-white">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-teal-200">
                <Building2 className="h-4 w-4" />
                Clinic premium workflow
              </p>
              <h2 className="mt-3 text-3xl font-semibold">Bulk import, referral readiness, reviewed exports, and governance in one loop.</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                The commercial wedge is a clinic subscription for endometriosis centers that need faster intake triage,
                cleaner second-opinion packets, and audit-ready deidentified case exports.
              </p>
            </div>
            <Button asChild variant="outline" size="lg" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
              <Link href="/clinic/dashboard">Open clinic workflow</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function AudiencePath({
  title,
  description,
  href,
  action,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link href={href} className="group rounded-lg border border-slate-200 bg-white p-4 shadow-[0_10px_32px_-26px_rgba(15,23,42,0.55)] transition hover:border-teal-300 hover:shadow-[0_16px_40px_-28px_rgba(15,23,42,0.65)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Icon className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-lg font-semibold text-slate-950">{title}</span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">{description}</span>
          <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
            {action}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </span>
      </div>
    </Link>
  );
}

function Feature({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/90 p-6 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)]">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
        <Icon className="h-5 w-5 text-teal-700" />
      </div>
      <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function ProofPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/70 px-4 py-3">
      <p className="text-lg font-semibold text-slate-950">{label}</p>
      <p className="text-sm text-slate-600">{value}</p>
    </div>
  );
}

function InsightRow({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-4">
      <Icon className="mt-1 h-5 w-5 shrink-0 text-violet-700" />
      <div>
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
      </div>
    </div>
  );
}

function MarketIdea({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/90 p-5">
      <Icon className="h-5 w-5 text-violet-700" />
      <h2 className="mt-3 text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}
