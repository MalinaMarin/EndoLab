"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, HeartHandshake, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccountForm({ mode }: { mode: "login" | "signup" }) {
  const searchParams = useSearchParams();
  const [accountType, setAccountType] = useState<"patient" | "clinic">("patient");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries());
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, accountType }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Account request failed.");
      setSubmitting(false);
      return;
    }

    if (mode === "signup" && payload.confirmationRequired) {
      setMessage("Check your email to confirm your account, then return to sign in.");
      setSubmitting(false);
      return;
    }

    const requestedNext = searchParams.get("next");
    const destination = requestedNext?.startsWith("/") ? requestedNext : payload.destination || "/account";
    window.location.assign(destination);
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      {mode === "signup" ? (
        <>
          <div>
            <p className="text-sm font-semibold text-slate-700">I am joining as</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <AccountTypeButton active={accountType === "patient"} icon={HeartHandshake} label="Patient" onClick={() => setAccountType("patient")} />
              <AccountTypeButton active={accountType === "clinic"} icon={Building2} label="Clinic staff" onClick={() => setAccountType("clinic")} />
            </div>
          </div>
          <Field name="fullName" label="Full name" icon={UserRound} autoComplete="name" />
          {accountType === "clinic" ? (
            <Field name="clinicName" label="Clinic name" icon={Building2} autoComplete="organization" />
          ) : null}
        </>
      ) : null}

      <Field name="email" label="Email" icon={Mail} type="email" autoComplete="email" />
      <Field
        name="password"
        label="Password"
        icon={LockKeyhole}
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        minLength={10}
      />

      {error ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{message}</p> : null}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
      </Button>
      {mode === "login" ? (
        <Link href="/forgot-password" className="block text-center text-sm font-semibold text-violet-700 underline">Forgot password?</Link>
      ) : null}

      <p className="text-center text-sm text-slate-600">
        {mode === "login" ? "New to EndoLab?" : "Already have an account?"}{" "}
        <Link href={mode === "login" ? "/signup" : "/login"} className="font-semibold text-violet-700 underline">
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}

function AccountTypeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Building2;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-semibold ${
        active ? "border-violet-600 bg-violet-50 text-violet-950" : "border-slate-300 bg-white text-slate-700"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function Field({
  label,
  icon: Icon,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon: typeof Mail }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="relative mt-2 block">
        <Icon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
        <input {...props} required className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm" />
      </span>
    </label>
  );
}
