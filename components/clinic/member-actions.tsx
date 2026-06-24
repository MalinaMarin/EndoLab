"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MemberActions({ membershipId, role }: { membershipId: string; role: string }) {
  const [busy, setBusy] = useState(false);

  async function update(nextRole?: string, remove = false) {
    setBusy(true);
    const response = await fetch(`/api/clinic/members/${membershipId}`, {
      method: remove ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: remove ? undefined : JSON.stringify({ role: nextRole }),
    });
    if (response.ok) window.location.reload();
    else setBusy(false);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Clinic role"
        defaultValue={role}
        disabled={busy}
        onChange={(event) => update(event.target.value)}
        className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs capitalize"
      >
        <option value="doctor">Doctor</option>
        <option value="coordinator">Coordinator</option>
      </select>
      <Button type="button" size="icon-sm" variant="destructive" disabled={busy} onClick={() => update(undefined, true)} title="Remove member">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
