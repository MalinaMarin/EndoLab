export type TimelineEventType = "symptom" | "surgery" | "imaging" | "diagnosis";

export type DiseaseLikelihood = "likely" | "suspected" | "ruled_out" | "unknown";

export type CaseSeverity = "LOW" | "MEDIUM" | "HIGH";

export type SurgeryCompleteness = "complete" | "partial" | "unknown";

export type ReferralStatus = "pending" | "accepted" | "declined";

export type ReferralRequest = {
  id: string;
  caseId: string;
  specialistId: string;
  requestedAt: string;
  status: ReferralStatus;
};

export type EndoCase = {
  id: string;
  title: string;
  patient: {
    age?: number;
    country?: string;
  };
  summary: string;
  timeline: {
    date: string;
    label: string;
    type: TimelineEventType;
  }[];
  diseaseMap: {
    ovaries: DiseaseLikelihood;
    bowel: DiseaseLikelihood;
    bladder: DiseaseLikelihood;
    uterosacral: DiseaseLikelihood;
    adhesions: "low" | "medium" | "high";
  };
  surgeries: {
    year: number;
    type: string;
    notes: string;
    completeness: SurgeryCompleteness;
  }[];
  imaging: string[];
  symptoms: string[];
  uncertaintyFlags: string[];
  missingInfo: string[];
  severity: CaseSeverity;
  complexityNote: string;
  status?: "submitted" | "imported" | "reviewed";
  paymentStatus?: "not_required" | "unpaid" | "pending" | "paid" | "refunded";
  ownerUserId?: string;
  organizationId?: string;
  assignedTo?: string;
  createdAt?: string;
};
