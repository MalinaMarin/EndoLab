const sections = [
  ["What EndoLab processes", "Case titles, symptoms, clinical report text, uploaded medical documents, structured findings, referral activity, and limited technical logs needed to operate the service."],
  ["Why it is processed", "To organize a submitted case, identify documentation gaps, prepare specialist review, operate referrals, prevent abuse, and improve reviewed extraction workflows where separately authorized."],
  ["Health data", "Health information is sensitive data. EndoLab requires authorization from the person submitting it and does not sell health records or use them for advertising."],
  ["Storage and access", "Clinical files are intended to be stored in private object storage. Access is limited to authorized pilot users and reviewers. Production deployment must use vendor agreements, encryption, backups, audit logging, and regional hosting appropriate to the customer."],
  ["Retention and rights", "Pilot customers must define a retention schedule. People may request access, correction, export, restriction, or deletion where applicable by contacting the service operator identified in the deployed product."],
  ["Automated processing", "EndoLab structures records and produces readiness guidance. Outputs require human review and are not used as the sole basis for diagnosis, treatment, eligibility, or emergency decisions."],
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Privacy notice template</p>
      <h1 className="mt-3 text-4xl font-semibold text-slate-950">How EndoLab handles health information</h1>
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        This is a product-ready template, not jurisdiction-specific legal advice. Before public launch, add the legal entity, contact details, subprocessors, hosting region, retention periods, lawful bases, and complaint authority reviewed by counsel.
      </p>
      <div className="mt-8 space-y-7">
        {sections.map(([title, body]) => (
          <section key={title}>
            <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 leading-7 text-slate-700">{body}</p>
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm text-slate-500">Version: June 23, 2026</p>
    </main>
  );
}
