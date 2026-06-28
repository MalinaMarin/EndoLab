import { listConsents } from "@/lib/admin";
import ExportTrigger from "@/components/admin/export-trigger";
import { requireAdminPage } from "@/lib/admin";
import { BrainCircuit, CheckCircle2, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function GovernancePage() {
  await requireAdminPage();
  let consents = [] as any[];
  try {
    consents = await listConsents(50);
  } catch {
    consents = [];
  }

  return (
    <main className="min-h-screen py-10">
      <div className="mx-auto max-w-5xl px-6">
        <h1 className="text-2xl font-semibold mb-6">Governance & Consent</h1>

        <section className="rounded-xl border bg-white p-6 mb-6">
          <h2 className="font-semibold">User consents</h2>
          <p className="text-sm text-gray-500">Recent consent records.</p>
          <ul className="mt-4 space-y-3 text-sm">
            {consents.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.user_id}</div>
                  <div className="text-xs text-gray-500">{c.consent_version ?? "v1"} — {new Date(c.created_at).toLocaleString()}</div>
                </div>
                <div className={`text-sm ${c.consent_given ? "text-emerald-600" : "text-rose-600"}`}>{c.consent_given ? "Given" : "Revoked"}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-white p-6 mb-6">
          <h2 className="flex items-center gap-2 font-semibold">
            <BrainCircuit className="h-5 w-5 text-violet-700" />
            Clinical intelligence boundary
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            EndoLab intelligence is limited to record organization, documentation-gap detection, referral-readiness explanation, and clinician-review support.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <GovernanceCard
              icon={CheckCircle2}
              title="Allowed"
              items={[
                "Surface evidence-linked record gaps.",
                "Explain why a case may need specific specialist expertise.",
                "Prioritize human review when confidence is low or documentation is incomplete.",
                "Export reviewed, deidentified correction signals for quality improvement.",
              ]}
              tone="allowed"
            />
            <GovernanceCard
              icon={ShieldAlert}
              title="Not allowed"
              items={[
                "Diagnose endometriosis or disease stage.",
                "Detect disease directly from MRI images.",
                "Choose treatment or replace clinician judgment.",
                "Guarantee surgeon quality, outcome, or availability.",
              ]}
              tone="blocked"
            />
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="font-semibold">Export & de-identification</h2>
          <p className="text-sm text-gray-500">Exports are stored privately and opened through short-lived secure links. Keep de-identification enabled unless a contracted data transfer explicitly requires identifiable records.</p>
          {/* client component handles interactions */}
          <ExportTrigger />
        </section>
      </div>
    </main>
  );
}

function GovernanceCard({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: typeof CheckCircle2;
  title: string;
  items: string[];
  tone: "allowed" | "blocked";
}) {
  const className = tone === "allowed"
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : "border-rose-200 bg-rose-50 text-rose-950";

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <h3 className="flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
