"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import EditableDiseaseMap from "@/components/clinical/editable-disease-map";
import SurgeriesEditor from "@/components/clinical/surgeries-editor";
import { Button } from "@/components/ui/button";
import type { EndoCase } from "@/lib/types";

export default function CaseDetailEditor({
  item,
  onChangeDiseaseMap,
  onChangeSurgeries,
}: {
  item: EndoCase;
  onChangeDiseaseMap?: (next: EndoCase["diseaseMap"]) => void;
  onChangeSurgeries?: (next: EndoCase["surgeries"]) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [diseaseMap, setDiseaseMap] = useState<EndoCase["diseaseMap"]>(item.diseaseMap);
  const [surgeries, setSurgeries] = useState<EndoCase["surgeries"]>(item.surgeries || []);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  async function onSave() {
    setIsSaving(true);
    try {
      // optimistic: notify parent of updates before awaiting server
      if (onChangeDiseaseMap) onChangeDiseaseMap(diseaseMap);
      if (onChangeSurgeries) onChangeSurgeries(surgeries);
      const res = await fetch(`/api/cases/${item.id}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diseaseMap, surgeries }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Update failed");
      toast.show({ title: "Saved", message: "Saved changes.", type: "success" });
      setEditing(false);
      router.refresh();
    } catch (err) {
      // on failure, revert parent state if provided and show error toast
      if (onChangeDiseaseMap) onChangeDiseaseMap(item.diseaseMap);
      if (onChangeSurgeries) onChangeSurgeries(item.surgeries);
      toast.show({ title: "Save failed", message: err instanceof Error ? err.message : String(err), type: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  function onReset() {
    setDiseaseMap(item.diseaseMap);
    setSurgeries(item.surgeries || []);
    setEditing(false);
  }

  return (
    <section className="rounded-lg border border-violet-200 bg-white p-4 shadow-[0_10px_28px_-24px_rgba(76,29,149,0.45)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Structured case data</h2>
          <p className="mt-1 text-sm text-slate-600">Correct the disease map or surgical history used throughout this case.</p>
        </div>
        <div className="flex gap-2">
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit case structure
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={onSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={onReset} disabled={isSaving}>Cancel</Button>
            </>
          )}
        </div>
      </div>

      {/* status messages shown via global toast */}

      {editing ? (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <EditableDiseaseMap value={diseaseMap} onChange={setDiseaseMap} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <SurgeriesEditor value={surgeries} onChange={setSurgeries} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
