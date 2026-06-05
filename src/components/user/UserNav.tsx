"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ConnectButton } from "@/components/ConnectButton";

const LINKS = [
  { href: "/", label: "Discover" },
  { href: "/events", label: "Events" },
  { href: "/tickets", label: "My tickets" },
];

export function UserNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-8">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="hidden text-sm font-medium text-slate-500 hover:text-slate-900 sm:block"
          >
            Organizers
          </Link>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
