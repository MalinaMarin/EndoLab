"use client";

import Link from "next/link";
import { Archive, ArrowRight, FileHeart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { EndoCase } from "@/lib/types";

export function ActiveCaseGate({ item }: { item: EndoCase }) {
  const router = useRouter();
  const toast = useToast();
  const [archiving, setArchiving] = useState(false);

  async function archive() {
    if (!window.confirm("Archive your current case and begin a new clinical journey? The archived case will remain in your history.")) return;
    setArchiving(true);
    try {
      const response = await fetch(`/api/cases/${item.id}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycle: "archive" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not archive case.");
      router.refresh();
    } catch (error) {
      toast.show({ title: "Could not archive case", message: error instanceof Error ? error.message : String(error), type: "error" });
      setArchiving(false);
    }
  }

  return (
    <section className="rounded-lg border border-violet-200 bg-white p-6 shadow-[0_18px_44px_-34px_rgba(76,29,149,0.55)]">
      <FileHeart className="h-7 w-7 text-violet-700" />
      <h2 className="mt-4 text-2xl font-semibold text-slate-950">Continue your active case</h2>
      <p className="mt-2 leading-7 text-slate-600">
        EndoLab keeps one active case per patient so specialists receive one coherent, current clinical packet instead of duplicate submissions.
      </p>
      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="font-semibold text-slate-950">{item.title}</p>
        <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild size="lg"><Link href={`/doctor/case/${item.id}`}>Open and update case <ArrowRight className="h-4 w-4" /></Link></Button>
        <Button type="button" variant="outline" size="lg" onClick={archive} disabled={archiving}><Archive className="h-4 w-4" /> {archiving ? "Archiving..." : "Archive and start a new journey"}</Button>
      </div>
    </section>
  );
}
