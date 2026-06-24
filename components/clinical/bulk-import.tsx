"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type ImportRow = Record<string, string>;

export function BulkImport() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const toast = useToast();
  const [isImporting, setIsImporting] = useState(false);

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  function parseCsv(csvText: string) {
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new Error("CSV must include a header row and at least one case row.");
    }

    const header = lines[0].split(",").map((column) => column.trim());
    return lines.slice(1).map((line) => {
      const values = line.match(/(?:"([^"]*)"|([^,]+))/g)?.map((value) => value.replace(/^"|"$/g, "")) ?? [];
      return header.reduce<ImportRow>((acc, column, index) => {
        acc[column] = values[index] ? values[index].trim() : "";
        return acc;
      }, {});
    });
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    try {
      const parsed = parseCsv(text);
      setRows(parsed);
      toast.show({ title: "CSV loaded", message: `Loaded ${parsed.length} case records from CSV.`, type: "success" });
    } catch (parseError) {
      setRows([]);
      toast.show({ title: "CSV parse failed", message: parseError instanceof Error ? parseError.message : "Could not parse CSV file.", type: "error" });
    }
  }

  async function onImport() {
    if (rows.length === 0) {
      toast.show({ title: "No rows", message: "Upload a CSV file with case rows before importing.", type: "info" });
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cases: rows }),
      });
      const payload = (await response.json()) as { success?: boolean; imported?: number; error?: string; message?: string };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? payload.message ?? "Import failed.");
      }
      setRows([]);
      toast.show({ title: "Import complete", message: `Imported ${payload.imported ?? 0} cases successfully.`, type: "success" });
    } catch (importError) {
      toast.show({ title: "Import failed", message: importError instanceof Error ? importError.message : "Import failed.", type: "error" });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-violet-200/80 bg-white/90 p-8 shadow-[0_14px_42px_-24px_rgba(76,29,149,0.65)]">
      <div className="mb-8 space-y-4">
        <div className="inline-flex items-center gap-3 rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900">
          <Layers className="h-4 w-4" />
          Clinic data connector
        </div>
        <h1 className="text-4xl font-semibold text-violet-950">Bulk import clinical records</h1>
        <p className="max-w-2xl text-base leading-7 text-violet-900/75">
          Upload exported clinic case data from CSV and let EndoLab map symptoms, imaging, and operative notes automatically.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-violet-100 bg-violet-50/80 p-6">
          <h2 className="text-xl font-semibold text-violet-950">Supported fields</h2>
          <ul className="space-y-2 text-sm leading-7 text-violet-900/80">
            <li>title, age, country, symptoms</li>
            <li>reportText (MRI or operative note text)</li>
            <li>imaging, surgeryNotes, uncertaintyFlags, missingInfo</li>
          </ul>
          <p className="text-sm text-violet-700">Use quotes for multi-line cells. EndoLab will infer case structure from the note text.</p>
        </div>

        <div className="space-y-4 rounded-3xl border border-violet-100 bg-white p-6">
          <label className="block text-sm font-semibold text-violet-900">Upload CSV</label>
          <input type="file" accept=".csv" onChange={onFileChange} className="w-full rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900" />
          <Button type="button" size="lg" onClick={onImport} disabled={isImporting || rows.length === 0}>
            {isImporting ? "Importing..." : "Import cases"}
          </Button>
          {/* messages shown via global toasts */}
        </div>
      </div>

      {preview.length > 0 ? (
        <div className="mt-8 rounded-3xl border border-violet-100 bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-violet-950">Preview imported cases</h2>
              <p className="text-sm text-violet-700">Showing the first {preview.length} rows.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
              <Sparkles className="h-4 w-4" /> Parsed preview
            </div>
          </div>
          <div className="space-y-4">
            {preview.map((row, index) => (
              <div key={index} className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
                <p className="font-semibold">{row.title || `Case ${index + 1}`}</p>
                <p>{row.symptoms?.slice(0, 120) ?? "No symptoms provided."}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
