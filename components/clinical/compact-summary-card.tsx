import Link from "next/link";
import { ClipboardCheck, Stethoscope } from "lucide-react";
import { EndoCase } from "@/lib/types";
import { calculateReferralReadinessScore, getReferralReadinessLabel } from "@/lib/case-utils";
import { getCaseWorkflowStatus, getWorkflowStatusLabel } from "@/lib/workflow";

export default function CompactSummaryCard({ item }: { item: EndoCase }) {
  const readinessScore = calculateReferralReadinessScore(item);
  const readinessLabel = getReferralReadinessLabel(readinessScore);
  const workflowStatus = getCaseWorkflowStatus(item);

  return (
    <Link
      href={`/doctor/case/${item.id}`}
      className="block rounded-xl border border-violet-100 bg-white p-3 text-sm hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-violet-900">{item.title}</p>
          <p className="truncate text-xs text-violet-700">{item.complexityNote || item.summary}</p>
          <p className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
            {getWorkflowStatusLabel(workflowStatus)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800">
            <ClipboardCheck className="h-3 w-3" /> {readinessScore}%
          </div>
          <div className="mt-1 max-w-32 text-xs leading-4 text-slate-500">{readinessLabel}</div>
          <div className="text-xs text-violet-700">{item.surgeries?.length ?? 0} surgeries</div>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-xs text-violet-800">
            <Stethoscope className="h-3 w-3" /> {item.diseaseMap?.bowel ?? "unknown"}
          </div>
        </div>
      </div>
    </Link>
  );
}
