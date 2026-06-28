import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseDetailView } from "@/components/clinical/case-detail-view";
import { getCase, getCaseReferrals } from "@/lib/cases-store";
import { sampleCases } from "@/lib/sample-cases";
import { requireUser } from "@/lib/account";

type CaseDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const resolvedParams = await params;
  const context = await requireUser();
  const item = await getCase(resolvedParams.id, context);

  if (!item) {
    notFound();
  }

  const referrals = await getCaseReferrals(resolvedParams.id, context);

  return (
    <main className="min-h-screen bg-violet-50/40">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <Link href={context.accountType === "clinic" ? "/doctor/inbox" : "/patient/dashboard"} className="mb-5 inline-block text-sm text-violet-800/80 hover:text-violet-950">
          Back to cases
        </Link>
        <CaseDetailView
          item={item}
          referrals={referrals}
          canManageLifecycle={context.accountType === "patient"}
          isDemoCase={process.env.ENABLE_DEMO_DATA === "true" && sampleCases.some((sample) => sample.id === item.id)}
        />
      </section>
    </main>
  );
}
