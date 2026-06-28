# EndoLab

EndoLab is a multi-tenant workflow product for complex endometriosis referrals. It has two connected account types:

- Clinics and doctors organize records, identify missing documentation, triage referral readiness, review structured case summaries, and route cases by specialist expertise.
- Patients prepare a second-opinion packet, understand documentation gaps, compare pilot specialist profiles, pay for a case workflow, and request a referral after confirmed payment.

EndoLab is not a diagnostic tool, emergency service, or replacement for clinician judgment.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and configure the required values.
3. Run [supabase/schema.sql](./supabase/schema.sql) in the Supabase SQL editor.
4. Configure the Stripe webhook endpoint as `/api/stripe/webhook`.
5. Start the app with `npm run dev`.

Required for account authentication and data access:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Required for paid patient cases:

```text
STRIPE_SECRET_KEY
STRIPE_PRICE_ID
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_URL
```

For local presentations without Stripe, set `ENABLE_SANDBOX_CHECKOUT=true`. This marks a patient case as paid after the checkout button is pressed so the referral journey can be demonstrated end to end. Do not enable it in a real clinic workspace.

Required for reviewer administration:

```text
ADMIN_REVIEWER_SECRET
ADMIN_AUTH_SECRET
ADMIN_EMAIL_ALLOWLIST
```

## Verification

Run `npm run check`. It executes linting, strict TypeScript, unit tests, release-policy checks, and a production build.

`GET /api/health` reports configuration readiness booleans without returning credentials.

## Security model

- Patients and clinic staff use Supabase Auth with refreshable HTTP-only sessions.
- Clinic data is isolated by organization membership and role.
- Patient cases are isolated by user ownership.
- Admin routes use a separate signed reviewer session and server-side scope checks.
- Supabase is accessed only from the server with the service-role key.
- Database tables have row-level security enabled.
- Clinical uploads and exports use private storage.
- Export downloads use short-lived signed URLs.
- Patient referrals require Stripe webhook-confirmed payment.
- Intake enforces consent, file limits, and request throttling.

This provides the core multi-tenant identity architecture. Broad public deployment still requires production email delivery, staff MFA policy, audit-log expansion, and independent security testing.

## Deployment

Before production deployment:

1. Replace development secrets with long random values.
2. Apply the Supabase schema and verify that `case-files` is private.
3. Configure and test Stripe webhooks.
4. Configure backups, monitoring without PHI, and secret rotation.
5. Replace the privacy and terms templates with counsel-approved documents.
6. Sign the required customer and vendor data agreements.

See [RELEASE_READINESS.md](./RELEASE_READINESS.md) for launch decisions and external dependencies.
