"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

function getReviewerFromCookie() {
  const match = document.cookie.match(/(?:^|; )reviewer_email=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function ClaimButton({ id, claimedBy }: { id: string; claimedBy?: string | null }) {
  const [loading, setLoading] = useState(false);
  const reviewer = getReviewerFromCookie();

  async function claim() {
    setLoading(true);
    try {
      await fetch("/api/extract/review/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reviewer }),
      });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  async function release() {
    setLoading(true);
    try {
      await fetch("/api/extract/review/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reviewer }),
      });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  if (!claimedBy) {
    return (
      <Button onClick={claim} disabled={loading} variant="default" size="sm">
        {loading ? "Claiming..." : "Claim"}
      </Button>
    );
  }

  const isMine = reviewer && claimedBy === reviewer;
  return isMine ? (
    <Button onClick={release} disabled={loading} variant="destructive" size="sm">
      {loading ? "Releasing..." : "Release"}
    </Button>
  ) : (
    <Button disabled size="sm" variant="outline">
      Claimed by {claimedBy}
    </Button>
  );
}
