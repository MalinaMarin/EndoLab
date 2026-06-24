"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeEuro, Building2, ClipboardList, FileSearch2, LayoutDashboard, LogIn, Menu, Stethoscope, UserRound, UsersRound, X } from "lucide-react";

type NavItem = { href: string; label: string };

const icons = {
  account: UserRound,
  clinic: Building2,
  import: ClipboardList,
  inbox: FileSearch2,
  login: LogIn,
  patient: UsersRound,
  pricing: BadgeEuro,
  specialists: Stethoscope,
  default: LayoutDashboard,
};

function iconFor(href: string) {
  if (href.includes("account")) return icons.account;
  if (href.includes("clinic/dashboard")) return icons.clinic;
  if (href.includes("import") || href.includes("intake")) return icons.import;
  if (href.includes("inbox")) return icons.inbox;
  if (href.includes("login")) return icons.login;
  if (href === "/patient") return icons.patient;
  if (href.includes("pricing")) return icons.pricing;
  if (href.includes("specialists")) return icons.specialists;
  return icons.default;
}

export function MobileNavigation({ items, authenticated }: { items: NavItem[]; authenticated: boolean }) {
  const [open, setOpen] = useState(false);

  if (authenticated) {
    return (
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-violet-200 bg-white/95 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_-24px_rgba(76,29,149,0.6)] backdrop-blur md:hidden">
        {items.slice(0, 4).map((item) => {
          const Icon = iconFor(item.href);
          return (
            <Link key={item.href} href={item.href} className="flex min-h-12 flex-col items-center justify-center gap-1 text-xs font-semibold text-violet-800">
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="md:hidden">
      <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-violet-200 text-violet-900" aria-label="Open navigation">
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open ? (
        <nav className="absolute inset-x-4 top-16 rounded-lg border border-violet-200 bg-white p-2 shadow-xl">
          {items.map((item) => {
            const Icon = iconFor(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold text-violet-900 hover:bg-violet-50">
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
