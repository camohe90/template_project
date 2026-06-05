import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="card overflow-hidden">
        <div className="grid gap-8 p-8 md:grid-cols-2 md:p-12">
          <div className="space-y-5">
            <span className="badge bg-brand-100 text-brand-700">
              NFT Ticketing · Algorand
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
              Mint, sell and own event tickets as NFTs
            </h1>
            <p className="text-slate-600">
              Every ticket is an Algorand Standard Asset (ASA). Organizers mint
              inventory in a click; fans log in with email or socials via Web3Auth
              and buy tickets in an atomic, trustless swap — no crypto experience
              required.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="btn-primary">
                Create an event →
              </Link>
              <Link href="/events" className="btn-ghost">
                Browse tickets
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <Feature
              title="Native NFTs via ASAs"
              body="No smart contracts to audit. Tickets are protocol-native assets minted and managed with AlgoKit Utils."
            />
            <Feature
              title="Web3Auth onboarding"
              body="Users sign in with familiar logins. An Algorand account is derived automatically behind the scenes."
            />
            <Feature
              title="Auto top-up"
              body="Fresh accounts are funded with ALGO so they can cover the minimum balance and opt-in costs instantly."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Step n={1} title="Organizer creates an event" body="Add details and ticket supply in the dashboard." />
        <Step n={2} title="Mint tickets as an ASA" body="One asset, one unit per ticket, held by the organizer." />
        <Step n={3} title="Fans buy atomically" body="Pay + receive the ticket in a single grouped transaction." />
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="card p-6">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 font-bold text-white">
        {n}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
