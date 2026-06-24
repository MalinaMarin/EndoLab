"use client";

import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InviteMemberForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/clinic/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "Could not create invitation.");
    else {
      setMessage(payload.joinedImmediately ? "Existing clinic user added to the workspace." : "Invitation recorded. The teammate can create a clinic account with that email to join this workspace.");
      event.currentTarget.reset();
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
      <input name="email" type="email" required placeholder="teammate@clinic.com" className="h-11 rounded-lg border border-slate-300 px-3 text-sm" />
      <select name="role" className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm">
        <option value="doctor">Doctor</option>
        <option value="coordinator">Coordinator</option>
      </select>
      <Button type="submit" disabled={submitting}>
        <UserPlus className="h-4 w-4" /> {submitting ? "Inviting..." : "Invite"}
      </Button>
      {error ? <p className="text-sm text-rose-700 sm:col-span-3">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700 sm:col-span-3">{message}</p> : null}
    </form>
  );
}
