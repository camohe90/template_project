"use client";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, X } from "lucide-react";
import { Artwork } from "@/components/Artwork";
import { CurrencyBadge } from "@/components/Logo";
import { CURRENCIES, formatPrice, type Currency } from "@/lib/constants";
import { formatEventDate } from "@/lib/format";

export function CreateEventForm({ onCreated }: { onCreated: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [totalTickets, setTotalTickets] = useState("100");
  const [price, setPrice] = useState("1");
  const [currency, setCurrency] = useState<Currency>("ALGO");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function reset() {
    setName("");
    setVenue("");
    setDate("");
    setDescription("");
    setTotalTickets("100");
    setPrice("1");
    setCurrency("ALGO");
    setImageUrl(undefined);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          venue,
          date,
          description,
          totalTickets: Number(totalTickets),
          price: Number(price),
          currency,
          imageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create event");
      reset();
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event");
    } finally {
      setSubmitting(false);
    }
  }

  const priceNum = Number(price) || 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Form */}
      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <div>
          <label className="label">Ticket artwork</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={onPickImage}
          />
          {imageUrl ? (
            <div className="relative inline-block">
              <Artwork src={imageUrl} alt="Ticket artwork" className="h-32 w-32 rounded-xl" />
              <button
                type="button"
                onClick={() => {
                  setImageUrl(undefined);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-white shadow"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-32 w-32 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-brand-400 hover:text-brand-600"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <ImagePlus className="h-6 w-6" />
              )}
              <span className="text-xs font-medium">{uploading ? "Uploading…" : "Upload image"}</span>
            </button>
          )}
          <p className="mt-1.5 text-xs text-slate-400">
            This becomes the NFT ticket artwork buyers see. PNG/JPG/WEBP/GIF, up to 5 MB.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Event name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={32}
              className="input"
              placeholder="Algorand Summit"
            />
          </Field>
          <Field label="Venue">
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              required
              className="input"
              placeholder="Lisbon, PT"
            />
          </Field>
          <Field label="Date & time">
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="datetime-local"
              required
              className="input"
            />
          </Field>
          <Field label="Total tickets">
            <input
              value={totalTickets}
              onChange={(e) => setTotalTickets(e.target.value)}
              type="number"
              min={1}
              required
              className="input"
            />
          </Field>
          <Field label="Price">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min={0}
              step="0.01"
              required
              className="input"
            />
          </Field>
          <Field label="Currency">
            <div className="inline-flex w-full rounded-xl border border-slate-200 bg-white p-1">
              {CURRENCIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    currency === c ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input"
            placeholder="What's the event about?"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button className="btn-primary" disabled={submitting || uploading}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {submitting ? "Creating…" : "Create event"}
        </button>
      </form>

      {/* Live preview */}
      <div className="space-y-2">
        <span className="label">Live preview</span>
        <div className="card overflow-hidden">
          <Artwork src={imageUrl} alt="preview" className="h-40 w-full" />
          <div className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold">{name || "Event name"}</h4>
              <CurrencyBadge currency={currency} />
            </div>
            <p className="text-sm text-slate-500">
              {(venue || "Venue")} · {date ? formatEventDate(date) : "Date"}
            </p>
            <div className="flex items-end justify-between pt-1">
              <span className="text-lg font-bold">{formatPrice(priceNum, currency)}</span>
              <span className="text-xs text-slate-400">{totalTickets || 0} tickets</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          This is how your ticket will appear in the marketplace and in buyers' wallets.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
