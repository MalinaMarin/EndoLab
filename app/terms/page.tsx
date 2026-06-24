export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Terms template</p>
      <h1 className="mt-3 text-4xl font-semibold text-slate-950">EndoLab pilot terms</h1>
      <div className="mt-8 space-y-7 text-slate-700">
        <Term title="Service scope">EndoLab is a record-organization, workflow, and specialist-review preparation service. It is not a medical provider, emergency service, insurer, or substitute for professional judgment.</Term>
        <Term title="No diagnosis">Automated extraction, severity labels, referral readiness, specialist matching, and suggested next steps are informational workflow outputs that require qualified human review.</Term>
        <Term title="Authorized submissions">Users must have authority to submit every record and must not upload records belonging to another person without a valid legal basis and permission.</Term>
        <Term title="Clinical responsibility">Clinicians and clinics remain responsible for diagnosis, treatment, referral decisions, record accuracy, informed consent, and compliance with professional obligations.</Term>
        <Term title="Pilot availability">The pilot may change, suspend integrations, or correct outputs. Service levels, support, liability allocation, data processing terms, and business-associate terms must be set in customer contracts before paid clinic deployment.</Term>
        <Term title="Emergency warning">EndoLab must not be used for urgent or emergency symptoms. Users should contact local emergency services or a qualified clinician.</Term>
      </div>
      <p className="mt-10 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Before launch, replace this template with counsel-approved terms naming the operating legal entity and governing law.
      </p>
    </main>
  );
}

function Term({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 leading-7">{children}</p>
    </section>
  );
}
