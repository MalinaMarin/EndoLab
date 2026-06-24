"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bookmark,
  Check,
  CheckCircle2,
  Clock3,
  Euro,
  Globe2,
  Languages,
  Scale,
  Search,
  Stethoscope,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSpecialtyLabel, specialists } from "@/lib/specialists";

const specialties = Array.from(new Set(specialists.flatMap((specialist) => specialist.specialties))).sort();
const countries = Array.from(new Set(specialists.map((specialist) => specialist.country))).sort();
const SAVED_KEY = "endolab-saved-specialists";

export function SpecialistMarketplace() {
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [country, setCountry] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [saved, setSaved] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);

  useEffect(() => {
    try {
      setSaved(JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "[]"));
    } catch {
      window.localStorage.removeItem(SAVED_KEY);
    }
  }, []);

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return specialists.filter((specialist) => {
      const matchesQuery =
        !normalizedQuery ||
        specialist.name.toLowerCase().includes(normalizedQuery) ||
        specialist.location.toLowerCase().includes(normalizedQuery) ||
        specialist.clinicName.toLowerCase().includes(normalizedQuery) ||
        specialist.specialties.some((item) => getSpecialtyLabel(item).toLowerCase().includes(normalizedQuery));
      return matchesQuery &&
        (specialty === "all" || specialist.specialties.includes(specialty)) &&
        (country === "all" || specialist.country === country) &&
        (!verifiedOnly || specialist.verified);
    });
  }, [country, query, specialty, verifiedOnly]);

  function toggleSaved(id: string) {
    setSaved((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      return next;
    });
  }

  function toggleCompare(id: string) {
    setCompare((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return current.length < 3 ? [...current, id] : current;
    });
  }

  const compared = compare.map((id) => specialists.find((item) => item.id === id)).filter(Boolean);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold text-slate-950">Find the right review</h2>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Search</span>
            <span className="relative mt-2 block">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, clinic, expertise" className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm" />
            </span>
          </label>
          <FilterSelect label="Expertise" value={specialty} onChange={setSpecialty}>
            <option value="all">All expertise</option>
            {specialties.map((item) => <option key={item} value={item}>{getSpecialtyLabel(item)}</option>)}
          </FilterSelect>
          <FilterSelect label="Country" value={country} onChange={setCountry}>
            <option value="all">All countries</option>
            {countries.map((item) => <option key={item}>{item}</option>)}
          </FilterSelect>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} className="h-4 w-4 accent-violet-700" />
            Credential-reviewed only
          </label>
          <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
            Saved profiles stay on this device. Select up to three profiles for side-by-side comparison.
          </p>
        </div>
      </aside>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-700">{matches.length} matching specialists</p>
            <p className="mt-1 text-sm text-slate-600">Compare clinical fit before preparing a case request.</p>
          </div>
          <Button asChild variant="outline"><Link href="/intake">Build case first</Link></Button>
        </div>

        {compared.length ? (
          <div className="mb-5 overflow-x-auto rounded-lg border border-violet-200 bg-violet-50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 font-semibold text-violet-950"><Scale className="h-4 w-4" /> Comparing {compared.length} of 3</p>
              <button type="button" onClick={() => setCompare([])} className="text-sm font-semibold text-violet-700">Clear</button>
            </div>
            <div className="grid min-w-[620px] gap-3" style={{ gridTemplateColumns: `repeat(${compared.length}, minmax(190px, 1fr))` }}>
              {compared.map((specialist) => specialist ? (
                <div key={specialist.id} className="rounded-lg border border-violet-200 bg-white p-3">
                  <div className="flex justify-between gap-2">
                    <p className="font-semibold text-slate-950">{specialist.name}</p>
                    <button type="button" aria-label={`Remove ${specialist.name} from comparison`} onClick={() => toggleCompare(specialist.id)}><X className="h-4 w-4 text-slate-500" /></button>
                  </div>
                  <dl className="mt-3 space-y-2 text-xs">
                    <Comparison label="Experience" value={`${specialist.yearsExperience} years`} />
                    <Comparison label="Fee" value={specialist.consultationFee} />
                    <Comparison label="Availability" value={specialist.nextAvailability} />
                    <Comparison label="Response" value={specialist.responseWindow} />
                  </dl>
                </div>
              ) : null)}
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {matches.map((specialist) => {
            const isSaved = saved.includes(specialist.id);
            const isCompared = compare.includes(specialist.id);
            return (
              <article key={specialist.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.5)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-100 font-semibold text-violet-800">{initials(specialist.name)}</span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-semibold text-slate-950">{specialist.name}</h3>
                        {specialist.verified ? <span title="Medical registration, clinic affiliation, and clinical focus reviewed" className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" /> Credential reviewed</span> : <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Verification in progress</span>}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-700">{specialist.clinicName}</p>
                      <p className="mt-1 text-sm text-slate-500">{specialist.location}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => toggleSaved(specialist.id)} aria-pressed={isSaved} className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${isSaved ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-200 text-slate-600"}`}><Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} /> {isSaved ? "Saved" : "Save"}</button>
                    <button type="button" onClick={() => toggleCompare(specialist.id)} aria-pressed={isCompared} disabled={!isCompared && compare.length >= 3} className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold disabled:opacity-40 ${isCompared ? "border-violet-700 bg-violet-700 text-white" : "border-slate-200 text-slate-600"}`}><Check className="h-4 w-4" /> Compare</button>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-700">{specialist.bio}</p>
                <div className="mt-4 flex flex-wrap gap-2">{specialist.specialties.map((item) => <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">{getSpecialtyLabel(item)}</span>)}</div>

                <div className="mt-5 grid gap-3 border-y border-slate-100 py-4 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                  <ProfileSignal icon={Clock3} text={specialist.nextAvailability} />
                  <ProfileSignal icon={Euro} text={specialist.consultationFee} />
                  <ProfileSignal icon={Video} text={specialist.reviewModes.join(", ")} />
                  <ProfileSignal icon={Languages} text={specialist.languages.join(", ")} />
                  <ProfileSignal icon={Stethoscope} text={`${specialist.yearsExperience} years experience`} />
                  <ProfileSignal icon={Globe2} text={specialist.internationalPatients ? "International patients" : "Domestic patients"} />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button asChild variant="outline"><Link href={`/patient/specialists/${specialist.id}`}>View detailed profile</Link></Button>
                  {specialist.acceptingCases ? <Button asChild><Link href="/intake"><Stethoscope className="h-4 w-4" /> Prepare request</Link></Button> : <Button type="button" disabled>Currently waitlisted</Button>}
                </div>
              </article>
            );
          })}
          {matches.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center"><h3 className="text-lg font-semibold text-slate-950">No exact match yet</h3><p className="mt-2 text-sm text-slate-600">Broaden the filters or prepare a case so EndoLab can route it by clinical fit.</p></div> : null}
        </div>
      </section>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm font-semibold text-slate-700">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">{children}</select></label>;
}

function ProfileSignal({ icon: Icon, text }: { icon: typeof Clock3; text: string }) {
  return <div className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" /><span>{text}</span></div>;
}

function Comparison({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="font-semibold text-slate-800">{value}</dd></div>;
}

function initials(name: string) {
  return name.replace(/^(Dr\.|Prof\.)\s+/i, "").split(" ").slice(0, 2).map((part) => part[0]).join("");
}
