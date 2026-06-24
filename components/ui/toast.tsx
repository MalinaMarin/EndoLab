"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: string; title?: string; message: string; type?: "info" | "success" | "error" };

const ToastContext = createContext<{ show: (t: Omit<Toast, "id">) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function show(next: Omit<Toast, "id">) {
    const id = String(Date.now()) + Math.random().toString(16).slice(2, 8);
    const t: Toast = { id, ...next };
    setToasts((s) => [...s, t]);
    setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== id));
    }, 5000);
  }

  const ctx = useMemo(() => ({ show }), []);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-sm rounded-md p-3 shadow-lg ${t.type === "error" ? "bg-rose-600 text-white" : t.type === "success" ? "bg-emerald-600 text-white" : "bg-slate-800 text-white"}`}>
            {t.title ? <div className="font-semibold">{t.title}</div> : null}
            <div className="text-sm">{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
