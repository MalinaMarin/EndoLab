import { AlertTriangle, BrainCircuit, CheckCircle2, FileSearch2, ShieldCheck } from "lucide-react";
import type { EndoCase } from "@/lib/types";
import { buildIntelligenceProfile } from "@/lib/intelligence";

export function CaseIntelligencePanel({ item }: { item: EndoCase }) {
  const profile = buildIntelligenceProfile(item);

  return (
    <section className="rounded-lg border border-violet-200 bg-white p-5 shadow-[0_12px_34px_-28px_rgba(76,29,149,0.55)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-violet-700">
            <BrainCircuit className="h-4 w-4" />
            Explainable intelligence
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Evidence-linked case assistance for record organization and clinician review. This is not diagnostic automation.
          </p>
        </div>
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">Confidence</p>
          <p className="mt-1 text-2xl font-semibold text-violet-950">{profile.confidenceScore}%</p>
          <p className="text-xs text-violet-800">{profile.confidenceLabel}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Guardrail icon={CheckCircle2} title="Permitted use" text={profile.permittedUse} tone="emerald" />
        <Guardrail icon={ShieldCheck} title="Not permitted" text={profile.prohibitedUse} tone="rose" />
      </div>

      {profile.humanReviewRequired ? (
        <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Human review is required before this packet is used for specialist referral or clinical planning.</p>
        </div>
      ) : null}

      <div className="mt-5 space-y-3">
        {profile.signals.map((signal) => (
          <article key={signal.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-950">{signal.label}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-700">{signal.finding}</p>
              </div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${confidenceClass(signal.confidence)}`}>
                {signal.confidence} confidence
              </span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <FileSearch2 className="h-3.5 w-3.5" />
                  Evidence used
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                  {signal.evidence.map((entry) => <li key={entry}>{entry}</li>)}
                </ul>
              </div>
              <div className="space-y-3 text-sm leading-6 text-slate-700">
                <p><span className="font-semibold text-slate-950">Next action:</span> {signal.action}</p>
                <p><span className="font-semibold text-slate-950">Guardrail:</span> {signal.guardrail}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function confidenceClass(confidence: "high" | "medium" | "low") {
  if (confidence === "high") return "bg-emerald-50 text-emerald-800";
  if (confidence === "medium") return "bg-amber-50 text-amber-800";
  return "bg-rose-50 text-rose-800";
}

function Guardrail({
  icon: Icon,
  title,
  text,
  tone,
}: {
  icon: typeof CheckCircle2;
  title: string;
  text: string;
  tone: "emerald" | "rose";
}) {
  const className = tone === "emerald"
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : "border-rose-200 bg-rose-50 text-rose-950";

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        {title}
      </p>
      <p className="mt-2 text-sm leading-6">{text}</p>
    </div>
  );
}
