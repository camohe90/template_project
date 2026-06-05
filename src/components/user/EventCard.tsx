"use client";
import { useState } from "react";
import { CalendarDays, Check, ExternalLink, Loader2, MapPin } from "lucide-react";
import { Artwork } from "@/components/Artwork";
import { CurrencyBadge } from "@/components/Logo";
import { useWallet } from "@/components/WalletProvider";
import { UsdcTutorial } from "@/components/user/UsdcTutorial";
import { explorerTxUrl } from "@/lib/algod";
import { formatPrice } from "@/lib/constants";
import { formatEventDate } from "@/lib/format";
import { NeedsUsdcError, purchaseTicket } from "@/lib/purchase-client";
import type { TicketEvent } from "@/lib/types";

export function EventCard({
  event,
  onPurchased,
}: {
  event: TicketEvent;
  onPurchased: () => void;
}) {
  const { account, connect, ready } = useWallet();
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [needUsdc, setNeedUsdc] = useState<{ address: string; needed: number } | null>(null);
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
    setStage(null);
    try {
      const result = await purchaseTicket(
        account,
        {
          id: event.id,
          assetId: event.assetId!,
          organizerAddress: event.organizerAddress!,
          price: event.price,
          currency: event.currency,
        },
        setStage,
      );
      setNeedUsdc(null);
      setMsg({ kind: "ok", text: "You got a ticket! 🎟️", txId: result.txId });
      onPurchased();
    } catch (err) {
      if (err instanceof NeedsUsdcError) {
        setNeedUsdc({ address: err.address, needed: err.neededUsdc });
      } else {
        setMsg({ kind: "err", text: err instanceof Error ? err.message : "Purchase failed" });
      }
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  return (
    <div className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative">
        <Artwork src={event.imageUrl} alt={event.name} className="h-44 w-full" />
        <div className="absolute right-3 top-3 flex gap-1.5">
          <CurrencyBadge currency={event.currency} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="space-y-1">
          <h3 className="line-clamp-1 text-lg font-bold tracking-tight">{event.name}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {formatEventDate(event.date)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {event.venue}
            </span>
          </div>
        </div>

        {event.description && (
          <p className="line-clamp-2 text-sm text-slate-500">{event.description}</p>
        )}

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Price</div>
            <div className="text-xl font-bold">{formatPrice(event.price, event.currency)}</div>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {soldOut ? "Sold out" : `${remaining} left`}
          </span>
        </div>

        <button className="btn-primary w-full" disabled={busy || soldOut || !ready} onClick={buy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {stage ?? "Processing…"}
            </>
          ) : soldOut ? (
            "Sold out"
          ) : account ? (
            `Buy with ${event.currency}`
          ) : (
            "Sign in to buy"
          )}
        </button>

        {msg && (
          <p
            className={`flex items-center gap-1 text-xs ${
              msg.kind === "ok" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {msg.kind === "ok" && <Check className="h-3.5 w-3.5" />}
            {msg.text}
            {msg.txId && (
              <a
                className="inline-flex items-center gap-0.5 underline"
                href={explorerTxUrl(msg.txId)}
                target="_blank"
                rel="noreferrer"
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </p>
        )}
      </div>

      {needUsdc && (
        <UsdcTutorial
          address={needUsdc.address}
          neededUsdc={needUsdc.needed}
          onRetry={buy}
          onClose={() => setNeedUsdc(null)}
        />
      )}
    </div>
  );
}
