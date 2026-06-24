"use client";

import { Button } from "@/components/ui/button";

export default function MarkReviewedButton({ id, reviewer }: { id: string; reviewer?: string }) {
  async function mark() {
    await fetch("/api/extract/review/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reviewer }),
    });
    window.location.reload();
  }

  return (
    <Button type="button" onClick={mark} variant="outline" size="lg">
      Mark reviewed
    </Button>
  );
}
