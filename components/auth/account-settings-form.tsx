"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";

export function AccountSettingsForm({
  fullName,
  organizationName,
  canEditOrganization,
}: {
  fullName: string;
  organizationName?: string;
  canEditOrganization: boolean;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "Could not update account.");
    else setMessage("Account details updated.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">Full name</span>
        <input name="fullName" defaultValue={fullName} required maxLength={120} className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3" />
      </label>
      {organizationName ? (
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Clinic name</span>
          <input
            name="organizationName"
            defaultValue={organizationName}
            disabled={!canEditOrganization}
            maxLength={160}
            className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 disabled:bg-slate-100"
          />
          {!canEditOrganization ? <span className="mt-1 block text-xs text-slate-500">Only the clinic owner can rename the organization.</span> : null}
        </label>
      ) : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save changes"}</Button>
    </form>
  );
}
