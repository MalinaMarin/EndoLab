"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function ExportTrigger() {
  const [isRunning, setIsRunning] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [deidentify, setDeidentify] = useState(true);
  const toast = useToast();
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!jobId) return;
    setIsRunning(true);
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/export/status/${jobId}`);
        const payload = await res.json();
        if (!res.ok || !payload.success) return;
        const job = payload.job;
        if (!job) return;
        if (job.status === "success") {
          if (cancelled) return;
          setUrl(job.public_url ?? null);
          toast.show({ title: "Export ready", message: "Export is available.", type: "success" });
          setJobId(null);
          setIsRunning(false);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        } else if (job.status === "failure") {
          if (cancelled) return;
          toast.show({ title: "Export failed", message: job.error ?? "Export job failed", type: "error" });
          setJobId(null);
          setIsRunning(false);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        }
      } catch {
        // ignore transient errors; worker may not have updated yet
      }
    };

    // immediate poll and then interval
    poll();
    pollRef.current = window.setInterval(poll, 2000);

    return () => {
      cancelled = true;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [jobId, toast]);

  async function runExport() {
    setIsRunning(true);
    setUrl(null);
    try {
      const res = await fetch("/api/admin/export/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deidentify, enqueue: true }),
      });
      const payload = await res.json();
      if (!res.ok || payload.error) throw new Error(payload.error ?? payload.message ?? "Export failed");
      if (payload.jobId) {
        toast.show({ title: "Export queued", message: `Job ${payload.jobId} queued. Worker will process soon.`, type: "success" });
        setJobId(payload.jobId);
        // start polling job status
      } else {
        setUrl(payload.url ?? null);
        toast.show({ title: "Export started", message: `Exported ${payload.count ?? 0} records.`, type: "success" });
      }
    } catch (err) {
      toast.show({ title: "Export failed", message: err instanceof Error ? err.message : String(err), type: "error" });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="mt-4">
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={deidentify} onChange={(e) => setDeidentify(e.target.checked)} />
        De-identify data
      </label>
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={runExport} disabled={isRunning}>{isRunning ? "Running export..." : "Run export"}</Button>
        {jobId ? (
          <div className="text-sm text-neutral-700">Checking job <span className="font-mono">{jobId}</span> — waiting for worker...</div>
        ) : null}
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="text-sm text-violet-700 underline">Open export file</a>
        ) : null}
      </div>
    </div>
  );
}
