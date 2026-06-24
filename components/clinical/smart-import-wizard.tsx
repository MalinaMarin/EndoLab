"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import ImportAudit from "./import-audit";
import FieldMapper from "./field-mapper";

type ImportRow = Record<string, string>;

type ImportAuditPayload = {
  success?: boolean;
  summary: {
    rowsWithWarnings: number;
  };
  perRow?: {
    decision?: string;
    reportTextPreview?: string;
  }[];
  error?: string;
  message?: string;
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());
  return cells;
}

function parseCsv(csvText: string): ImportRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) throw new Error("CSV must include a header row and at least one case row.");

  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: ImportRow = {};
    header.forEach((col, i) => {
      row[col] = values[i] ? String(values[i]).trim() : "";
    });
    return row;
  });
}

export function SmartImportWizard() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [audit, setAudit] = useState<ImportAuditPayload | null>(null);
  const [excludedCount, setExcludedCount] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const toast = useToast();

  const preview = useMemo(() => rows.slice(0, 5), [rows]);
  const headers = useMemo(() => (rows.length > 0 ? Object.keys(rows[0]) : []), [rows]);
  const [mapping, setMapping] = useState<Record<string, string>>(() => ({}));

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAudit(null);
    setExcludedCount(0);
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = parseCsv(text);
        setRows(parsed);
        toast.show({ title: "CSV loaded", message: `Loaded ${parsed.length} rows.`, type: "success" });
      } catch (err) {
        toast.show({ title: "CSV parse failed", message: err instanceof Error ? err.message : String(err), type: "error" });
        setRows([]);
      }
    });
  }

  async function runAudit() {
    if (rows.length === 0) {
      toast.show({ title: "No rows", message: "No rows to audit. Upload a CSV first.", type: "info" });
      return;
    }
    setIsAnalyzing(true);
    try {
      // apply mapping to rows before auditing
      const mapped = applyMappingToRows(rows, mapping);
      const res = await fetch("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cases: mapped }),
      });
      const payload = (await res.json()) as ImportAuditPayload;
      if (!res.ok || !payload.success) throw new Error(payload.error ?? payload.message ?? "Audit failed");
      setAudit(payload);
      toast.show({ title: "Analysis complete", message: `Analysis complete: ${payload.summary.rowsWithWarnings} rows with warnings.`, type: "success" });
    } catch (err) {
      toast.show({ title: "Audit failed", message: err instanceof Error ? err.message : String(err), type: "error" });
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function performImport() {
    if (rows.length === 0) {
      toast.show({ title: "No rows", message: "No rows to import.", type: "info" });
      return;
    }
    setIsImporting(true);
    setExcludedCount(0);
    try {
      // apply mapping and incorporate any audit edits into the payload
      let mapped = applyMappingToRows(rows, mapping);
      const auditedRows = audit?.perRow;
      if (Array.isArray(auditedRows)) {
        mapped = mapped.map((m, idx) => {
          const edit = auditedRows[idx];
          if (!edit) return m;
          if (edit.reportTextPreview) {
            return { ...m, reportText: edit.reportTextPreview };
          }
          return m;
        });
      }

      const importRows = mapped.filter((m, idx) => {
        const decision = audit?.perRow?.[idx]?.decision;
        return decision !== "rejected";
      });
      setExcludedCount(mapped.length - importRows.length);

      if (importRows.length === 0) {
        toast.show({ title: "No importable rows", message: "All rows were rejected during audit. No cases to import.", type: "info" });
        setIsImporting(false);
        return;
      }

      // run server-side validation before import
      const validateRes = await fetch("/api/import/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cases: importRows }),
      });
      const validatePayload = await validateRes.json();
      if (!validateRes.ok || !validatePayload.success) {
        const firstErr = validatePayload.errors && validatePayload.errors.length > 0 ? validatePayload.errors[0] : null;
        toast.show({ title: "Validation failed", message: `Validation failed: ${firstErr ? firstErr.errors.join(", ") : validatePayload.error ?? "Unknown"}`, type: "error" });
        setIsImporting(false);
        return;
      }

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cases: importRows }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error ?? payload.message ?? "Import failed");
      toast.show({ title: "Import complete", message: `Imported ${payload.imported ?? 0} cases.`, type: "success" });
      setRows([]);
      setAudit(null);
    } catch (err) {
      toast.show({ title: "Import failed", message: err instanceof Error ? err.message : String(err), type: "error" });
    } finally {
      setIsImporting(false);
    }
  }

  function applyMappingToRows(rows: ImportRow[], mapping: Record<string, string>) {
    if (!mapping || Object.keys(mapping).length === 0) return rows;
    return rows.map((r) => {
      const out: ImportRow = {};
      for (const [k, v] of Object.entries(mapping)) {
        if (!v || v === "(ignore)") continue;
        out[v] = r[k];
      }
      return out;
    });
  }

  function handleAuditChange(next: ImportAuditPayload) {
    setAudit(next);
  }

  function downloadMappedCsv(originalRows: ImportRow[], mapping: Record<string,string>, auditObj: ImportAuditPayload) {
    const mapped = applyMappingToRows(originalRows, mapping).map((m, idx) => {
      const edit = auditObj?.perRow?.[idx];
      if (edit?.reportTextPreview) m.reportText = edit.reportTextPreview;
      return m;
    });

    if (!mapped || mapped.length === 0) return;
    const headers = Array.from(new Set(mapped.flatMap((r) => Object.keys(r))));
    const csv = [headers.join(',')]
      .concat(
        mapped.map((r) => headers.map((h) => {
          const v = r[h] ?? "";
          const cell = String(v).replace(/"/g, '""');
          return `"${cell}"`;
        }).join(','))
      ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapped-import-${new Date().toISOString().slice(0,19)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-3xl border border-violet-200/80 bg-white/90 p-8 shadow-[0_14px_42px_-24px_rgba(76,29,149,0.65)]">
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold text-violet-950">Smart import wizard</h2>
          <p className="mt-2 text-sm text-violet-700">Upload CSV, run an automated audit, and import validated cases into EndoLab.</p>
        </div>
        <div className="space-y-2">
          <input type="file" accept=".csv" onChange={onFileChange} className="w-full rounded-xl border p-2" />
          <div className="flex gap-2">
            <Button onClick={runAudit} disabled={isAnalyzing || rows.length === 0}>
              {isAnalyzing ? "Analyzing..." : "Run audit"}
            </Button>
            <Button variant="outline" onClick={performImport} disabled={isImporting || rows.length === 0}>
              {isImporting ? "Importing..." : "Import now"}
            </Button>
          </div>
        </div>
      </div>

      {/* status shown via toasts */}
      {excludedCount > 0 ? (
        <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">
          {excludedCount} row{excludedCount === 1 ? "" : "s"} were excluded from import because they were rejected during audit.
        </p>
      ) : null}
      {/* errors shown via toasts */}

      {headers.length > 0 ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <FieldMapper headers={headers} mapping={mapping} setMapping={setMapping} />
          </div>
          <div>
            <div className="rounded-3xl border border-violet-100 bg-white p-4">
              <h3 className="font-semibold">Detected headers</h3>
              <p className="mt-2 text-sm text-violet-700">{headers.join(", ")}</p>
            </div>
          </div>
        </div>
      ) : null}

      {preview.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <h3 className="font-semibold">Preview</h3>
          <div className="mt-3 space-y-3">
            {preview.map((r, i) => (
              <div key={i} className="rounded-xl border p-3 bg-white">
                <p className="font-semibold text-sm">{r.title || `Row ${i + 1}`}</p>
                <p className="text-sm text-violet-700">{(r.reportText ?? r.symptoms ?? "").toString().slice(0, 160)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {audit ? (
        <div className="mt-6">
          <div className="flex items-center justify-end gap-2 mb-4">
            <Button onClick={() => downloadMappedCsv(rows, mapping, audit)} size="sm">Download mapped CSV</Button>
          </div>
          <ImportAudit audit={audit} onChange={handleAuditChange} originalRows={rows} originalHeaders={headers} mapping={mapping} />
        </div>
      ) : null}
    </div>
  );
}
