# EndoLab Release Readiness

## Product boundary

Sell EndoLab first as a clinic referral-operations product:

- structured intake and record normalization
- missing-record coordination
- referral-readiness workflow
- clinician-readable case briefs
- reviewed extraction and audit trails
- explainable specialist-fit routing

The patient experience should be a controlled intake and second-opinion channel feeding the same clinic workflow. It should not begin as an open marketplace with unverified professionals or opaque rankings.

## Monetization

### Primary: clinic subscription

- Starter: one center, limited active cases, CSV intake, workflow dashboard
- Growth: multiple coordinators, reviewed extraction, private exports, analytics
- Enterprise: SSO, roles, FHIR/HL7 integration, regional hosting, audit export, onboarding

Price around coordinator time saved, shorter time to consult, fewer incomplete referrals, and greater specialist throughput. Validate pricing through paid design partners before publishing fixed tiers.

### Secondary: patient case fee

Charge for a defined service such as case organization plus a verified specialist review. Do not charge merely for an automated score. Separate the platform fee from the clinician fee and define refunds and cancellations.

### Avoid initially

- paid placement in specialist rankings
- opaque referral commissions
- selling or advertising against health data
- claims that EndoLab diagnoses, detects MRI disease, selects treatment, or guarantees surgeon quality

## External blockers before public launch

These cannot be completed inside the repository:

- legal entity, governing law, support contact, and insurance
- clinician-designed validation protocol and documented intended use
- GDPR lawful-basis analysis, DPIA, retention schedule, rights process, and processor agreements
- HIPAA/business-associate analysis and vendor BAAs for applicable US clinic customers
- medical-device regulatory assessment for each jurisdiction and product claim
- specialist credentialing and commercial agreements
- production database migration, backups, regional hosting, and recovery testing
- Stripe products, webhook secret, taxes, refunds, and reconciliation
- production email delivery, MFA enforcement, and enterprise SSO configuration
- a live FHIR/HL7 integration; the current EMR connector is demonstrative

## Lawful AI boundary

EndoLab should introduce intelligence in this order:

1. Explainable, deterministic assistance: confidence, evidence links, record-gap detection, specialist-fit rationale, and human-review triggers.
2. Human-reviewed extraction: every structured clinical field must be traceable to source text or reviewer correction.
3. Contracted AI vendors only when a data-processing agreement, regional hosting, retention policy, and audit logging are in place.
4. Validated clinical claims only after clinician-designed validation and regulatory assessment.

Do not launch features that diagnose endometriosis, detect disease directly from MRI images, choose treatment, autonomously prioritize care, or guarantee surgeon quality unless the intended use, evidence, contracts, and regulatory pathway explicitly support those claims.

## Pilot-ready definition

- contracted clinic or closed cohort
- controlled registration or invitation policy
- private storage and applied database schema
- Stripe webhook verification
- named privacy contact and signed customer data terms
- clinician review of generated clinical output
- documented incident response and deletion procedure
- monitoring that excludes medical record content

## Public-ready definition

Before broad public launch, add staff MFA enforcement, enterprise SSO, automated invitation email delivery, richer audit logs, account deletion/export workflows, and independent penetration testing.
