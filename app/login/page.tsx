import { Suspense } from "react";
import { AccountForm } from "@/components/auth/account-form";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return <AccountPage title="Welcome back" description="Sign in to your private patient or clinic workspace." mode="login" />;
}

function AccountPage({ title, description, mode }: { title: string; description: string; mode: "login" | "signup" }) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-violet-50/40 px-6 py-10 md:py-16">
      <section className="mx-auto grid max-w-4xl overflow-hidden rounded-lg border border-violet-200 bg-white shadow-[0_24px_60px_-38px_rgba(76,29,149,0.65)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="purple-band p-7 text-white md:p-9">
          <ShieldCheck className="h-7 w-7" />
          <h2 className="mt-5 text-3xl font-semibold">Your health records deserve a private workspace.</h2>
          <div className="mt-7 space-y-4 text-sm text-violet-100">
            <TrustItem icon={LockKeyhole} text="Patient-owned and clinic-isolated cases" />
            <TrustItem icon={CheckCircle2} text="Human review remains part of clinical decisions" />
            <TrustItem icon={ShieldCheck} text="Private documents and account-scoped access" />
          </div>
        </div>
        <div className="p-6 md:p-9">
          <h1 className="text-3xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          <Suspense fallback={<p className="mt-6 text-sm text-slate-500">Loading account form...</p>}>
            <AccountForm mode={mode} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

function TrustItem({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return <p className="flex items-center gap-3"><Icon className="h-4 w-4 shrink-0" /> {text}</p>;
}
