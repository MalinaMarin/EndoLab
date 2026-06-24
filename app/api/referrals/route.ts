import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { canAccessCase, getUserContext } from "@/lib/account";

function toEventDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const caseId = String(body.caseId ?? "").trim();
    const specialistId = String(body.specialistId ?? "").trim();

    if (!caseId || !specialistId) {
      return NextResponse.json({ error: "caseId and specialistId are required." }, { status: 400 });
    }
    const context = await getUserContext();
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!(await canAccessCase(caseId, context))) return NextResponse.json({ error: "Case not found." }, { status: 404 });

    const supabase = createSupabaseServerClient();

    const { data: existingCase, error: caseError } = await supabase
      .from("cases")
      .select("timeline,status,payment_status")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError) {
      return NextResponse.json(
        { error: "Unable to validate case record.", details: caseError.message },
        { status: 500 },
      );
    }

    if (!existingCase) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }
    if (existingCase.status !== "imported" && existingCase.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Complete checkout before requesting a paid specialist referral." },
        { status: 402 },
      );
    }

    const notes = String(body.message ?? body.notes ?? "").trim();
    const requestedBy = String(body.requestedBy ?? body.requested_by ?? "").trim();

    const { data: existingReferral, error: existingReferralError } = await supabase
      .from("referrals")
      .select("id,status")
      .eq("case_id", caseId)
      .eq("specialist_id", specialistId)
      .in("status", ["pending", "accepted"])
      .limit(1)
      .maybeSingle();

    if (existingReferralError) {
      return NextResponse.json(
        { error: "Unable to check existing referral requests.", details: existingReferralError.message },
        { status: 500 },
      );
    }

    if (existingReferral) {
      return NextResponse.json({
        success: true,
        existing: true,
        message: existingReferral.status === "accepted" ? "This referral is already accepted." : "A referral request is already pending.",
        referralId: existingReferral.id,
      });
    }

    const referralPayload: any = {
      case_id: caseId,
      specialist_id: specialistId,
      status: "pending",
      requested_by_user_id: context.user.id,
      organization_id: context.organizationId ?? null,
    };
    if (notes) referralPayload.notes = notes;
    if (requestedBy) referralPayload.requested_by = requestedBy;

    const { data: inserted, error: referralError } = await supabase.from("referrals").insert(referralPayload).select("id").single();
    if (referralError) {
      return NextResponse.json(
        { error: "Could not save referral request.", details: referralError.message },
        { status: 500 },
      );
    }

    const updatedTimeline = [
      ...(Array.isArray(existingCase.timeline) ? existingCase.timeline : []),
      {
        date: toEventDate(),
        label: `Referral requested for specialist ${specialistId}`,
        type: "diagnosis",
      },
    ];

    const { error: updateError } = await supabase
      .from("cases")
      .update({ timeline: updatedTimeline })
      .eq("id", caseId);

    if (updateError) {
      return NextResponse.json({
        success: true,
        warning: "Referral saved, but the case timeline could not be updated.",
        message: "Referral request saved.",
        referralId: inserted?.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Referral request persisted and case timeline updated.",
      referralId: inserted?.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Referral request failed.",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
