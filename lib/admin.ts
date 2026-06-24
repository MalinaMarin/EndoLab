import { createSupabaseServerClient } from "./supabase-server";
import { NextResponse } from "next/server";
import { verifyAdminToken } from "./auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAdmin(request: Request, requiredScope?: string | string[]) {
  try {
    const cookie = request.headers.get("cookie") ?? "";
    const match = cookie.split(";").map((p) => p.trim()).find((c) => c.startsWith("admin_token="));
    const token = match ? match.split("=").slice(1).join("=") : null;
    const payload = await verifyAdminToken(token);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    // allowlist via env var (comma-separated emails)
    const allowlistRaw = process.env.ADMIN_EMAIL_ALLOWLIST ?? process.env.ADMIN_ALLOWLIST ?? "";
    if (allowlistRaw) {
      const allowed = allowlistRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      const email = (payload.email ?? "").toLowerCase();
      if (!allowed.includes(email)) return NextResponse.json({ success: false, error: "Unauthorized (not allowlisted)" }, { status: 401 });
    }

    if (requiredScope) {
      const need = Array.isArray(requiredScope) ? requiredScope : [requiredScope];
      const has = payload.scopes ?? [];
      const ok = need.every((s) => has.includes(s));
      if (!ok) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    return null;
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function requireAdminPage(requiredScope?: string | string[]) {
  const cookieStore = await cookies();
  const payload = await verifyAdminToken(cookieStore.get("admin_token")?.value ?? null);
  if (!payload) redirect("/admin/login");

  const allowlistRaw = process.env.ADMIN_EMAIL_ALLOWLIST ?? process.env.ADMIN_ALLOWLIST ?? "";
  if (allowlistRaw) {
    const allowed = allowlistRaw.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes((payload.email ?? "").toLowerCase())) redirect("/admin/login");
  }

  if (requiredScope) {
    const required = Array.isArray(requiredScope) ? requiredScope : [requiredScope];
    const scopes = payload.scopes ?? [];
    if (!required.every((scope) => scopes.includes(scope))) redirect("/admin/login");
  }

  return payload;
}

export async function getAnalyticsSummary() {
  const supabase = createSupabaseServerClient();
  const [{ count: casesCount }, { count: reviewsCount }, { count: exportsCount }] = await Promise.all([
    supabase.from("cases").select("id", { count: "exact", head: true }),
    supabase.from("reviews").select("id", { count: "exact", head: true }),
    supabase.from("export_jobs").select("id", { count: "exact", head: true }),
  ]).then((res) => res.map((r) => r.error ? { count: 0 } : { count: (r.count ?? 0) }));

  return {
    totalCases: casesCount ?? 0,
    totalReviews: reviewsCount ?? 0,
    totalExports: exportsCount ?? 0,
  };
}

export async function listRecentExports(limit = 5) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("export_jobs").select("id, created_at, path, public_url, record_count, status, deidentified").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function listConsents(limit = 50) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("user_consents").select("id, created_at, user_id, consent_given, consent_at, consent_version").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}
