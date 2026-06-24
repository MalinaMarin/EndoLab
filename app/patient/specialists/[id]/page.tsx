import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, Euro, Globe2, Languages, ShieldCheck, Stethoscope, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSpecialistById, getSpecialtyLabel, specialists } from "@/lib/specialists";

export function generateStaticParams() {
  return specialists.map((specialist) => ({ id: specialist.id }));
}

export default async function SpecialistProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const specialist = getSpecialistById(id);
  if (!specialist) notFound();

  return (
    <main className="min-h-screen bg-slate-50/70">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/patient/specialists" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700"><ArrowLeft className="h-4 w-4" /> Back to specialists</Link>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <header className="rounded-lg border border-violet-200 bg-white p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-2xl font-semibold text-violet-800">{specialist.name.replace(/^(Dr\.|Prof\.)\s+/i, "").split(" ").slice(0, 2).map((part) => part[0]).join("")}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-semibold text-slate-950">{specialist.name}</h1>
                    {specialist.verified ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> Credential reviewed</span> : null}
                  </div>
                  <p className="mt-2 font-semibold text-violet-800">{specialist.clinicName}</p>
                  <p className="mt-1 text-slate-600">{specialist.location}</p>
                </div>
              </div>
              <p className="mt-6 leading-7 text-slate-700">{specialist.bio}</p>
              <div className="mt-5 flex flex-wrap gap-2">{specialist.specialties.map((item) => <span key={item} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-sm font-medium text-violet-900">{getSpecialtyLabel(item)}</span>)}</div>
            </header>

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-slate-950">Review options</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {specialist.reviewModes.map((mode) => <div key={mode} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">{mode}</div>)}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-slate-950"><UsersRound className="h-5 w-5 text-violet-700" /> Multidisciplinary team</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">{specialist.team.map((member) => <li key={member} className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {member}</li>)}</ul>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-slate-950"><ShieldCheck className="h-5 w-5 text-violet-700" /> Profile verification</h2>
              <ul className="mt-4 space-y-3">{specialist.verificationCriteria.map((item) => <li key={item} className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {item}</li>)}</ul>
              <p className="mt-4 text-xs leading-5 text-slate-500">Availability, fees, and clinical suitability must be confirmed directly by the clinic before booking.</p>
            </section>
          </div>

          <aside className="h-fit rounded-lg border border-violet-200 bg-white p-5 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold text-slate-950">Consultation overview</h2>
            <dl className="mt-5 space-y-4">
              <Signal icon={Clock3} label="Availability" value={specialist.nextAvailability} />
              <Signal icon={Euro} label="Indicative fee" value={specialist.consultationFee} />
              <Signal icon={Stethoscope} label="Experience" value={`${specialist.yearsExperience} years`} />
              <Signal icon={Languages} label="Languages" value={specialist.languages.join(", ")} />
              <Signal icon={Globe2} label="Patient access" value={specialist.internationalPatients ? "International" : "Domestic only"} />
            </dl>
            <Button asChild size="lg" className="mt-6 w-full"><Link href="/intake">Prepare my case</Link></Button>
            {specialist.website ? <Button asChild variant="outline" className="mt-3 w-full"><a href={specialist.website} target="_blank" rel="noreferrer">Visit clinic website</a></Button> : null}
          </aside>
        </div>
      </section>
    </main>
  );
}

function Signal({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" /><div><dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd></div></div>;
}
