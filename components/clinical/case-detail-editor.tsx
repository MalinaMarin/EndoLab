"use client";

import { useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import EditableDiseaseMap from "@/components/clinical/editable-disease-map";
import SurgeriesEditor from "@/components/clinical/surgeries-editor";
import { Button } from "@/components/ui/button";
import type { EndoCase } from "@/lib/types";

export default function CaseDetailEditor({
  item,
  canManageLifecycle = false,
  onChangeDiseaseMap,
  onChangeSurgeries,
}: {
  item: EndoCase;
  canManageLifecycle?: boolean;
  onChangeDiseaseMap?: (next: EndoCase["diseaseMap"]) => void;
  onChangeSurgeries?: (next: EndoCase["surgeries"]) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [age, setAge] = useState(String(item.patient.age ?? ""));
  const [country, setCountry] = useState(item.patient.country ?? "");
  const [symptomsText, setSymptomsText] = useState(item.symptoms.join("\n"));
  const [uncertaintyText, setUncertaintyText] = useState(item.uncertaintyFlags.join("\n"));
  const [missingInfoText, setMissingInfoText] = useState(item.missingInfo.join("\n"));
  const [diseaseMap, setDiseaseMap] = useState<EndoCase["diseaseMap"]>(item.diseaseMap);
  const [surgeries, setSurgeries] = useState<EndoCase["surgeries"]>(item.surgeries || []);
  const [isSaving, setIsSaving] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<"archive" | "restore" | "delete" | null>(null);

  async function onSave() {
    setIsSaving(true);
    try {
      if (onChangeDiseaseMap) onChangeDiseaseMap(diseaseMap);
      if (onChangeSurgeries) onChangeSurgeries(surgeries);
      const response = await fetch(`/api/cases/${item.id}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(canManageLifecycle ? {
          title,
          age,
          country,
          symptoms: splitEntries(symptomsText),
          uncertaintyFlags: splitEntries(uncertaintyText),
          missingInfo: splitEntries(missingInfoText),
          diseaseMap,
          surgeries,
        } : { diseaseMap, surgeries }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Update failed");
      toast.show({ title: "Case updated", message: "Your active case now contains the latest information.", type: "success" });
      setEditing(false);
      router.refresh();
    } catch (error) {
      if (onChangeDiseaseMap) onChangeDiseaseMap(item.diseaseMap);
      if (onChangeSurgeries) onChangeSurgeries(item.surgeries);
      toast.show({ title: "Save failed", message: error instanceof Error ? error.message : String(error), type: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  async function changeLifecycle(action: "archive" | "restore") {
    const message = action === "archive"
      ? "Archive this case? It will leave surgeon queues, but remain available in your history."
      : "Restore this case as your active journey?";
    if (!window.confirm(message)) return;
    setLifecycleAction(action);
    try {
      const response = await fetch(`/api/cases/${item.id}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycle: action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? `Could not ${action} case.`);
      toast.show({ title: action === "archive" ? "Case archived" : "Case restored", message: action === "archive" ? "You can now begin a new active journey." : "This is now your active case.", type: "success" });
      router.push("/patient/dashboard");
      router.refresh();
    } catch (error) {
      toast.show({ title: "Action failed", message: error instanceof Error ? error.message : String(error), type: "error" });
    } finally {
      setLifecycleAction(null);
    }
  }

  async function deleteCase() {
    const confirmation = window.prompt('Permanent deletion cannot be undone. Type "DELETE" to remove this case and its uploaded files.');
    if (confirmation !== "DELETE") return;
    setLifecycleAction("delete");
    try {
      const response = await fetch(`/api/cases/${item.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not delete case.");
      router.push("/patient/dashboard");
      router.refresh();
    } catch (error) {
      toast.show({ title: "Delete failed", message: error instanceof Error ? error.message : String(error), type: "error" });
      setLifecycleAction(null);
    }
  }

  function reset() {
    setTitle(item.title);
    setAge(String(item.patient.age ?? ""));
    setCountry(item.patient.country ?? "");
    setSymptomsText(item.symptoms.join("\n"));
    setUncertaintyText(item.uncertaintyFlags.join("\n"));
    setMissingInfoText(item.missingInfo.join("\n"));
    setDiseaseMap(item.diseaseMap);
    setSurgeries(item.surgeries || []);
    setEditing(false);
  }

  return (
    <section className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_10px_28px_-24px_rgba(76,29,149,0.45)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-950">{canManageLifecycle ? "Manage this case" : "Structured case data"}</h2>
            {item.archivedAt ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Archived</span> : null}
          </div>
          <p className="mt-1 text-sm text-slate-600">{canManageLifecycle ? "Keep one complete active case for specialist review; archive old clinical journeys." : "Correct the disease map or surgical history used throughout this case."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing ? <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit case</Button> : (
            <>
              <Button size="sm" onClick={onSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save changes"}</Button>
              <Button size="sm" variant="outline" onClick={reset} disabled={isSaving}>Cancel</Button>
            </>
          )}
          {canManageLifecycle && !editing ? (
            item.archivedAt ? (
              <Button size="sm" variant="outline" onClick={() => changeLifecycle("restore")} disabled={Boolean(lifecycleAction)}><RotateCcw className="h-4 w-4" /> Restore</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => changeLifecycle("archive")} disabled={Boolean(lifecycleAction)}><Archive className="h-4 w-4" /> Archive</Button>
            )
          ) : null}
          {canManageLifecycle && !editing ? <Button size="sm" variant="destructive" onClick={deleteCase} disabled={Boolean(lifecycleAction)}><Trash2 className="h-4 w-4" /> Delete</Button> : null}
        </div>
      </div>

      {editing ? (
        <div className="mt-5 space-y-5">
          {canManageLifecycle ? (
            <>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px_180px]">
                <Field label="Case title"><input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></Field>
                <Field label="Age"><input type="number" min={18} max={100} value={age} onChange={(event) => setAge(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></Field>
                <Field label="Country"><input value={country} onChange={(event) => setCountry(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 px-3" /></Field>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Field label="Symptoms and concerns"><textarea value={symptomsText} onChange={(event) => setSymptomsText(event.target.value)} className="min-h-36 w-full rounded-lg border border-slate-300 p-3" /></Field>
                <Field label="Clinical uncertainty"><textarea value={uncertaintyText} onChange={(event) => setUncertaintyText(event.target.value)} className="min-h-36 w-full rounded-lg border border-slate-300 p-3" /></Field>
                <Field label="Missing records"><textarea value={missingInfoText} onChange={(event) => setMissingInfoText(event.target.value)} className="min-h-36 w-full rounded-lg border border-slate-300 p-3" /></Field>
              </div>
            </>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><EditableDiseaseMap value={diseaseMap} onChange={setDiseaseMap} /></div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4"><SurgeriesEditor value={surgeries} onChange={setSurgeries} /></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function splitEntries(value: string) {
  return value.split(/\r?\n|,/).map((entry) => entry.trim()).filter(Boolean);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>{children}</label>;
}
