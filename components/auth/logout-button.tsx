"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={logout} title="Sign out">
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
