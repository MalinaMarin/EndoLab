import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { enforceRateLimit } from "@/lib/request-safety";
import { canAccessCase, getUserContext } from "@/lib/account";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function sandboxCheckoutEnabled() {
  return process.env.ENABLE_SANDBOX_CHECKOUT === "true" || process.env.NODE_ENV !== "production";
}

export async function POST(request: Request) {
  try {
    const limited = enforceRateLimit(request, { key: "checkout", limit: 10, windowMs: 60_000 });
    if (limited) {
      return NextResponse.json({ error: "Too many checkout requests." }, { status: 429 });
    }
    const { caseId } = (await request.json()) as { caseId?: string };
    if (!caseId) {
      return NextResponse.json({ error: "Missing caseId." }, { status: 400 });
    }
    const context = await getUserContext();
    if (!context) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!(await canAccessCase(caseId, context))) return NextResponse.json({ error: "Case not found." }, { status: 404 });

    const supabase = createSupabaseServerClient();
    const { data: caseRecord, error: caseError } = await supabase
      .from("cases")
      .select("id,status,payment_status")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError || !caseRecord) {
      return NextResponse.json({ error: "Case not found." }, { status: 404 });
    }
    if (caseRecord.status === "imported" || caseRecord.payment_status === "not_required") {
      return NextResponse.json({ error: "Clinic-imported cases do not require per-case checkout." }, { status: 400 });
    }
    if (caseRecord.payment_status === "paid") {
      return NextResponse.json({ error: "This case is already paid." }, { status: 409 });
    }

    if (!process.env.STRIPE_SECRET_KEY && sandboxCheckoutEnabled()) {
      await supabase
        .from("cases")
        .update({
          payment_status: "paid",
          stripe_session_id: `sandbox_${caseId}`,
          paid_at: new Date().toISOString(),
        })
        .eq("id", caseId);

      const appUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";
      return NextResponse.json({
        url: `${appUrl}/doctor/case/${caseId}?paid=true&sandboxCheckout=true`,
        sandbox: true,
        message: "Sandbox checkout completed because Stripe is not configured.",
      });
    }

    const stripe = new Stripe(getEnv("STRIPE_SECRET_KEY"));
    const appUrl = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

    const hasPriceId = Boolean(process.env.STRIPE_PRICE_ID);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${appUrl}/doctor/case/${caseId}?paid=true`,
      cancel_url: `${appUrl}/intake?cancelled=true`,
      metadata: { caseId },
      client_reference_id: caseId,
      line_items: hasPriceId
        ? [{ price: getEnv("STRIPE_PRICE_ID"), quantity: 1 }]
        : [
            {
              price_data: {
                currency: "eur",
                product_data: { name: "EndoLab Case Brief" },
                unit_amount: 7900,
              },
              quantity: 1,
            },
          ],
    });

    await supabase
      .from("cases")
      .update({ payment_status: "pending", stripe_session_id: session.id })
      .eq("id", caseId);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not create checkout session.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
