import { UserNav } from "@/components/user/UserNav";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <UserNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-slate-400">
          Tickets are Algorand Standard Assets · Pay with ALGO or USDC · Sign in via
          Web3Auth · Running on Algorand TestNet
        </div>
      </footer>
    </div>
  );
}
