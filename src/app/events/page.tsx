"use client";
import { useCallback, useEffect, useState } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { useWallet } from "@/components/WalletProvider";
import { explorerTxUrl } from "@/lib/algod";
import { purchaseTicket } from "@/lib/purchase-client";
import type { TicketEvent } from "@/lib/types";

export default function EventsPage() {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      // Only show events that are minted and on sale.
      setEvents((data.events ?? []).filter((e: TicketEvent) => e.status === "active" && e.assetId));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Browse events</h1>
          <p className="text-sm text-slate-600">
            Sign in with Web3Auth and buy a ticket NFT in one atomic transaction.
          </p>
        </div>
        <ConnectButton />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading events…</p>
      ) : events.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          No tickets on sale yet. Check back soon!
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <EventCard key={ev.id} event={ev} onPurchased={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onPurchased }: { event: TicketEvent; onPurchased: () => void }) {
  const { account, connect, ready, refreshBalance } = useWallet();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string; txId?: string } | null>(null);

  const remaining = event.totalTickets - event.ticketsSold;
  const soldOut = remaining <= 0;

  async function buy() {
    setMsg(null);
    if (!account) {
      await connect();
      return;
    }
    setBusy(true);
    try {
      const result = await purchaseTicket(account, {
        id: event.id,
        assetId: event.assetId!,
        organizerAddress: event.organizerAddress!,
        priceAlgo: event.priceAlgo,
      });
      setMsg({ kind: "ok", text: "Ticket purchased!", txId: result.txId });
      await refreshBalance();
      onPurchased();
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Purchase failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col overflow-hidden">
      {event.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.imageUrl} alt={event.name} className="h-40 w-full object-cover" />
      ) : (
        <div className="grid h-40 w-full place-items-center bg-gradient-to-br from-brand-500 to-brand-700 text-5xl">
          🎟️
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-semibold">{event.name}</h3>
        <p className="text-sm text-slate-600">
          {event.venue} · {new Date(event.date).toLocaleDateString()}
        </p>
        {event.description && (
          <p className="line-clamp-2 text-sm text-slate-500">{event.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-lg font-bold">{event.priceAlgo} ALGO</span>
          <span className="text-xs text-slate-500">{remaining} left</span>
        </div>
        <button className="btn-primary mt-1" disabled={busy || soldOut || !ready} onClick={buy}>
          {soldOut
            ? "Sold out"
            : busy
              ? "Processing…"
              : account
                ? "Buy ticket"
                : "Sign in to buy"}
        </button>
        {msg && (
          <p className={`text-xs ${msg.kind === "ok" ? "text-emerald-600" : "text-red-600"}`}>
            {msg.text}
            {msg.txId && (
              <>
                {" "}
                <a className="underline" href={explorerTxUrl(msg.txId)} target="_blank" rel="noreferrer">
                  View transaction
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
