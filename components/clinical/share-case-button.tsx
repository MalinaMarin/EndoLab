"use client";

import { useState } from "react";
import { Clipboard, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareCaseButton({ caseId }: { caseId: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      const url = `${window.location.origin}/doctor/case/${caseId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      alert("Could not copy case link. Please try again.");
    }
  }

  return (
    <Button className="w-full" variant="outline" size="lg" onClick={onCopy} disabled={copied}>
      {copied ? (
        <span className="inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Link copied
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          <Clipboard className="h-4 w-4" />
          Copy share link
        </span>
      )}
    </Button>
  );
}
