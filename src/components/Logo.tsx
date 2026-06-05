import { Ticket } from "lucide-react";

export function Logo({ subtitle }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-600/30">
        <Ticket className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight">Tixo</span>
        {subtitle && (
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

export function CurrencyBadge({ currency }: { currency: "ALGO" | "USDC" }) {
  const styles =
    currency === "USDC"
      ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
      : "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  return <span className={`badge ${styles}`}>{currency}</span>;
}
