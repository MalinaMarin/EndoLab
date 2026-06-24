import { NextResponse } from "next/server";

export async function GET() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const optional = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PRICE_ID",
    "STRIPE_WEBHOOK_SECRET",
    "ADMIN_REVIEWER_SECRET",
  ];

  const missingRequired = required.filter((name) => !process.env[name]);
  const missingOptional = optional.filter((name) => !process.env[name]);
  const healthy = missingRequired.length === 0;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "endolab",
      timestamp: new Date().toISOString(),
      configuration: {
        requiredReady: healthy,
        paymentsReady: !missingOptional.some((name) => name.startsWith("STRIPE_")),
        adminReady: !missingOptional.includes("ADMIN_REVIEWER_SECRET"),
      },
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
