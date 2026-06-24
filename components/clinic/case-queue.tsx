"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, CheckCircle2, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { calculateReferralReadinessScore } from "@/lib/case-utils";
import { getCaseWorkflowStatus, getWorkflowStatusLabel } from "@/lib/workflow";
import type { EndoCase } from "@/lib/types";

type Filter = "all" | "record_chase" | "needs_triage" | "ready_for_review";
type Sort = "priority" | "readiness" | "recent";

export function CaseQueue({ cases, assignees }: { cases: EndoCase[]; assignees: string[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("priority");
  const [selected, setSelected] = useState<string[]>([]);
  const [assignee, setAssignee] = useState(assignees[0] ?? "");
  const [assigning, setAssigning] = useState(false);
  const toast = useToast();

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cases
      .filter((item) => {
        const workflow = getCaseWorkflowStatus(item);
        return (filter === "all" || workflow === filter) &&
          (!normalized || item.title.toLowerCase().includes(normalized) || item.id.toLowerCase().includes(normalized) || item.patient.country?.toLowerCase().includes(normalized));
      })
      .sort((a, b) => {
        if (sort === "readiness") return calculateReferralReadinessScore(b) - calculateReferralReadinessScore(a);
        if (sort === "recent") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        const priority = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priority[b.severity] - priority[a.severity];
      });
  }, [cases, filter, query, sort]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function assign() {
    if (!selected.length || !assignee) return;
    setAssigning(true);
    try {
      const response = await fetch("/api/cases/assign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseIds: selected, assignedTo: assignee }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Assignment failed.");
      toast.show({ title: "Cases assigned", message: `${payload.updated} case${payload.updated === 1 ? "" : "s"} assigned to ${assignee}.`, type: "success" });
      setSelected([]);
      window.location.reload();
    } catch (error) {
      toast.show({ title: "Could not assign cases", message: error instanceof Error ? error.message : "Assignment failed.", type: "error" });
    } finally {
      setAssigning(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_10px_28px_-24px_rgba(15,23,42,0.45)]">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Case queue</h2>
            <p className="mt-1 text-sm text-slate-600">{visible.length} visible of {cases.length} total cases</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <span className="sr-only">Search cases</span>
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search case or country" className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm sm:w-56" />
            </label>
            <label className="relative">
              <span className="sr-only">Sort cases</span>
              <ArrowUpDown className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-10 rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-sm">
                <option value="priority">Priority</option>
                <option value="readiness">Readiness</option>
                <option value="recent">Most recent</option>
              </select>
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {([
            ["all", "All"],
            ["record_chase", "Record chase"],
            ["needs_triage", "Clinical triage"],
            ["ready_for_review", "Ready"],
          ] as Array<[Filter, string]>).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setFilter(value)} className={`h-9 shrink-0 rounded-lg px-3 text-sm font-semibold ${filter === value ? "bg-violet-700 text-white" : "bg-slate-100 text-slate-700"}`}>{label}</button>
          ))}
        </div>
      </div>

      {selected.length ? (
        <div className="flex flex-col gap-3 border-b border-violet-200 bg-violet-50 px-4 py-3 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-violet-950">{selected.length} selected</p>
          <select value={assignee} onChange={(event) => setAssignee(event.target.value)} className="h-10 rounded-lg border border-violet-200 bg-white px-3 text-sm">
            {assignees.map((name) => <option key={name}>{name}</option>)}
          </select>
          <Button type="button" size="sm" onClick={assign} disabled={assigning || !assignee}><UserRound className="h-4 w-4" /> {assigning ? "Assigning..." : "Assign cases"}</Button>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            <tr>
              <th className="w-12 px-4 py-3"><span className="sr-only">Select</span></th>
              <th className="px-3 py-3">Case</th>
              <th className="px-3 py-3">Workflow</th>
              <th className="px-3 py-3">Readiness</th>
              <th className="px-3 py-3">Gaps</th>
              <th className="px-3 py-3">Assigned</th>
              <th className="px-3 py-3">Priority</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((item) => {
              const workflow = getCaseWorkflowStatus(item);
              const readiness = calculateReferralReadinessScore(item);
              return (
                <tr key={item.id} className="hover:bg-violet-50/40">
                  <td className="px-4 py-4"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} aria-label={`Select ${item.title}`} className="h-4 w-4 accent-violet-700" /></td>
                  <td className="px-3 py-4"><Link href={`/doctor/case/${item.id}`} className="font-semibold text-slate-950 hover:text-violet-700">{item.title}</Link><p className="mt-1 text-xs text-slate-500">{item.patient.country ?? "Country not set"} · {item.id.slice(0, 8)}</p></td>
                  <td className="px-3 py-4"><Status value={workflow} label={getWorkflowStatusLabel(workflow)} /></td>
                  <td className="px-3 py-4"><div className="flex items-center gap-2"><span className="h-2 w-20 overflow-hidden rounded-full bg-slate-100"><span className="block h-full bg-violet-600" style={{ width: `${readiness}%` }} /></span><span className="font-semibold text-slate-700">{readiness}%</span></div></td>
                  <td className="px-3 py-4 text-slate-700">{item.missingInfo.length}</td>
                  <td className="px-3 py-4 text-slate-700">{item.assignedTo ?? "Unassigned"}</td>
                  <td className="px-3 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.severity === "HIGH" ? "bg-rose-50 text-rose-700" : item.severity === "MEDIUM" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{item.severity}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length ? <div className="p-8 text-center text-sm text-slate-600">No cases match the current filters.</div> : null}
      </div>
    </section>
  );
}

function Status({ value, label }: { value: string; label: string }) {
  const tone = value === "ready_for_review" ? "bg-emerald-50 text-emerald-800" : value === "record_chase" ? "bg-amber-50 text-amber-800" : "bg-violet-50 text-violet-800";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>{value === "ready_for_review" ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}{label}</span>;
}
