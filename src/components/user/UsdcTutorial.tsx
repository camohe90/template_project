"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, ExternalLink, Loader2, X } from "lucide-react";
import { USDC_ASSET_ID } from "@/lib/constants";

export function UsdcTutorial({
  address,
  neededUsdc,
  onRetry,
  onClose,
}: {
  address: string;
  neededUsdc: number;
  onRetry: () => Promise<void> | void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Render into a portal on document.body so the overlay is never clipped or
  // repositioned by an ancestor's overflow/transform (e.g. the event card).
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked */
    }
  }

  async function retry() {
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="text-lg font-bold">Add test USDC to continue</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              You need about <span className="font-semibold">{neededUsdc} USDC</span> to buy
              this ticket. Test USDC is free on Algorand TestNet — grab some from Circle&apos;s
              faucet, then come back and retry.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            ✓ Your account is already opted in to USDC (asset #{USDC_ASSET_ID}) — you just need
            the tokens.
          </div>

          <ol className="space-y-3">
            <Step n={1} title="Copy your wallet address">
              <button
                onClick={copyAddress}
                className="mt-1 flex w-full items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left font-mono text-xs hover:bg-slate-100"
              >
                <span className="min-w-0 break-all">{address}</span>
                {copied ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Copy className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                )}
              </button>
            </Step>

            <Step n={2} title="Open Circle's TestNet faucet">
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost btn-sm mt-1"
              >
                faucet.circle.com <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Step>

            <Step n={3} title="Request USDC on Algorand">
              Choose <span className="font-medium">Algorand</span> as the network and{" "}
              <span className="font-medium">USDC</span> as the token, paste your address, and
              request. It usually arrives in a few seconds.
            </Step>

            <Step n={4} title="Come back and retry">
              Once the USDC lands, hit retry below to complete your purchase.
            </Step>
          </ol>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
          <button className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={retry} disabled={retrying}>
            {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {retrying ? "Checking…" : "I've added USDC — retry"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
        {n}
      </span>
      <div className="text-sm text-slate-600">
        <div className="font-semibold text-slate-900">{title}</div>
        {children}
      </div>
    </li>
  );
}
