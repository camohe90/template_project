"use client";
import { useCallback, useEffect, useState } from "react";
import { explorerAssetUrl } from "@/lib/algod";
import type { TicketEvent } from "@/lib/types";

const STATUS_STYLES: Record<TicketEvent["status"], string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
};

export default function DashboardPage() {
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

  const mint = (id: string) =>
    act(id, () => fetch(`/api/events/${id}/mint`, { method: "POST" }));

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Organizer dashboard</h1>
        <p className="text-sm text-slate-600">
          Create events, mint ticket NFTs (ASAs), and manage what is on sale.
        </p>
      </div>

      <CreateEventForm onCreated={load} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your events</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : events.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500">
            No events yet. Create your first one above.
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map((ev) => {
              const busy = busyId === ev.id;
              const soldOut = ev.ticketsSold >= ev.totalTickets;
              return (
                <div key={ev.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-lg font-semibold">{ev.name}</h3>
                        <span className={`badge ${STATUS_STYLES[ev.status]}`}>{ev.status}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {ev.venue} · {new Date(ev.date).toLocaleString()}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {ev.ticketsSold}/{ev.totalTickets} sold · {ev.priceAlgo} ALGO each
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
                        <button className="btn-primary" disabled={busy} onClick={() => mint(ev.id)}>
                          {busy ? "Minting…" : "Mint tickets"}
                        </button>
                      ) : ev.status === "active" ? (
                        <button className="btn-ghost" disabled={busy} onClick={() => setStatus(ev.id, "paused")}>
                          Pause sales
                        </button>
                      ) : (
                        <button
                          className="btn-primary"
                          disabled={busy || soldOut}
                          onClick={() => setStatus(ev.id, "active")}
                        >
                          {soldOut ? "Sold out" : "Resume sales"}
                        </button>
                      )}
                      <button className="btn-danger" disabled={busy} onClick={() => remove(ev.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          venue: fd.get("venue"),
          date: fd.get("date"),
          description: fd.get("description"),
          totalTickets: Number(fd.get("totalTickets")),
          priceAlgo: Number(fd.get("priceAlgo")),
          imageUrl: fd.get("imageUrl"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create event");
      form.reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold">Create event</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Event name</label>
          <input name="name" required maxLength={32} className="input" placeholder="Algorand Summit" />
          <p className="mt-1 text-xs text-slate-400">Max 32 chars (used as the ASA name).</p>
        </div>
        <div>
          <label className="label">Venue</label>
          <input name="venue" required className="input" placeholder="Lisbon, PT" />
        </div>
        <div>
          <label className="label">Date &amp; time</label>
          <input name="date" type="datetime-local" required className="input" />
        </div>
        <div>
          <label className="label">Image URL (optional)</label>
          <input name="imageUrl" type="url" className="input" placeholder="https://…" />
        </div>
        <div>
          <label className="label">Total tickets</label>
          <input name="totalTickets" type="number" min={1} required className="input" placeholder="100" />
        </div>
        <div>
          <label className="label">Price (ALGO)</label>
          <input name="priceAlgo" type="number" min={0} step="0.1" required className="input" placeholder="1" />
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea name="description" rows={2} className="input" placeholder="What's the event about?" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={submitting}>
        {submitting ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}
