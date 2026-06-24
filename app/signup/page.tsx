import { Suspense } from "react";
import { AccountForm } from "@/components/auth/account-form";
import { Building2, HeartHandshake, ShieldCheck } from "lucide-react";

export default function SignupPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-violet-50/40 px-6 py-10 md:py-16">
      <section className="mx-auto grid max-w-4xl overflow-hidden rounded-lg border border-violet-200 bg-white shadow-[0_24px_60px_-38px_rgba(76,29,149,0.65)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="purple-band p-7 text-white md:p-9">
          <ShieldCheck className="h-7 w-7" />
          <h2 className="mt-5 text-3xl font-semibold">One platform, two private care journeys.</h2>
          <div className="mt-7 space-y-5 text-sm text-violet-100">
            <p className="flex gap-3"><HeartHandshake className="mt-0.5 h-4 w-4 shrink-0" /> Patients organize records and control their own cases.</p>
            <p className="flex gap-3"><Building2 className="mt-0.5 h-4 w-4 shrink-0" /> Clinics coordinate referrals inside an isolated team workspace.</p>
          </div>
        </div>
        <div className="p-6 md:p-9">
          <h1 className="text-3xl font-semibold text-slate-950">Create your EndoLab account</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Choose your account type to start with the right workspace.</p>
          <Suspense fallback={<p className="mt-6 text-sm text-slate-500">Loading account form...</p>}>
            <AccountForm mode="signup" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
