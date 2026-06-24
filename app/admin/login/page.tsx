"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, secret }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "Login failed");
      router.push("/admin/labeling");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-md px-6 py-24">
        <h1 className="text-2xl font-semibold">Reviewer login</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your reviewer credentials to access the labeling queue.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">Secret</label>
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} className="mt-2 w-full rounded-xl border px-3 py-2" />
          </div>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <div className="mt-4 flex justify-end">
            <Button type="submit">Sign in</Button>
          </div>
        </form>
      </section>
    </main>
  );
}
