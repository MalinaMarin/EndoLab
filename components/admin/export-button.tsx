"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ExportButton() {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/export-reviewed", { method: "POST" });
      const payload = await res.json();
      if (payload?.url) {
        window.open(payload.url, "_blank");
      } else {
        alert("Export failed: " + (payload?.error ?? "unknown"));
      }
    } catch (err) {
      alert("Export failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleExport} size="lg" disabled={loading}>
      {loading ? "Exporting..." : "Export reviewed NDJSON"}
    </Button>
  );
}
