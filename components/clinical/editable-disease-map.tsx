"use client";

import { useEffect, useState } from "react";
import type { EndoCase } from "@/lib/types";

const KEYS = ["ovaries", "bowel", "bladder", "uterosacral", "adhesions"] as const;
const diseaseOptions: EndoCase["diseaseMap"][keyof EndoCase["diseaseMap"]][] = ["unknown", "ruled_out", "suspected", "likely"];
const adhesionOptions: EndoCase["diseaseMap"]["adhesions"][] = ["low", "medium", "high"];

export default function EditableDiseaseMap({
  value,
  onChange,
}: {
  value: EndoCase["diseaseMap"];
  onChange: (next: EndoCase["diseaseMap"]) => void;
}) {
  const [draft, setDraft] = useState<EndoCase["diseaseMap"]>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function update<K extends keyof EndoCase["diseaseMap"]>(k: K, v: EndoCase["diseaseMap"][K]) {
    const next = { ...draft, [k]: v };
    setDraft(next);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {KEYS.map((k) => (
          <label key={k} className="flex items-center gap-2 rounded-md border p-2">
            <span className="text-xs font-semibold text-violet-700" style={{ width: 90 }}>{k}</span>
            <select
              value={draft[k] ?? "unknown"}
              onChange={(e) => update(k, e.target.value as EndoCase["diseaseMap"][typeof k])}
              className="rounded-md border px-2 py-1 text-sm"
            >
              {(k === "adhesions" ? adhesionOptions : diseaseOptions).map((option) => (
                <option key={option} value={option}>
                  {option.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}
