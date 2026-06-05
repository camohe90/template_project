"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Coins, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { EventCard } from "@/components/user/EventCard";
import type { TicketEvent } from "@/lib/types";

export default function DiscoverPage() {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(true);

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

  const featured = events.slice(0, 6);

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-500 px-6 py-16 text-white md:px-14 md:py-20">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-black/10 blur-2xl" />
        <div className="relative max-w-2xl space-y-6">
          <span className="badge bg-white/15 text-white ring-1 ring-white/20">
            <Sparkles className="h-3.5 w-3.5" /> NFT tickets on Algorand
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Own your tickets. <br /> Skip the fakes.
          </h1>
          <p className="max-w-lg text-lg text-white/80">
            Every ticket is a real NFT you hold in your own wallet. Buy in seconds with
            ALGO or USDC — no seed phrases, just sign in.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/events" className="btn bg-white text-brand-700 hover:bg-white/90">
              Explore events <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/admin"
              className="btn border border-white/30 text-white hover:bg-white/10"
            >
              I&apos;m an organizer
            </Link>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Prop icon={<ShieldCheck className="h-5 w-5" />} title="Verifiably yours" body="Tickets are Algorand Standard Assets held in your wallet — provably authentic." />
        <Prop icon={<Zap className="h-5 w-5" />} title="Instant onboarding" body="Sign in with email or socials. We fund your account so you can transact right away." />
        <Prop icon={<Coins className="h-5 w-5" />} title="ALGO or USDC" body="Pay how you like. Purchases settle atomically — pay and receive in one transaction." />
      </section>

      {/* Featured events */}
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Happening now</h2>
            <p className="text-sm text-slate-500">Fresh drops from organizers on Tixo.</p>
          </div>
          <Link href="/events" className="text-sm font-semibold text-brand-700 hover:underline">
            See all →
          </Link>
        </div>

        {loading ? (
          <SkeletonGrid />
        ) : featured.length === 0 ? (
          <div className="card p-12 text-center text-sm text-slate-500">
            No events on sale yet. Be the first —{" "}
            <Link href="/admin" className="font-semibold text-brand-700 hover:underline">
              create one in the dashboard
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((ev) => (
              <EventCard key={ev.id} event={ev} onPurchased={load} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Prop({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card p-5">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="h-44 w-full animate-pulse bg-slate-100" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-9 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
