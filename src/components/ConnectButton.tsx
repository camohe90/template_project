"use client";
import { LogOut, Wallet } from "lucide-react";
import { useWallet } from "./WalletProvider";
import { shortenAddress } from "@/lib/format";

export function ConnectButton() {
  const { ready, connecting, address, balanceAlgo, userEmail, topUp, error, connect, logout } =
    useWallet();

  if (!ready) {
    return <span className="text-sm text-slate-400">Loading…</span>;
  }

  if (!address) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button className="btn-primary" disabled={connecting} onClick={connect}>
          <Wallet className="h-4 w-4" />
          {connecting ? "Connecting…" : "Sign in"}
        </button>
        {error && <span className="max-w-xs text-right text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-1.5">
      <div className="text-right leading-tight">
        <div className="text-sm font-semibold">
          {balanceAlgo === null ? "…" : `${balanceAlgo.toFixed(2)} ALGO`}
        </div>
        <div className="text-[11px] text-slate-500" title={address}>
          {userEmail ? `${userEmail}` : shortenAddress(address)}
          {topUp?.funded ? ` · +${topUp.amount} ◎` : ""}
        </div>
      </div>
      <button
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        title="Sign out"
        onClick={logout}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
