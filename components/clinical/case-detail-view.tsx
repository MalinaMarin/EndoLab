"use client";

import { useState } from "react";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { EndoCase, ReferralRequest } from "@/lib/types";
import {
  buildClinicalSummary,
  buildGovernedLearningSignals,
  buildClinicalActionItems,
  buildMissingRecordWorkflow,
  buildSurgeonExpertiseTags,
  calculateReferralReadinessScore,
  getCaseDisposition,
  getDataCompletenessLabel,
  getReferralReadinessLabel,
  getRecommendedSpecialistFocus,
  getReviewPriority,
  matchSpecialists,
} from "@/lib/case-utils";
import { AlertTriangle, CalendarFold, CheckCircle2, CircleDashed, ClipboardCheck, Clock3, FileText, GraduationCap, ListChecks, Map, ScissorsLineDashed, ShieldCheck, Stethoscope } from "lucide-react";
import CaseDetailEditor from "@/components/clinical/case-detail-editor";
import { ExportPdfButton } from "@/components/clinical/export-pdf-button";
import { ReferralRequestButton } from "@/components/clinical/referral-request-button";
import { ShareCaseButton } from "@/components/clinical/share-case-button";
import { CheckoutButton } from "@/components/clinical/checkout-button";
import { CaseIntelligencePanel } from "@/components/clinical/case-intelligence-panel";
import { CaseDocumentWorkspace } from "@/components/clinical/case-document-workspace";
import { CaseMessagingPanel } from "@/components/clinical/case-messaging-panel";
import { getSpecialistById } from "@/lib/specialists";
import { buildMissingRecordTasks, getCaseWorkflowStatus, getWorkflowStatusLabel } from "@/lib/workflow";

function Section({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.45)] ${className}`}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-slate-600 uppercase">
        <Icon className="h-4 w-4" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CaseDetailView({
  item,
  referrals,
  canManageLifecycle = false,
  isDemoCase = false,
}: {
  item: EndoCase;
  referrals: ReferralRequest[];
  canManageLifecycle?: boolean;
  isDemoCase?: boolean;
}) {
  const [diseaseMapState, setDiseaseMapState] = useState<EndoCase["diseaseMap"]>(item.diseaseMap);
  const [surgeriesState, setSurgeriesState] = useState<EndoCase["surgeries"]>(item.surgeries || []);
  const displayedItem = { ...item, diseaseMap: diseaseMapState, surgeries: surgeriesState };

  const summaryItems = buildClinicalSummary(displayedItem);
  const actionItems = buildClinicalActionItems(displayedItem);
  const referralGuidance = getRecommendedSpecialistFocus(displayedItem);
  const expertiseTags = buildSurgeonExpertiseTags(displayedItem);
  const caseDisposition = getCaseDisposition(displayedItem);
  const matchedSpecialists = matchSpecialists(displayedItem);
  const completenessLabel = getDataCompletenessLabel(displayedItem);
  const reviewPriority = getReviewPriority(displayedItem);
  const readinessScore = calculateReferralReadinessScore(displayedItem);
  const readinessLabel = getReferralReadinessLabel(readinessScore);
  const missingRecordWorkflow = buildMissingRecordWorkflow(displayedItem);
  const governedLearningSignals = buildGovernedLearningSignals(displayedItem);
  const workflowStatus = getCaseWorkflowStatus(displayedItem);
  const missingRecordTasks = buildMissingRecordTasks(displayedItem);
  const qualityScore = readinessScore;
  const qualityLabel = readinessLabel;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_10px_34px_-26px_rgba(15,23,42,0.55)]">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-wider text-teal-700">{item.id}</p>
            <h1 className="mt-1 text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">{item.title}</h1>
            <p className="mt-4 text-base leading-7 text-slate-700">{item.summary}</p>
          </div>

          <div className="grid w-full gap-3 sm:w-52">
            <ExportPdfButton caseId={item.id} />
            <ShareCaseButton caseId={item.id} />
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-teal-200 bg-teal-50/80 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-800">Referral Readiness</p>
              <p className="mt-2 text-3xl font-semibold text-teal-950">{readinessScore}%</p>
              <p className="mt-1 text-base text-teal-900/80">{readinessLabel}</p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white md:w-72">
              <div className="h-full rounded-full bg-teal-600" style={{ width: `${readinessScore}%` }} />
            </div>
          </div>
        </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CardBadge label="Review priority" value={reviewPriority} />
            <CardBadge label="Documentation" value={completenessLabel} />
            <CardBadge label="Case quality" value={`${qualityScore}% - ${qualityLabel}`} />
            <CardBadge label="Workflow" value={getWorkflowStatusLabel(workflowStatus)} />
          </div>
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">{caseDisposition}</p>
          {isDemoCase ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Demo case: referral requests are disabled until a case is created through intake or clinic import.
            </p>
          ) : null}
          {!isDemoCase && item.status !== "imported" && item.paymentStatus !== "paid" ? (
            <div className="mt-3 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <p>Service confirmation is required before a specialist referral can be sent.</p>
              <CheckoutButton caseId={item.id} label="Confirm service" />
            </div>
          ) : null}
      </div>

      <CaseDetailEditor item={item} canManageLifecycle={canManageLifecycle} onChangeDiseaseMap={(next) => setDiseaseMapState(next)} onChangeSurgeries={(next) => setSurgeriesState(next)} />

      <CaseIntelligencePanel item={displayedItem} />
      <CaseDocumentWorkspace caseId={item.id} />
      <CaseMessagingPanel caseId={item.id} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Section title="Clinical Summary" icon={Stethoscope}>
          <ul className="list-disc space-y-2 pl-5 text-base text-slate-700">
            {summaryItems.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </Section>

        <Section title="Disease Map" icon={Map}>
          <div className="grid grid-cols-2 gap-3 text-base">
            <MapItem label="Ovaries" value={diseaseMapState.ovaries} />
            <MapItem label="Bowel" value={diseaseMapState.bowel} />
            <MapItem label="Bladder" value={diseaseMapState.bladder} />
            <MapItem label="Uterosacral" value={diseaseMapState.uterosacral} />
            <MapItem label="Adhesions" value={diseaseMapState.adhesions} />
          </div>
        </Section>

        <Section title="Disease Timeline" icon={CalendarFold}>
          <ol className="space-y-3 border-l border-slate-200 pl-4">
            {item.timeline.map((entry) => (
              <li key={`${entry.date}-${entry.label}`} className="relative text-base text-slate-700">
                <span className="absolute -left-[21px] mt-1 h-2.5 w-2.5 rounded-full bg-teal-600" />
                <p className="font-semibold text-slate-950">{entry.date}</p>
                <p>{entry.label}</p>
                <p className="mt-1 text-sm uppercase tracking-wide text-slate-500">{entry.type}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Recommended Next Steps" icon={ShieldCheck}>
          <ul className="list-disc space-y-2 pl-5 text-base text-slate-700">
            {actionItems.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </Section>

        <Section title="Missing Records Workflow" icon={ListChecks}>
          <div className="space-y-3">
            {missingRecordTasks.length > 0 ? (
              missingRecordTasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">{task.label}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${task.priority === "high" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-800"}`}>
                      {task.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{task.owner}</p>
                </div>
              ))
            ) : (
              <ul className="list-disc space-y-2 pl-5 text-base text-slate-700">
                {missingRecordWorkflow.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        <Section title="Governed Learning Loop" icon={GraduationCap}>
          <ul className="list-disc space-y-2 pl-5 text-base text-slate-700">
            {governedLearningSignals.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </Section>

        <Section title="Referral Guidance" icon={ShieldCheck}>
          <ul className="list-disc space-y-2 pl-5 text-base text-slate-700">
            {referralGuidance.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </Section>

        <Section title="Surgeon Expertise Tags" icon={ClipboardCheck}>
          <div className="flex flex-wrap gap-2">
            {expertiseTags.map((tag) => (
              <span key={tag} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-900">
                {tag}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Suggested Specialists" icon={ClipboardCheck}>
          <div className="space-y-4">
            {matchedSpecialists.map((specialist) => {
              const existingReferral = referrals.find((referral) => referral.specialistId === specialist.id);
              return (
                <div key={specialist.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-violet-950">{specialist.name}</p>
                    <p className="mt-1 text-sm text-violet-700">{specialist.location}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${specialist.verified ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                    {specialist.verified ? "Verified" : "Recommended"}
                  </span>
                </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{specialist.bio}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {specialist.website ? (
                    <a href={specialist.website} target="_blank" rel="noreferrer" className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">
                      Visit profile
                    </a>
                  ) : null}
                  {isDemoCase ? (
                    <Link href="/intake" className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">
                      Create a referral-ready case
                    </Link>
                  ) : item.status !== "imported" && item.paymentStatus !== "paid" ? (
                    <CheckoutButton caseId={item.id} label="Confirm service first" />
                  ) : (
                    <ReferralRequestButton
                      caseId={item.id}
                      specialistId={specialist.id}
                      autoMessage={referralGuidance.join(" ")}
                      requestedBy={undefined}
                      existingStatus={existingReferral?.status}
                    />
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </Section>

        <Section title="Referral History" icon={ClipboardCheck}>
          {referrals.length === 0 ? (
            <ReferralStatusTracker item={displayedItem} />
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => {
                const specialist = getSpecialistById(referral.specialistId);
                return (
                  <div key={referral.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-violet-950">
                          {specialist?.name ?? referral.specialistId}
                        </p>
                        {specialist ? <p className="mt-1 text-sm text-violet-700">{specialist.location}</p> : null}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          referral.status === "accepted"
                            ? "bg-emerald-100 text-emerald-800"
                            : referral.status === "declined"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {referral.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-violet-900/80">
                      Requested {new Date(referral.requestedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <div className="mt-4">
                      <ReferralStatusTracker item={displayedItem} status={referral.status} specialistName={specialist?.name ?? referral.specialistId} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Surgical History" icon={ScissorsLineDashed}>
          {surgeriesState.length === 0 ? (
            <p className="text-base text-violet-900/70">No surgeries available.</p>
          ) : (
            <div className="space-y-3">
              {surgeriesState.map((surgery, idx) => (
                <div key={idx} className="rounded-xl border border-violet-200 p-4">
                  <p className="text-base font-semibold text-violet-950">
                    {surgery.year ?? "?"} - {surgery.type}
                  </p>
                  <p className="mt-1 text-base text-violet-900/80">{surgery.notes}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Imaging And Documents" icon={FileText}>
          <ul className="list-disc space-y-2 pl-5 text-base text-violet-900/80">
            {item.imaging.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </Section>

        <Section title="Clinical Uncertainty" icon={AlertTriangle}>
          <ul className="list-disc space-y-2 pl-5 text-base text-violet-900/80">
            {item.uncertaintyFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </Section>

        <Section title="Missing Information" icon={ListChecks}>
          <ul className="list-disc space-y-2 pl-5 text-base text-violet-900/80">
            {item.missingInfo.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function MapItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value.replace("_", " ")}</p>
    </div>
  );
}

function CardBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ReferralStatusTracker({
  item,
  status,
  specialistName,
}: {
  item: EndoCase;
  status?: ReferralRequest["status"];
  specialistName?: string;
}) {
  const paidOrClinic = item.status === "imported" || item.paymentStatus === "paid" || item.paymentStatus === "not_required";
  const requested = Boolean(status);
  const accepted = status === "accepted";
  const declined = status === "declined";
  const steps = [
    {
      label: "Case packet prepared",
      detail: "Clinical summary, disease map, record gaps, and referral guidance are available.",
      state: "done" as const,
    },
    {
      label: item.status === "imported" ? "Clinic case eligible" : "Service confirmed",
      detail: paidOrClinic ? "This case can be sent for specialist review." : "Complete checkout before requesting a paid specialist review.",
      state: paidOrClinic ? "done" as const : "current" as const,
    },
    {
      label: "Referral requested",
      detail: requested
        ? `Request sent${specialistName ? ` to ${specialistName}` : ""}.`
        : "Choose a suggested specialist to send the case packet.",
      state: requested ? "done" as const : paidOrClinic ? "current" as const : "waiting" as const,
    },
    {
      label: accepted ? "Specialist accepted" : declined ? "Specialist declined" : "Specialist review",
      detail: accepted
        ? "The next step is scheduling or final opinion preparation."
        : declined
          ? "Request another specialist or adjust the case packet before resubmitting."
          : requested
            ? "Awaiting specialist response and follow-up questions."
            : "Specialist review begins after a referral is requested.",
      state: accepted || declined ? "done" as const : requested ? "current" as const : "waiting" as const,
    },
    {
      label: "Opinion delivered",
      detail: "Final signed opinion and shareable packet will be stored with the case.",
      state: accepted ? "current" as const : "waiting" as const,
    },
  ];

  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.label} className="flex gap-3">
          <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
            step.state === "done"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : step.state === "current"
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-slate-200 bg-white text-slate-400"
          }`}>
            {step.state === "done" ? <CheckCircle2 className="h-3.5 w-3.5" /> : step.state === "current" ? <Clock3 className="h-3.5 w-3.5" /> : <CircleDashed className="h-3.5 w-3.5" />}
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-950">{step.label}</span>
            <span className="mt-1 block text-sm leading-5 text-slate-600">{step.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
