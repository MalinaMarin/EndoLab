import Link from "next/link";
import { ArrowUpRight, MapPin, UserRound } from "lucide-react";
import { EndoCase } from "@/lib/types";
import { calculateCaseQualityScore, getCaseDisposition, matchSpecialists } from "@/lib/case-utils";

const severityStyles: Record<EndoCase["severity"], string> = {
  LOW: "border border-violet-200 bg-violet-50 text-violet-800",
  MEDIUM: "border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800",
  HIGH: "border border-purple-300 bg-purple-100 text-purple-900",
};

export function CaseCard({ item }: { item: EndoCase }) {
  const qualityScore = calculateCaseQualityScore(item);
  const disposition = getCaseDisposition(item);
  const [topMatch] = matchSpecialists(item);

  return (
    <Link
      href={`/doctor/case/${item.id}`}
      className="block rounded-2xl border border-violet-200/70 bg-white/90 p-6 shadow-[0_8px_24px_-18px_rgba(76,29,149,0.6)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_34px_-18px_rgba(76,29,149,0.65)]"
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-wider text-violet-700">{item.id}</p>
          <h3 className="mt-1 text-2xl font-semibold leading-tight text-violet-950">{item.title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${severityStyles[item.severity]}`}>
          {item.severity}
        </span>
      </div>

      <p className="mb-4 border-l-2 border-violet-200 pl-3 text-base leading-7 text-violet-900/80">{item.complexityNote}</p>
      <div className="mb-4 flex flex-wrap gap-2 text-sm text-violet-800">
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-900">
          {qualityScore}% quality
        </span>
        <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-medium text-violet-800">
          {disposition}
        </span>
        {topMatch ? (
          <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 font-medium text-fuchsia-800">
            Top match: {topMatch.name}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-violet-800/85">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4" />
          {item.patient.country ?? "Unknown country"}
        </span>
        {item.patient.age ? (
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-4 w-4" />
            Age {item.patient.age}
          </span>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-1 text-violet-700">
          Open case
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
