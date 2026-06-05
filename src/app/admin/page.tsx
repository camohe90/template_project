"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Coins,
  Hammer,
  Loader2,
  Pause,
  Play,
  Ticket,
  Trash2,
} from "lucide-react";
import { Artwork } from "@/components/Artwork";
import { CurrencyBadge } from "@/components/Logo";
import { CreateEventForm } from "@/components/admin/CreateEventForm";
import { explorerAssetUrl } from "@/lib/algod";
import { formatPrice } from "@/lib/constants";
import { formatEventDate } from "@/lib/format";
import type { TicketEvent } from "@/lib/types";

const STATUS_STYLES: Record<TicketEvent["status"], string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
};

export default function AdminDashboard() {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvents(data.events ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = useCallback(
    async (id: string, fn: () => Promise<Response>) => {
      setBusyId(id);
      setError(null);
      try {
        const res = await fn();
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Action failed");
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  const mint = (id: string) => act(id, () => fetch(`/api/events/${id}/mint`, { method: "POST" }));
  const setStatus = (id: string, status: TicketEvent["status"]) =>
    act(id, () =>
      fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    );
  const remove = (id: string) => {
    if (!confirm("Delete this event? Unsold minted tickets will be destroyed on-chain.")) return;
    act(id, () => fetch(`/api/events/${id}`, { method: "DELETE" }));
  };

  const totals = {
    events: events.length,
    live: events.filter((e) => e.status === "active").length,
    sold: events.reduce((n, e) => n + e.ticketsSold, 0),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500">Create events, mint ticket NFTs and manage sales.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Ticket className="h-5 w-5" />} label="Events" value={totals.events} />
        <Stat icon={<Play className="h-5 w-5" />} label="On sale" value={totals.live} />
        <Stat icon={<Coins className="h-5 w-5" />} label="Tickets sold" value={totals.sold} />
      </div>

      {/* Create */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Create event</h2>
        <CreateEventForm onCreated={load} />
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Manage */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your events</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : events.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500">
            No events yet. Create your first one above.
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const busy = busyId === ev.id;
              const soldOut = ev.ticketsSold >= ev.totalTickets;
              return (
                <div key={ev.id} className="card flex flex-wrap items-center gap-4 p-4">
                  <Artwork src={ev.imageUrl} alt={ev.name} className="h-16 w-16 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{ev.name}</h3>
                      <span className={`badge ${STATUS_STYLES[ev.status]}`}>{ev.status}</span>
                      <CurrencyBadge currency={ev.currency} />
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {ev.venue} · {formatEventDate(ev.date)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {ev.ticketsSold}/{ev.totalTickets} sold · {formatPrice(ev.price, ev.currency)}
                      {ev.assetId && (
                        <>
                          {" · "}
                          <a
                            className="text-brand-600 hover:underline"
                            href={explorerAssetUrl(ev.assetId)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            ASA #{ev.assetId}
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!ev.assetId ? (
                      <button className="btn-primary btn-sm" disabled={busy} onClick={() => mint(ev.id)}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
                        {busy ? "Minting…" : "Mint tickets"}
                      </button>
                    ) : ev.status === "active" ? (
                      <button className="btn-ghost btn-sm" disabled={busy} onClick={() => setStatus(ev.id, "paused")}>
                        <Pause className="h-4 w-4" /> Pause
                      </button>
                    ) : (
                      <button
                        className="btn-primary btn-sm"
                        disabled={busy || soldOut}
                        onClick={() => setStatus(ev.id, "active")}
                      >
                        <Play className="h-4 w-4" /> {soldOut ? "Sold out" : "Resume"}
                      </button>
                    )}
                    <button
                      className="btn-danger btn-sm"
                      disabled={busy}
                      onClick={() => remove(ev.id)}
                      title="Delete event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      </div>
    </div>
  );
}
