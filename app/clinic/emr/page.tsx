import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmrConnectorPreview } from "@/components/clinical/emr-connector";
import { requireClinic } from "@/lib/account";

export default async function ClinicEmrPage() {
  await requireClinic();
  return (
    <main className="min-h-screen bg-[linear-gradient(to_bottom,rgba(245,243,255,0.95),rgba(255,255,255,1))]">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-12">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">EMR connector preview</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">EMR import workflow</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
                Connect EndoLab to a clinic EMR feed and import structured cases from patient summaries. This guided preview shows the first integration layer for EMR-to-referral workflows.
              </p>
            </div>
            <Button asChild variant="outline" size="lg">
              <Link href="/clinic/import">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to bulk import
              </Link>
            </Button>
          </div>
        </div>

        <EmrConnectorPreview />
      </section>
    </main>
  );
}
