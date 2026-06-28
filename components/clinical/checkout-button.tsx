"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function CheckoutButton({ caseId, label = "Confirm service" }: { caseId: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function checkout() {
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const payload = (await response.json()) as { url?: string; error?: string; message?: string; sandbox?: boolean };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "Could not create checkout.");
      if (payload.sandbox) {
        toast.show({
          title: "Sandbox checkout completed",
          message: payload.message ?? "The case is now ready for referral requests.",
          type: "success",
        });
      }
      window.location.href = payload.url;
    } catch (error) {
      toast.show({
        title: "Checkout failed",
        message: error instanceof Error ? error.message : "Could not continue checkout.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" onClick={checkout} disabled={loading}>
      <CreditCard className="h-4 w-4" />
      {loading ? "Opening checkout..." : label}
    </Button>
  );
}
