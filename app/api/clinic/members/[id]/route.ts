import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/account";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function authorize(id: string) {
  const context = await getUserContext();
  if (!context || context.accountType !== "clinic" || !context.organizationId || context.clinicRole !== "owner") {
    return { error: NextResponse.json({ error: "Clinic owner access required." }, { status: 403 }) };
  }
  const admin = createSupabaseServerClient();
  const { data: membership } = await admin
    .from("organization_memberships")
    .select("id,user_id,role")
    .eq("id", id)
    .eq("organization_id", context.organizationId)
    .maybeSingle();
  if (!membership) return { error: NextResponse.json({ error: "Membership not found." }, { status: 404 }) };
  if (membership.user_id === context.user.id || membership.role === "owner") {
    return { error: NextResponse.json({ error: "The clinic owner membership cannot be changed here." }, { status: 400 }) };
  }
  return { admin, membership };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorized = await authorize(id);
  if ("error" in authorized) return authorized.error;
  const { role } = (await request.json().catch(() => ({}))) as { role?: string };
  if (role !== "doctor" && role !== "coordinator") {
    return NextResponse.json({ error: "Invalid clinic role." }, { status: 400 });
  }
  const { error } = await authorized.admin.from("organization_memberships").update({ role }).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not update member." }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorized = await authorize(id);
  if ("error" in authorized) return authorized.error;
  const { error } = await authorized.admin.from("organization_memberships").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not remove member." }, { status: 500 });
  return NextResponse.json({ success: true });
}
