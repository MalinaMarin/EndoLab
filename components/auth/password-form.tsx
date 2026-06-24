"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PasswordForm({ mode }: { mode: "forgot" | "reset" }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch(`/api/auth/${mode === "forgot" ? "forgot-password" : "reset-password"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "Request failed.");
    else if (mode === "forgot") setMessage("If that account exists, a password reset email has been sent.");
    else window.location.assign("/account");
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      {mode === "forgot" ? (
        <input name="email" type="email" required placeholder="name@clinic.org" className="h-11 w-full rounded-lg border border-slate-300 px-3" />
      ) : (
        <input name="password" type="password" minLength={10} required placeholder="New password" className="h-11 w-full rounded-lg border border-slate-300 px-3" />
      )}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Please wait..." : mode === "forgot" ? "Send reset link" : "Update password"}</Button>
      <Link href="/login" className="block text-center text-sm font-semibold text-teal-700 underline">Back to sign in</Link>
    </form>
  );
}
