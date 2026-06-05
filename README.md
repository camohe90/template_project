# FronTech Tickets — NFT Ticketing on Algorand

An end-to-end NFT ticketing demo on **Algorand TestNet**. Tickets are minted as
**Algorand Standard Assets (ASAs)** — no smart contracts required. Built with the
latest **AlgoKit Utils** and **AlgoSDK**, with **Web3Auth v10** login and an
automatic account top-up for new users.

## What's inside

Two surfaces, one Next.js (App Router) app:

1. **Organizer dashboard** (`/dashboard`) — create events, mint ticket NFTs (one
   ASA per event, one unit per ticket), then pause / resume / delete and watch
   sales. Deleting an event with unsold tickets destroys the ASA on-chain to
   reclaim the minimum balance.
2. **User marketplace** (`/events`) — fans sign in with **Web3Auth** (email /
   social), get an Algorand account derived automatically, and buy a ticket in a
   single **atomic group** (pay ALGO ⇄ receive ticket).

### How the pieces map

| Concern | Implementation |
| --- | --- |
| Ticket NFT | One ASA per event (`decimals: 0`, `total = totalTickets`), minted with `algorand.send.assetCreate` |
| Wallet / login | Web3Auth v10 (`@web3auth/modal`); the private key is reinterpreted as an Algorand Ed25519 key (`src/lib/web3auth.ts`) |
| New-user top-up | `POST /api/faucet` → `algorand.account.ensureFunded(addr, dispenser, algo(1))` (idempotent) |
| Purchase | Atomic `[payment, asset-transfer]` group: buyer signs the payment in the browser, the server signs the ticket transfer (`/api/purchase`) |
| Event storage | JSON file (`data/events.json`) via `src/lib/events-repository.ts` — swap for a real DB in production |

## Prerequisites

- Node.js 20+
- A funded Algorand TestNet account (the **organizer / dispenser**)
- A **Web3Auth** client id (free) from https://dashboard.web3auth.io

## Setup

```bash
npm install
cp .env.local.example .env.local
```

### 1. Create & fund the organizer account

```bash
npm run gen:account
```

Copy the printed **mnemonic** into `.env.local` as `ORGANIZER_MNEMONIC`, then fund
the printed **address** on TestNet:

- https://bank.testnet.algorand.network (paste the address)

This account creates ASAs, holds ticket inventory, and (by default) also funds new
users. Give it a few ALGO — each event mint locks 0.1 ALGO MBR and every top-up
sends ~1 ALGO. To use a separate funding account, set `DISPENSER_MNEMONIC`.

### 2. Configure Web3Auth

Create a "Plug and Play" project on the Web3Auth dashboard and set:

```
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=...
NEXT_PUBLIC_WEB3AUTH_NETWORK=sapphire_devnet
```

Add `http://localhost:3000` to the project's allowed origins.

### 3. Run

```bash
npm run dev
```

Open http://localhost:3000 — create an event in the dashboard, mint its tickets,
then switch to **Browse events**, sign in, and buy one.

## Purchase flow (trustless, no smart contract)

```
Browser (Web3Auth key)                         Server (organizer key)
  ├─ ensure opted-in to the ticket ASA
  ├─ build group: [pay buyer→org, axfer org→buyer]
  ├─ sign the payment leg ───────────────►  POST /api/purchase
                                            ├─ re-validate every field + group id
                                            ├─ sign the asset-transfer leg
                                            └─ submit the atomic group
```

Because both transactions share a group id, the payment only settles if the ticket
transfer settles too.

## Environment variables

See `.env.local.example`. Summary:

| Var | Purpose |
| --- | --- |
| `ALGORAND_NETWORK` | `testnet` (default), `mainnet`, or `localnet` |
| `ORGANIZER_MNEMONIC` | Creates events, mints + holds tickets |
| `DISPENSER_MNEMONIC` | Optional; funds new users (defaults to organizer) |
| `NEXT_PUBLIC_USER_TOPUP_ALGO` | Top-up target per user (default `1`) |
| `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` | Web3Auth project client id |
| `NEXT_PUBLIC_WEB3AUTH_NETWORK` | `sapphire_devnet` / `sapphire_mainnet` |
| `NEXT_PUBLIC_ALGOD_SERVER` | Optional algod URL (default AlgoNode TestNet) |

## Notes & production hardening

- **Datastore**: the JSON file store is for local/demo use. Swap
  `src/lib/events-repository.ts` for Postgres/Neon (interface stays the same).
- **Dashboard auth**: the organizer dashboard is unauthenticated in this demo —
  add admin auth before exposing it.
- **Key custody**: organizer/dispenser keys live in server env. For production use
  a KMS/HSM-backed signer.
- **Versions**: Web3Auth pinned to **v10** per requirement (`@web3auth/modal@^10`);
  AlgoKit Utils uses the latest published stable (`v9.2.0`; v10 is still in beta on
  npm), AlgoSDK `v3`.
