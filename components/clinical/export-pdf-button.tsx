"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ExportPdfButton({ caseId }: { caseId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  async function onExport() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/cases/${caseId}/export`);
      if (!response.ok) throw new Error("Export failed.");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `endolab-${caseId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not export PDF.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button className="w-full" variant="outline" size="lg" onClick={onExport} disabled={isLoading}>
      {isLoading ? "Exporting..." : "Export Case Summary"}
    </Button>
  );
}
