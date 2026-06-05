import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";

export const metadata: Metadata = {
  title: "FronTech Tickets — NFT Ticketing on Algorand",
  description:
    "Create events and sell NFT tickets (ASAs) on Algorand TestNet, with Web3Auth login.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
          attributes into <body> before React hydrates, which is harmless. */}
      <body suppressHydrationWarning>
        <WalletProvider>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-bold">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
                  🎟️
                </span>
                <span>FronTech Tickets</span>
                <span className="badge bg-emerald-100 text-emerald-700">TestNet</span>
              </Link>
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/events" className="btn-ghost">
                  Browse events
                </Link>
                <Link href="/dashboard" className="btn-primary">
                  Organizer dashboard
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-slate-400">
            Built with AlgoKit Utils + AlgoSDK · NFT tickets are Algorand Standard
            Assets · Login via Web3Auth v10
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
