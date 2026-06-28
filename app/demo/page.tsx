import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, ClipboardList, CreditCard, FileText, LineChart, Stethoscope, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DemoWalkthroughPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(to_bottom,rgba(245,243,255,0.82),rgba(255,255,255,1)_52%,rgba(240,253,250,0.7))]">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <header className="max-w-4xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-sm font-semibold text-violet-800">
            <CheckCircle2 className="h-4 w-4" />
            Presentation walkthrough
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-slate-950 md:text-6xl">
            Show EndoLab as a complete second-opinion operating system.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
            Use this path when presenting before clinic recruitment. It highlights the patient journey, the clinic workflow, the specialist request, and the business value without needing a live partner center.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup"><UsersRound className="h-4 w-4" /> Create demo account</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/clinic/dashboard">Open clinic sample queue</Link>
            </Button>
          </div>
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <DemoPath
            icon={UsersRound}
            title="Patient story"
            href="/patient"
            action="Open patient journey"
            steps={[
              "Create a patient account.",
              "Build one active endometriosis case from symptoms, history, MRI text, and documents.",
              "Confirm extracted findings and missing records.",
              "Use sandbox checkout locally when Stripe is not configured.",
              "Choose a specialist and track second-opinion status.",
            ]}
          />
          <DemoPath
            icon={Building2}
            title="Clinic story"
            href="/clinic/dashboard"
            action="Open clinic dashboard"
            steps={[
              "Use the sample clinic queue to show referral readiness.",
              "Open a complex case and export the clinical packet.",
              "Assign and triage cases by status and missing records.",
              "Open analytics to show coordinator workload and specialist capacity protected.",
              "Import sample EMR records to show the integration path.",
            ]}
          />
        </div>

        <section className="mt-10 rounded-lg border border-slate-200 bg-white p-6 shadow-[0_16px_44px_-34px_rgba(76,29,149,0.5)]">
          <h2 className="text-2xl font-semibold text-slate-950">What should feel complete in the demo</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Proof icon={ClipboardList} title="One patient, one active case" text="Patients can update, archive, restore, and delete cases without creating duplicate specialist noise." />
            <Proof icon={CreditCard} title="Payment path does not block" text="Stripe works when configured; sandbox checkout unlocks local presentations." />
            <Proof icon={Stethoscope} title="Second-opinion tracking" text="Referral history shows package, payment, request, specialist review, and opinion delivery steps." />
            <Proof icon={FileText} title="Downloadable packet" text="The PDF export now looks like a clinical case packet, not a raw data dump." />
            <Proof icon={LineChart} title="Clinic value" text="Analytics translate cases into record gaps, readiness, protected consults, and coordinator workload." />
            <Proof icon={Building2} title="Integration preview" text="The EMR flow presents a credible connector path without promising a live integration before contracts." />
          </div>
        </section>
      </section>
    </main>
  );
}

function DemoPath({
  icon: Icon,
  title,
  steps,
  href,
  action,
}: {
  icon: typeof UsersRound;
  title: string;
  steps: string[];
  href: string;
  action: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
      </div>
      <ol className="mt-6 space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-6 text-slate-700">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-teal-800">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <Button asChild variant="outline" className="mt-6">
        <Link href={href}>{action} <ArrowRight className="h-4 w-4" /></Link>
      </Button>
    </article>
  );
}

function Proof({ icon: Icon, title, text }: { icon: typeof ClipboardList; title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <Icon className="h-5 w-5 text-teal-700" />
      <h3 className="mt-3 font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
