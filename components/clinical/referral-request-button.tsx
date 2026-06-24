"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReferralRequestButton({
  caseId,
  specialistId,
  autoMessage,
  requestedBy,
  existingStatus,
}: {
  caseId: string;
  specialistId: string;
  autoMessage?: string;
  requestedBy?: string;
  existingStatus?: "pending" | "accepted" | "declined";
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(existingStatus && existingStatus !== "declined" ? "sent" : "idle");
  const [draftMessage, setDraftMessage] = useState<string | null>(autoMessage ?? null);
  const toast = useToast();

  async function onSend() {
    setStatus("sending");

    try {
      const response = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, specialistId, message: draftMessage, requestedBy }),
      });
      const payload = (await response.json()) as { success?: boolean; message?: string; error?: string; referralId?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Could not send referral request.");
      }

      setStatus("sent");
      toast.show({ title: "Referral requested", message: payload.message ?? "Referral request sent successfully.", type: "success" });
      router.refresh();
    } catch (error) {
      setStatus("error");
      toast.show({ title: "Referral failed", message: error instanceof Error ? error.message : "Referral request failed.", type: "error" });
    }
  }

  return (
    <div className="space-y-2">
      {autoMessage ? (
        <textarea
          aria-label="Referral message"
          value={draftMessage ?? ""}
          onChange={(e) => setDraftMessage(e.target.value)}
          disabled={status === "sent"}
          className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
        />
      ) : null}
      <Button type="button" size="sm" variant="outline" onClick={onSend} disabled={status === "sending" || status === "sent"}>
        <span className="inline-flex items-center gap-2">
          {status === "sent" ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          {status === "sent"
            ? existingStatus === "accepted"
              ? "Referral accepted"
              : "Referral requested"
            : status === "sending"
              ? "Sending..."
              : existingStatus === "declined"
                ? "Request again"
                : "Request referral"}
        </span>
      </Button>
      {/* messages shown via global toast */}
    </div>
  );
}
