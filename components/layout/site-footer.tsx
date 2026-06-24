import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>EndoLab organizes records and supports specialist review. It does not provide diagnosis or emergency care.</p>
        <nav className="flex gap-4">
          <Link href="/privacy" className="font-medium hover:text-slate-950">Privacy</Link>
          <Link href="/terms" className="font-medium hover:text-slate-950">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
