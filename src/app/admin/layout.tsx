import Link from "next/link";
import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-900 p-5 text-slate-300 md:flex">
        <div className="space-y-8">
          <Link href="/admin" className="text-white">
            <Logo subtitle="Organizer console" />
          </Link>
          <nav className="space-y-1">
            <span className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </span>
          </nav>
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <ArrowUpRight className="h-4 w-4" /> View live site
        </Link>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3 md:hidden">
          <Link href="/admin">
            <Logo subtitle="Organizer" />
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-500">
            Live site →
          </Link>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
      </div>
    </div>
  );
}
