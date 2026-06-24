import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const signature = request.headers.get("stripe-signature");

  if (!secret || !stripeKey || !signature) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  try {
    const stripe = new Stripe(stripeKey);
    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(payload, signature, secret);

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const caseId = session.metadata?.caseId ?? session.client_reference_id;
      if (caseId) {
        const supabase = createSupabaseServerClient();
        await supabase
          .from("cases")
          .update({ payment_status: "paid", paid_at: new Date().toISOString(), stripe_session_id: session.id })
          .eq("id", caseId);
      }
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const caseId = session.metadata?.caseId ?? session.client_reference_id;
      if (caseId) {
        const supabase = createSupabaseServerClient();
        await supabase.from("cases").update({ payment_status: "unpaid" }).eq("id", caseId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid Stripe webhook.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
