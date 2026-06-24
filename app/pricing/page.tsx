import Link from "next/link";
import { Building2, Check, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";

const clinicPlans = [
  {
    name: "Pilot Starter",
    price: "EUR 399",
    unit: "/ month",
    detail: "For one specialist center validating referral operations.",
    features: ["Up to 75 active cases", "CSV intake and record-chase workflow", "Case briefs and referral readiness", "Pilot onboarding"],
  },
  {
    name: "Clinic Growth",
    price: "EUR 999",
    unit: "/ month",
    detail: "For a center with multiple coordinators and reviewers.",
    features: ["Up to 300 active cases", "Reviewed extraction queue", "Governed exports and analytics", "Priority workflow support"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    unit: "",
    detail: "For networks needing identity, integrations, and contractual controls.",
    features: ["Organization roles and SSO roadmap", "FHIR/HL7 implementation", "Regional hosting and audit requirements", "Contracted onboarding and support"],
  },
];

export default function PricingPage() {
  return (
    <main className="bg-slate-50/70">
      <section className="mx-auto max-w-6xl px-6 py-12">
        <header className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            <Building2 className="h-4 w-4" /> Pilot pricing
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-950">Price the workflow, not the algorithm</h1>
          <p className="mt-4 text-lg leading-8 text-slate-700">
            Clinic subscriptions are the primary business model. Patient payments cover a defined case-preparation workflow; professional specialist fees remain separate.
          </p>
        </header>

        <div className="mt-9 grid gap-5 lg:grid-cols-3">
          {clinicPlans.map((plan) => (
            <article key={plan.name} className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-slate-950">{plan.name}</h2>
              <p className="mt-4 text-3xl font-semibold text-slate-950">{plan.price} <span className="text-sm font-medium text-slate-500">{plan.unit}</span></p>
              <p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{plan.detail}</p>
              <ul className="mt-5 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" /> {feature}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6 w-full">
                <Link href="/signup">Create clinic account</Link>
              </Button>
            </article>
          ))}
        </div>

        <section className="mt-8 grid gap-5 rounded-lg border border-teal-200 bg-teal-50 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-teal-800">
              <HeartHandshake className="h-4 w-4" /> Patient case preparation
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">EUR 79 platform fee per prepared case</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
              Covers structured intake, record-gap workflow, and referral preparation. A verified clinician review or consultation must be priced and contracted separately.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/signup">Create patient account</Link>
          </Button>
        </section>

        <p className="mt-6 text-sm text-slate-500">
          These are design-partner prices for validation, not a guarantee of public availability or included medical services.
        </p>
      </section>
    </main>
  );
}
