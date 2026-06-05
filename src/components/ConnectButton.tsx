"use client";
import { useWallet } from "./WalletProvider";

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { ready, connecting, address, balanceAlgo, userEmail, topUp, error, connect, logout } =
    useWallet();

  if (!ready) {
    return <span className="text-sm text-slate-400">Loading wallet…</span>;
  }

  if (!address) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button className="btn-primary" disabled={connecting} onClick={connect}>
          {connecting ? "Connecting…" : "Sign in to buy tickets"}
        </button>
        {error && <span className="max-w-xs text-right text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-sm font-semibold">
          {balanceAlgo === null ? "…" : `${balanceAlgo.toFixed(3)} ALGO`}
        </div>
        <div className="text-xs text-slate-500" title={address}>
          {userEmail ? `${userEmail} · ` : ""}
          {shorten(address)}
          {topUp?.funded ? ` · +${topUp.amount} ALGO topped up` : ""}
        </div>
      </div>
      <button className="btn-ghost" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}
