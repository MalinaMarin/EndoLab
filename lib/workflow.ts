import type { EndoCase } from "@/lib/types";
import { calculateReferralReadinessScore } from "@/lib/case-utils";

export type CaseWorkflowStatus = "ready_for_review" | "record_chase" | "needs_triage";

export type MissingRecordTask = {
  id: string;
  caseId: string;
  caseTitle: string;
  label: string;
  owner: "Patient coordinator" | "Clinic admin" | "Records team";
  priority: "high" | "medium";
};

export function getCaseWorkflowStatus(item: EndoCase): CaseWorkflowStatus {
  const readiness = calculateReferralReadinessScore(item);

  if (item.missingInfo.length >= 2 || readiness < 68) {
    return "record_chase";
  }

  if (item.uncertaintyFlags.length > 0 || item.severity === "HIGH") {
    return "needs_triage";
  }

  return "ready_for_review";
}

export function getWorkflowStatusLabel(status: CaseWorkflowStatus) {
  if (status === "ready_for_review") return "Ready for specialist review";
  if (status === "record_chase") return "Record chase";
  return "Clinical triage";
}

export function buildMissingRecordTasks(item: EndoCase): MissingRecordTask[] {
  return item.missingInfo.map((label, index) => ({
    id: `${item.id}-missing-${index}`,
    caseId: item.id,
    caseTitle: item.title,
    label,
    owner: index === 0 ? "Patient coordinator" : index === 1 ? "Clinic admin" : "Records team",
    priority: item.severity === "HIGH" || index === 0 ? "high" : "medium",
  }));
}

export function getClinicWorkflowSummary(cases: EndoCase[]) {
  const counts = cases.reduce(
    (acc, item) => {
      const status = getCaseWorkflowStatus(item);
      acc[status] += 1;
      acc.missingTasks += item.missingInfo.length;
      if (item.severity === "HIGH") acc.highSeverity += 1;
      return acc;
    },
    {
      ready_for_review: 0,
      record_chase: 0,
      needs_triage: 0,
      missingTasks: 0,
      highSeverity: 0,
    },
  );

  return {
    total: cases.length,
    ...counts,
  };
}
