"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { EndoCase } from "@/lib/types";

export default function SurgeriesEditor({
  value,
  onChange,
}: {
  value: EndoCase["surgeries"];
  onChange: (next: EndoCase["surgeries"]) => void;
}) {
  const [list, setList] = useState(value || []);

  useEffect(() => {
    setList(value || []);
  }, [value]);

  function updateAt(i: number, nextItem: Partial<EndoCase["surgeries"][number]>) {
    const next = list.slice();
    next[i] = { ...next[i], ...nextItem };
    setList(next);
    onChange(next);
  }

  function add() {
    const next = [...list, { type: "Surgery (type not specified)", year: new Date().getFullYear(), notes: "", completeness: "unknown" as const }];
    setList(next);
    onChange(next);
  }

  function remove(i: number) {
    const next = list.slice();
    next.splice(i, 1);
    setList(next);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {list.map((s, i) => (
          <div key={i} className="rounded-md border p-2">
            <div className="flex gap-2">
              <input
                className="w-24 rounded-md border px-2 py-1 text-sm"
                inputMode="numeric"
                value={s.year ?? ""}
                onChange={(e) => updateAt(i, { year: Number(e.target.value) || new Date().getFullYear() })}
                placeholder="Year"
              />
              <input className="flex-1 rounded-md border px-2 py-1 text-sm" value={s.type ?? ""} onChange={(e) => updateAt(i, { type: e.target.value })} />
              <button type="button" onClick={() => remove(i)} className="text-rose-600">Remove</button>
            </div>
            <select
              className="mt-2 rounded-md border px-2 py-1 text-sm"
              value={s.completeness ?? "unknown"}
              onChange={(e) => updateAt(i, { completeness: e.target.value as EndoCase["surgeries"][number]["completeness"] })}
            >
              <option value="unknown">Completeness unknown</option>
              <option value="partial">Partial excision</option>
              <option value="complete">Complete excision</option>
            </select>
            <textarea className="mt-2 w-full rounded-md border px-2 py-1 text-sm" value={s.notes ?? ""} onChange={(e) => updateAt(i, { notes: e.target.value })} placeholder="Notes" />
          </div>
        ))}
      </div>
      <Button type="button" size="sm" onClick={add}>Add surgery</Button>
    </div>
  );
}
