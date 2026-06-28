import Link from "next/link";
import { BadgeEuro, BarChart3, Building2, ClipboardList, FileSearch2, LayoutDashboard, LogIn, Sparkles, Stethoscope, UserRound, UsersRound } from "lucide-react";
import { getUserContext } from "@/lib/account";
import { LogoutButton } from "@/components/auth/logout-button";
import { MobileNavigation } from "@/components/layout/mobile-navigation";

const publicNav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/demo", label: "Demo", icon: Sparkles },
  { href: "/patient", label: "Patient journey", icon: UsersRound },
  { href: "/patient/specialists", label: "Find specialists", icon: Stethoscope },
  { href: "/pricing", label: "Pricing", icon: BadgeEuro },
  { href: "/login", label: "Sign in", icon: LogIn },
];

export async function BrandBar() {
  const context = await getUserContext();
  const navItems = context?.accountType === "clinic"
    ? [
        { href: "/", label: "Overview", icon: LayoutDashboard },
        { href: "/clinic/dashboard", label: "Clinic", icon: Building2 },
        { href: "/clinic/import", label: "Import", icon: ClipboardList },
        { href: "/clinic/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/doctor/inbox", label: "Doctor Inbox", icon: FileSearch2 },
      ]
    : context?.accountType === "patient"
      ? [
          { href: "/patient/dashboard", label: "My cases", icon: LayoutDashboard },
          { href: "/patient/specialists", label: "Specialists", icon: Stethoscope },
          { href: "/intake", label: "New case", icon: ClipboardList },
        ]
      : publicNav;

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-violet-200/70 bg-white/90 backdrop-blur">
      <div className="relative mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-violet-950">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
            <Sparkles className="h-4 w-4 text-violet-700" />
          </span>
          <span className="text-xl font-semibold">EndoLab</span>
        </Link>

        <nav className="hidden max-w-full items-center gap-1 md:flex md:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-violet-900/85 transition hover:bg-violet-50 hover:text-violet-950"
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {context ? (
            <>
              <Link href="/account/settings" className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">
                <UserRound className="h-4 w-4" />
                {context.fullName}
              </Link>
              <LogoutButton />
            </>
          ) : null}
        </nav>
        <MobileNavigation
          items={(context ? [...navItems.slice(0, 3), { href: "/account/settings", label: "Account", icon: UserRound }] : navItems).map(({ href, label }) => ({ href, label }))}
          authenticated={Boolean(context)}
        />
      </div>
    </header>
    {context ? <div className="h-16 md:hidden" aria-hidden="true" /> : null}
    </>
  );
}
