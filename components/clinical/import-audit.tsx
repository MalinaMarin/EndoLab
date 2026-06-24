"use client";

import React, { useState } from "react";

export default function ImportAudit({ audit, onChange, originalRows, originalHeaders, mapping }: { audit: any; onChange?: (a: any) => void; originalRows?: any[]; originalHeaders?: string[]; mapping?: Record<string,string> }) {
  const [localAudit, setLocalAudit] = useState<any>(audit);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [validationResult, setValidationResult] = useState<any | null>(null);

  if (!localAudit) return null;

  function startEdit(idx: number) {
    setEditingIndex(idx);
    const row = localAudit.perRow[idx];
    setEditValue(row.reportTextPreview ?? "");
  }

  function saveEdit() {
    if (editingIndex === null) return;
    const next = { ...localAudit };
    next.perRow = next.perRow.map((r: any, i: number) => (i === editingIndex ? { ...r, reportTextPreview: editValue } : r));
    setLocalAudit(next);
    setEditingIndex(null);
    setEditValue("");
    onChange?.(next);
  }

  async function saveAuditToServer() {
    try {
      if (localAudit?.id) {
        const res = await fetch(`/api/import/audit/${localAudit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audit: localAudit, name: localAudit.name ?? `Import audit ${new Date().toISOString()}` }),
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error(payload.error ?? payload.message ?? "Update failed");
        setLocalAudit(payload.audit ?? localAudit);
        alert("Audit updated.");
      } else {
        const res = await fetch("/api/import/save-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: `Import audit ${new Date().toISOString()}`, audit: localAudit, originalHeaders: originalHeaders ?? [], createdBy: null }),
        });
        const payload = await res.json();
        if (!res.ok || !payload.success) throw new Error(payload.error ?? payload.message ?? "Save failed");
        const updated = { ...localAudit, id: payload.id };
        setLocalAudit(updated);
        alert("Audit saved (id: " + payload.id + ")");
      }
    } catch (err) {
      alert("Failed to save audit: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function saveDraftsToServer() {
    if (!localAudit?.id) {
      alert("Save the audit first before saving draft rows.");
      return;
    }

    try {
      const drafts = localAudit.perRow.map((row: any) => ({
        rowIndex: row.index,
        draftPayload: {
          reportText: row.reportTextPreview,
          title: row.title,
          suggestedSeverity: row.suggestedSeverity,
          warnings: row.warnings,
          decision: row.decision ?? null,
        },
        decision: row.decision ?? null,
      }));

      const res = await fetch(`/api/import/audit/${localAudit.id}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drafts }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error ?? payload.message ?? "Draft save failed");
      alert("Draft rows saved.");
    } catch (err) {
      alert("Failed to save drafts: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  function setDecisionForAll(decision: string | null) {
    const next = { ...localAudit };
    next.perRow = next.perRow.map((r: any) => ({ ...r, decision }));
    setLocalAudit(next);
    onChange?.(next);
  }

  function toggleDecision(index: number, decision: string) {
    const next = { ...localAudit };
    next.perRow = next.perRow.map((r: any) =>
      r.index === index ? { ...r, decision: r.decision === decision ? null : decision } : r,
    );
    setLocalAudit(next);
    onChange?.(next);
  }

  async function rerunValidation() {
    try {
      // build mapped rows from originalRows + mapping + perRow edits
      const mapped = buildMappedRows(originalRows ?? [], mapping ?? {}, localAudit.perRow ?? []);
      const res = await fetch("/api/import/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cases: mapped }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? payload.message ?? "Validation failed");
      setValidationResult(payload);
      alert(payload.success ? "Validation passed." : `Validation found ${payload.errors.length} errors.`);
    } catch (err) {
      alert("Validation failed: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  function buildMappedRows(original: any[], mapping: Record<string,string>, perRowEdits: any[]) {
    return original.map((r, idx) => {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(mapping)) {
        if (!v || v === "(ignore)") continue;
        out[v] = r[k];
      }
      const edit = perRowEdits?.[idx];
      if (edit?.reportTextPreview) out.reportText = edit.reportTextPreview;
      return out;
    });
  }

  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-violet-950">Audit summary</h3>
          <p className="mt-2 text-sm text-violet-700">{localAudit.summary.totalRows} rows analyzed — {localAudit.summary.rowsWithWarnings} rows with warnings.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={saveAuditToServer} className="rounded-full bg-violet-900 px-3 py-1 text-sm font-semibold text-white">Save audit</button>
          <button onClick={saveDraftsToServer} className="rounded-full bg-violet-900/80 px-3 py-1 text-sm font-semibold text-white">Save drafts</button>
          <button onClick={rerunValidation} className="rounded-full border px-3 py-1 text-sm">Re-run validation</button>
          <button onClick={() => setDecisionForAll("accepted")} className="rounded-full border px-3 py-1 text-sm">Accept all</button>
          <button onClick={() => setDecisionForAll("rejected")} className="rounded-full border px-3 py-1 text-sm">Reject all</button>
          <button onClick={() => setDecisionForAll(null)} className="rounded-full border px-3 py-1 text-sm">Clear decisions</button>
        </div>
      </div>

      {validationResult ? (
        <div className={`mt-4 rounded-xl border p-3 text-sm ${validationResult.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {validationResult.success
            ? "Validation passed."
            : `Validation found ${validationResult.errors?.length ?? 0} row issue(s).`}
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        {localAudit.perRow.map((r: any) => (
          <div key={r.index} className="rounded-2xl border p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-violet-950">Row {r.index + 1} — {r.title || "(no title)"}</p>
                  {r.decision ? (
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${r.decision === "accepted" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                      {r.decision}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-violet-700">Severity suggestion: {r.suggestedSeverity}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => startEdit(r.index)} className="text-sm text-violet-700">Edit</button>
                <button onClick={() => toggleDecision(r.index, "accepted")} className="rounded-full border px-3 py-1 text-sm">Accept</button>
                <button onClick={() => toggleDecision(r.index, "rejected")} className="rounded-full border px-3 py-1 text-sm">Reject</button>
              </div>
            </div>
            {r.warnings && r.warnings.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-rose-700">
                {r.warnings.map((w: string, i: number) => (<li key={i}>{w}</li>))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-emerald-700">No issues found for this row.</p>
            )}
            {editingIndex === r.index ? (
              <div className="mt-3">
                <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full rounded-lg border p-2" rows={6} />
                <div className="mt-2 flex gap-2">
                  <button onClick={saveEdit} className="rounded-full bg-violet-900 px-3 py-1 text-sm font-semibold text-white">Save</button>
                  <button onClick={() => setEditingIndex(null)} className="rounded-full border px-3 py-1 text-sm">Cancel</button>
                </div>
              </div>
            ) : r.reportTextPreview ? (
              <details className="mt-3 text-sm text-violet-700"><summary className="cursor-pointer">Note preview</summary><div className="mt-2 whitespace-pre-wrap">{r.reportTextPreview}</div></details>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
