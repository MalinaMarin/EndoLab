import { sampleCases } from "@/lib/sample-cases";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { EndoCase } from "@/lib/types";
import { getUserContext, type UserContext } from "@/lib/account";

type CaseRow = {
  id: string;
  title: string;
  age: number | null;
  country: string | null;
  summary: string;
  timeline: EndoCase["timeline"] | null;
  disease_map: EndoCase["diseaseMap"] | null;
  surgeries: EndoCase["surgeries"] | null;
  imaging: string[] | null;
  symptoms: string[] | null;
  uncertainty_flags: string[] | null;
  missing_info: string[] | null;
  severity: EndoCase["severity"];
  complexity_note: string;
  status?: EndoCase["status"];
  payment_status?: EndoCase["paymentStatus"];
  owner_user_id?: string | null;
  organization_id?: string | null;
  assigned_to?: string | null;
  created_at?: string | null;
};

const CASE_QUERY_TIMEOUT_MS = 2500;

function demoCasesEnabled() {
  return process.env.ENABLE_DEMO_DATA === "true" || process.env.NODE_ENV !== "production";
}

function fallbackCases(context?: UserContext | null) {
  return demoCasesEnabled() && context?.accountType === "clinic" ? sampleCases : [];
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = CASE_QUERY_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Case query timed out.")), timeoutMs);
    }),
  ]);
}

function rowToCase(row: CaseRow): EndoCase {
  return {
    id: row.id,
    title: row.title,
    patient: { age: row.age ?? undefined, country: row.country ?? undefined },
    summary: row.summary,
    timeline: row.timeline ?? [],
    diseaseMap:
      row.disease_map ?? {
        ovaries: "unknown",
        bowel: "unknown",
        bladder: "unknown",
        uterosacral: "unknown",
        adhesions: "low",
      },
    surgeries: row.surgeries ?? [],
    imaging: row.imaging ?? [],
    symptoms: row.symptoms ?? [],
    uncertaintyFlags: row.uncertainty_flags ?? [],
    missingInfo: row.missing_info ?? [],
    severity: row.severity,
    complexityNote: row.complexity_note,
    status: row.status,
    paymentStatus: row.payment_status,
    ownerUserId: row.owner_user_id ?? undefined,
    organizationId: row.organization_id ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    createdAt: row.created_at ?? undefined,
    archivedAt: row.status === "archived" ? row.created_at ?? new Date(0).toISOString() : undefined,
  };
}

export async function listCases(context?: UserContext): Promise<EndoCase[]> {
  try {
    const activeContext = context ?? await getUserContext();
    if (!activeContext) return [];
    const supabase = createSupabaseServerClient();
    const baseQuery = supabase.from("cases").select("*");
    const query = activeContext.accountType === "clinic"
      ? baseQuery.eq("organization_id", activeContext.organizationId!).neq("status", "archived")
      : baseQuery.eq("owner_user_id", activeContext.user.id);
    const { data, error } = await withTimeout(
      query.order("created_at", { ascending: false }),
    );

    if (error || !data) {
      return fallbackCases(activeContext);
    }

    const dbCases = (data as CaseRow[]).map(rowToCase);
    return demoCasesEnabled() && activeContext.accountType === "clinic"
      ? [...dbCases, ...sampleCases.filter((item) => !dbCases.some((dbItem) => dbItem.id === item.id))]
      : dbCases;
  } catch {
    return [];
  }
}

export async function getCase(id: string, context?: UserContext): Promise<EndoCase | undefined> {
  try {
    const activeContext = context ?? await getUserContext();
    if (!activeContext) return undefined;
    const sample = demoCasesEnabled() && activeContext.accountType === "clinic"
      ? sampleCases.find((item) => item.id === id)
      : undefined;
    if (sample) return sample;
    const supabase = createSupabaseServerClient();
    const baseQuery = supabase.from("cases").select("*").eq("id", id);
    const query = activeContext.accountType === "clinic"
      ? baseQuery.eq("organization_id", activeContext.organizationId!).neq("status", "archived")
      : baseQuery.eq("owner_user_id", activeContext.user.id);
    const { data, error } = await withTimeout(query.maybeSingle());

    if (error || !data) {
      return sample;
    }

    return rowToCase(data as CaseRow);
  } catch {
    return undefined;
  }
}

export async function getCaseReferrals(caseId: string, context?: UserContext) {
  try {
    const activeContext = context ?? await getUserContext();
    if (!activeContext) return [];
    const accessible = await getCase(caseId, activeContext);
    if (!accessible) return [];
    const supabase = createSupabaseServerClient();
    const { data, error } = await withTimeout(
      supabase
        .from("referrals")
        .select("id, case_id, specialist_id, status, created_at")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false }),
    );

    if (error || !data) {
      return [];
    }

    return (data as Array<{ id: string; case_id: string; specialist_id: string; status: string; created_at: string }>).map(
      (row) => ({
        id: row.id,
        caseId: row.case_id,
        specialistId: row.specialist_id,
        status: row.status as "pending" | "accepted" | "declined",
        requestedAt: row.created_at,
      }),
    );
  } catch {
    return [];
  }
}
