"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TicketX } from "lucide-react";
import { TicketStub } from "@/components/user/TicketStub";
import { useWallet } from "@/components/WalletProvider";
import { getAlgodClient } from "@/lib/algod";
import type { TicketEvent } from "@/lib/types";

interface OwnedTicket {
  event: TicketEvent;
  count: number;
}

export default function MyTicketsPage() {
  const { account, address, ready, connect } = useWallet();
  const [tickets, setTickets] = useState<OwnedTicket[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const [eventsRes, info] = await Promise.all([
        fetch("/api/events").then((r) => r.json()),
        getAlgodClient().accountInformation(address).do(),
      ]);
      const held = new Map<number, bigint>();
      for (const a of info.assets ?? []) {
        if (BigInt(a.amount) > 0n) held.set(Number(a.assetId), BigInt(a.amount));
      }
      const events: TicketEvent[] = eventsRes.events ?? [];
      const owned = events
        .filter((e) => e.assetId && held.has(e.assetId))
        .map((e) => ({ event: e, count: Number(held.get(e.assetId!)) }));
      setTickets(owned);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  const totalTickets = tickets.reduce((n, t) => n + t.count, 0);

  if (ready && !account) {
    return (
      <div className="card flex flex-col items-center gap-4 p-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <TicketX className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Your tickets live here</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to see the tickets you own.</p>
        </div>
        <button className="btn-primary" onClick={connect}>
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My tickets</h1>
          <p className="text-sm text-slate-500">NFT tickets held in your wallet.</p>
        </div>
        <button className="btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {tickets.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="card flex items-center gap-4 px-5 py-4">
            <span className="text-3xl font-bold text-brand-700">{totalTickets}</span>
            <span className="text-sm text-slate-500">
              ticket{totalTickets === 1 ? "" : "s"} purchased
            </span>
          </div>
          <div className="card flex items-center gap-4 px-5 py-4">
            <span className="text-3xl font-bold text-brand-700">{tickets.length}</span>
            <span className="text-sm text-slate-500">
              event{tickets.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}

      {loading && tickets.length === 0 ? (
        <p className="text-sm text-slate-500">Loading your tickets…</p>
      ) : tickets.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-500">
          You don't own any tickets yet.{" "}
          <Link href="/events" className="font-semibold text-brand-700 hover:underline">
            Browse events →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tickets.map((t) => (
            <TicketStub key={t.event.id} event={t.event} count={t.count} />
          ))}
        </div>
      )}
    </div>
  );
}
