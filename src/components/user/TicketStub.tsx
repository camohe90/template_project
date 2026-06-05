import { CalendarDays, MapPin } from "lucide-react";
import { Artwork } from "@/components/Artwork";
import { CurrencyBadge } from "@/components/Logo";
import { explorerAssetUrl } from "@/lib/algod";
import { formatEventDate, formatEventTime } from "@/lib/format";
import type { TicketEvent } from "@/lib/types";

export function TicketStub({ event, count }: { event: TicketEvent; count: number }) {
  return (
    <div className="ticket-notch relative flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Artwork src={event.imageUrl} alt={event.name} className="h-auto w-28 shrink-0" />

      {/* dashed tear line */}
      <div className="my-3 border-l-2 border-dashed border-slate-200" />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold leading-tight">{event.name}</h3>
          {count > 1 && (
            <span className="badge bg-brand-50 text-brand-700">×{count}</span>
          )}
        </div>
        <div className="space-y-1 text-sm text-slate-500">
          <div className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> {formatEventDate(event.date)}
            {formatEventTime(event.date) && ` · ${formatEventTime(event.date)}`}
          </div>
          <div className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {event.venue}
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between pt-1">
          <CurrencyBadge currency={event.currency} />
          {event.assetId && (
            <a
              href={explorerAssetUrl(event.assetId)}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-slate-400 hover:text-brand-700"
            >
              ASA #{event.assetId}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
