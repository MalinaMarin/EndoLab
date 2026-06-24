"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function ExportHistoryTable({ initialJobs = [] as any[] }: { initialJobs?: any[] }) {
  const [jobs, setJobs] = useState<any[]>(initialJobs);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const fetchJobs = useCallback(async function fetchJobs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/export/jobs?limit=50`);
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error ?? payload.message ?? "Could not load jobs");
      setJobs(payload.jobs ?? []);
    } catch (err) {
      toast.show({ title: "Load failed", message: err instanceof Error ? err.message : String(err), type: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!initialJobs || initialJobs.length === 0) fetchJobs();
  }, [fetchJobs, initialJobs]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-violet-700">Recent export jobs</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchJobs} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</Button>
        </div>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-2xl border border-violet-200 p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-violet-950 truncate">{job.path}</div>
                <div className="text-xs text-violet-700">{new Date(job.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-violet-800">{job.status}</span>
                <span className="rounded-full border border-violet-200 bg-white px-2 py-1 text-violet-800">{job.record_count} rows</span>
                {job.status === "success" ? (
                  job.public_url ? (
                    <a href={job.public_url} target="_blank" rel="noreferrer" className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-violet-800 hover:bg-violet-100">Download</a>
                  ) : (
                    <Button size="sm" variant="outline" onClick={fetchJobs}>Create secure link</Button>
                  )
                ) : null}
              </div>
            </div>
            {job.error ? <div className="mt-2 text-sm text-rose-700">Error: {job.error}</div> : null}
            <div className="mt-2 text-xs text-neutral-600">De-identified: {job.deidentified ? "yes" : "no"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
