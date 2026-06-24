import { ShieldCheck, Stethoscope } from "lucide-react";
import { SpecialistMarketplace } from "@/components/patient/specialist-marketplace";

export default function PatientSpecialistsPage() {
  return (
    <main className="min-h-screen bg-slate-50/70">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <header className="mb-8 border-b border-slate-200 pb-7">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">
            <Stethoscope className="h-4 w-4" />
            Specialist matching
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">Compare second-opinion specialists by clinical fit</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
            Compare expertise, review format, language, expected cost, response time, and availability before sharing a case.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Directory profiles are sample data until each clinic completes credential review and live availability onboarding.
          </p>
        </header>

        <SpecialistMarketplace />
      </section>
    </main>
  );
}
