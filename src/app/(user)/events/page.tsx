"use client";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EventCard } from "@/components/user/EventCard";
import type { TicketEvent } from "@/lib/types";
import type { Currency } from "@/lib/constants";

type Filter = "ALL" | Currency;

export default function EventsPage() {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvents(
        (data.events ?? []).filter((e: TicketEvent) => e.status === "active" && e.assetId),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      const matchesQuery =
        !q || e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q);
      const matchesFilter = filter === "ALL" || e.currency === filter;
      return matchesQuery && matchesFilter;
    });
  }, [events, query, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <p className="text-sm text-slate-500">Browse every ticket on sale right now.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events or venues…"
            className="input pl-9"
          />
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {(["ALL", "ALGO", "USDC"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === f ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f === "ALL" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading events…</p>
      ) : visible.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-500">
          No events match your search.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((ev) => (
            <EventCard key={ev.id} event={ev} onPurchased={load} />
          ))}
        </div>
      )}
    </div>
  );
}
