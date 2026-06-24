import Link from "next/link";
import { ArrowRight, ClipboardList, FileSearch2, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

const journeySteps = [
  {
    title: "Build your case packet",
    detail: "Add symptoms, prior surgeries, MRI report text, and missing documents in one structured intake.",
  },
  {
    title: "Prepare MRI second opinion",
    detail: "Flag whether the next step is report review, DICOM collection, or endometriosis-protocol imaging.",
  },
  {
    title: "Choose specialist fit",
    detail: "Match bowel, bladder, uterosacral, recurrence, or emergency-surgery context to surgeon expertise.",
  },
];

export default function PatientJourneyPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(to_bottom,rgba(240,253,250,0.72),rgba(255,255,255,1))]">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <header className="grid gap-8 border-b border-slate-200 pb-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
              <ClipboardList className="h-4 w-4" />
              Patient second-opinion journey
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 md:text-5xl">
              Go from scattered records to a surgeon-ready endometriosis case.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
              EndoLab helps patients organize MRI evidence, understand missing records, and prepare a second-opinion request without pretending to diagnose or replace specialist care.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/intake">
                  Start intake
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/patient/specialists">Browse specialist matches</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_16px_42px_-30px_rgba(15,23,42,0.55)]">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Second-opinion packet</p>
            <div className="mt-4 space-y-3">
              <PacketItem icon={FileSearch2} label="MRI/report review" value="Collect report text and DICOM status" />
              <PacketItem icon={ShieldCheck} label="Referral readiness" value="Separate missing records from surgeon questions" />
              <PacketItem icon={Stethoscope} label="Surgeon fit" value="Match expertise to suspected compartments" />
            </div>
          </div>
        </header>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {journeySteps.map((step, index) => (
            <div key={step.title} className="rounded-lg border border-slate-200 bg-white p-5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">
                {index + 1}
              </span>
              <h2 className="mt-4 text-xl font-semibold text-slate-950">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
            </div>
          ))}
        </div>

        <section className="mt-8 rounded-lg border border-slate-200 bg-slate-950 p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Marketplace, but only after trust.</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                The patient marketplace should start as a controlled second-opinion request flow with verified surgeons and transparent readiness, then expand into choice, scheduling, and interaction history.
              </p>
            </div>
            <Button asChild variant="outline" size="lg" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
              <Link href="/patient/specialists">Explore specialist profiles</Link>
            </Button>
          </div>
        </section>
      </section>
    </main>
  );
}

function PacketItem({ icon: Icon, label, value }: { icon: typeof FileSearch2; label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
      <Icon className="mt-1 h-4 w-4 shrink-0 text-teal-700" />
      <div>
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-1 text-sm leading-5 text-slate-600">{value}</p>
      </div>
    </div>
  );
}
