import { NextResponse } from "next/server";
import { canAccessCase, getUserContext } from "@/lib/account";
import { cleanText, enforceRateLimit, isAllowedClinicalFile } from "@/lib/request-safety";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type RouteProps = {
  params: Promise<{ id: string }>;
};

const messageTypes = new Set(["message", "missing_record_request", "specialist_question", "status_update"]);

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params;
  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await canAccessCase(id, context))) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("case_messages")
    .select("id, created_at, sender_name, sender_role, body, message_type, attachments, read_by")
    .eq("case_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: "Could not load messages.", details: error.message }, { status: 500 });
  return NextResponse.json({ success: true, messages: data ?? [] });
}

export async function POST(request: Request, { params }: RouteProps) {
  const { id } = await params;
  const limited = enforceRateLimit(request, { key: "case-message", limit: 30, windowMs: 60_000 });
  if (limited) return NextResponse.json({ error: "Too many messages. Please wait before sending again." }, { status: 429 });

  const context = await getUserContext();
  if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!(await canAccessCase(id, context))) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const formData = await request.formData();
  const body = cleanText(formData.get("body"), 4000);
  const messageType = cleanText(formData.get("messageType"), 80);
  const safeMessageType = messageTypes.has(messageType) ? messageType : "message";
  const files = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);

  if (!body && files.length === 0) return NextResponse.json({ error: "Write a message or attach a file." }, { status: 400 });
  if (files.length > 3) return NextResponse.json({ error: "Attach at most 3 files per message." }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const attachments: Array<{ name: string; path: string; size: number; contentType: string }> = [];

  for (const file of files) {
    if (!isAllowedClinicalFile(file)) return NextResponse.json({ error: `Unsupported or oversized attachment: ${file.name}` }, { status: 400 });
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${id}/messages/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from("case-files").upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
    });
    if (error) return NextResponse.json({ error: `Could not upload ${file.name}.`, details: error.message }, { status: 500 });
    attachments.push({ name: file.name, path: `storage://${path}`, size: file.size, contentType: file.type || "application/octet-stream" });
  }

  const { data, error } = await supabase
    .from("case_messages")
    .insert({
      case_id: id,
      sender_user_id: context.user.id,
      sender_name: context.fullName,
      sender_role: context.accountType === "clinic" ? context.clinicRole ?? "clinic" : "patient",
      body,
      message_type: safeMessageType,
      attachments,
      read_by: [context.user.id],
      organization_id: context.organizationId ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Could not send message.", details: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}
