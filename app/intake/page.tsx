import Link from "next/link";
import { ClipboardPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntakeForm } from "@/components/clinical/intake-form";
import { requireUser } from "@/lib/account";

export default async function IntakePage() {
  const context = await requireUser();
  const paymentEnabled = Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_ID &&
    process.env.STRIPE_WEBHOOK_SECRET,
  );

  return (
    <main className="min-h-screen bg-[linear-gradient(to_bottom,rgba(245,243,255,0.75),rgba(255,255,255,1))]">
      <section className="mx-auto max-w-4xl px-6 py-10 md:py-12">
        <header className="mb-6 border-b border-slate-200 pb-6">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">
            <ClipboardPlus className="h-4 w-4" />
            Patient second-opinion journey
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">Build a specialist-ready endometriosis case</h1>
          <p className="mt-3 text-base leading-7 text-slate-700">
            Patients and coordinators can submit symptoms, MRI or clinical report text, and documents for structured second-opinion preparation.
          </p>
        </header>

        <IntakeForm paymentEnabled={paymentEnabled} accountType={context.accountType} />

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href="/">Back to Home</Link>
          </Button>
          {context.accountType === "clinic" ? <Button asChild variant="outline" size="lg"><Link href="/clinic/import">Clinic bulk import</Link></Button> : null}
        </div>
      </section>
    </main>
  );
}
