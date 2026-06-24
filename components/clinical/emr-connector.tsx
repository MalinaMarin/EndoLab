"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { AlertTriangle, Database, Download, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmrRecord = {
  id: string;
  patientName: string;
  mrn: string;
  age: number;
  country: string;
  diagnosis: string;
  summary: string;
  lastUpdated: string;
  sourceSystem: string;
};

export function EmrConnectorAlpha() {
  const [records, setRecords] = useState<EmrRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const connected = records.length > 0;
  const selectedCount = selectedIds.length;
  const allSelected = records.length > 0 && selectedIds.length === records.length;

  const connectionSummary = useMemo(() => {
    if (!connected) return "Connect to your EMR source to fetch import-ready cases.";
    return `Connected to demo EMR alpha. ${records.length} records available.`;
  }, [connected, records.length]);

  const loadRecords = useCallback(async function loadRecords() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/emr/records");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to fetch EMR records.");
      }
      setRecords(payload.records ?? []);
      setSelectedIds([]);
      toast.show({ title: "EMR loaded", message: `Loaded ${payload.records?.length ?? 0} demo EMR records.`, type: "success" });
    } catch (fetchError) {
      setRecords([]);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load EMR records.");
      toast.show({ title: "EMR load failed", message: fetchError instanceof Error ? fetchError.message : "Failed to load EMR records.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  async function handleImport() {
    if (selectedIds.length === 0) {
      toast.show({ title: "No selection", message: "Select at least one EMR patient record before importing.", type: "info" });
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch("/api/emr/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? payload.message ?? "EMR import failed.");
      }
      setRecords([]);
      setSelectedIds([]);
      toast.show({ title: "EMR import", message: `Imported ${payload.imported ?? 0} cases successfully from EMR.`, type: "success" });
    } catch (importError) {
      toast.show({ title: "Import failed", message: importError instanceof Error ? importError.message : "Import failed.", type: "error" });
    } finally {
      setIsImporting(false);
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleSelectAll() {
    setSelectedIds(allSelected ? [] : records.map((record) => record.id));
  }

  return (
    <div className="rounded-3xl border border-violet-200/80 bg-white/90 p-8 shadow-[0_14px_42px_-24px_rgba(76,29,149,0.65)]">
      <div className="mb-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-900">
            <Database className="h-4 w-4" />
            EMR connector alpha
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-violet-950">Direct EMR import prototype</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-violet-900/80">
            Simulate a live EMR connection and import selected patient summaries directly into EndoLab. This alpha connector demonstrates how clinic data can be pulled from a source system and turned into structured cases.
          </p>
        </div>

        <div className="space-y-3 rounded-3xl border border-violet-100 bg-violet-50 p-5">
          <p className="text-sm uppercase tracking-[0.24em] text-violet-700">Connection status</p>
          <div className="flex items-center gap-2 text-base font-semibold text-violet-950">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>{connected ? "Connected to Demo EMR Alpha" : "Connecting…"}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-violet-700">{connectionSummary}</p>
          <Button variant="secondary" size="sm" type="button" onClick={loadRecords} disabled={isLoading}>
            {isLoading ? "Refreshing…" : "Refresh records"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6 rounded-3xl border border-violet-100 bg-violet-50/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">Patient records</p>
              <p className="mt-2 text-sm text-violet-700">Select one or more records from the EMR export preview.</p>
            </div>
            <Button variant="outline" size="sm" type="button" onClick={toggleSelectAll} disabled={!connected || records.length === 0}>
              {allSelected ? "Unselect all" : "Select all"}
            </Button>
          </div>

          {isLoading ? (
            <div className="rounded-3xl border border-violet-200 bg-white p-6 text-center text-violet-700">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
              Loading EMR records…
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              <AlertTriangle className="inline-block h-4 w-4 mr-2" /> {error}
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-3xl border border-violet-200 bg-white p-6 text-violet-700">No EMR records available yet.</div>
          ) : (
            <div className="space-y-3">
              {records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => toggleSelection(record.id)}
                  className={`w-full rounded-3xl border p-4 text-left transition ${
                    selectedIds.includes(record.id)
                      ? "border-violet-500 bg-violet-100"
                      : "border-violet-200 bg-white hover:border-violet-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-violet-950">{record.patientName}</p>
                      <p className="mt-1 text-sm text-violet-700">{record.diagnosis}</p>
                    </div>
                    <div className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-800">
                      {record.mrn}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="text-sm text-violet-700">Age: {record.age}</div>
                    <div className="text-sm text-violet-700">Country: {record.country}</div>
                    <div className="text-sm text-violet-700">Updated: {new Date(record.lastUpdated).toLocaleDateString()}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6 rounded-3xl border border-violet-100 bg-white p-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-violet-700">Import control</p>
            <p className="text-sm text-violet-900/80">Selected records: {selectedCount}</p>
          </div>

          <Button type="button" size="lg" onClick={handleImport} disabled={isImporting || selectedCount === 0}>
            {isImporting ? "Importing…" : "Import selected records"}
          </Button>

          <div className="rounded-3xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-700">
            <p className="font-semibold text-violet-950">Alpha note</p>
            <p className="mt-2 leading-6">
              This prototype uses a demo EMR feed. The next step is to swap the provider endpoint for a live FHIR or HL7 extraction connector.
            </p>
          </div>

          {/* messages shown via global toast */}

          <div className="rounded-3xl border border-violet-100 bg-violet-50 p-4 text-sm text-violet-700">
            <p className="font-semibold">Import preview</p>
            <p className="mt-2">Selected records will be converted into EndoLab cases using EMR summary text and clinical note extraction.</p>
          </div>
        </aside>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-violet-700">
        <Download className="h-4 w-4" />
        <span>Imported cases appear in the doctor inbox as structured referrals once the EMR connector completes.</span>
      </div>
    </div>
  );
}
