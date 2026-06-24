import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { requireAdmin } from "@/lib/admin";
import { SCOPES } from "@/lib/scopes";

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req, SCOPES.ANALYTICS_READ);
    if (auth) return auth;
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("admin_users").select("id, email, name, role, created_at").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, users: data ?? [] });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin(request, SCOPES.EXPORT_WRITE);
    if (auth) return auth;
    const body = await request.json().catch(() => ({}));
    const { email, name, role } = body as { email?: string; name?: string; role?: string };
    if (!email) return NextResponse.json({ success: false, error: "Missing email" }, { status: 400 });
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.from("admin_users").insert([{ email: String(email).toLowerCase(), name: name ?? null, role: role ?? 'reviewer' }]).select("id, email, name, role, created_at").limit(1);
    if (error) throw error;
    return NextResponse.json({ success: true, user: data?.[0] ?? null });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
