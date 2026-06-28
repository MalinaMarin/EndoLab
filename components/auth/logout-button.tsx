"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [signingOut, setSigningOut] = useState(false);

  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
    } finally {
      window.location.replace("/");
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={logout} disabled={signingOut} title="Sign out">
      <LogOut className="h-4 w-4" />
      {signingOut ? "Signing out..." : "Sign out"}
    </Button>
  );
}
