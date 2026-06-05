# Tixo — NFT Ticketing on Algorand

An end-to-end NFT ticketing app on **Algorand TestNet**. Tickets are minted as
**Algorand Standard Assets (ASAs)** — no smart contracts. Buyers sign in with
**Web3Auth v10**, get auto-funded, and pay with **ALGO or USDC**. Built on the
latest **AlgoKit Utils** and **AlgoSDK**.

## Two separate surfaces

| Surface | Routes | Who | What |
| --- | --- | --- | --- |
| **User app** | `/`, `/events`, `/tickets` | Fans | Discover events, buy tickets, view owned tickets |
| **Organizer console** | `/admin` | Organizers | Create events, upload ticket artwork, mint, pause/resume, delete |

Each has its own layout/navigation. The user app is a polished storefront; the
admin console is a back-office dashboard.

## Features

- **Image-based ticket NFTs** — organizers upload artwork when creating an event.
  It's used as the ASA's artwork and is what buyers see in the marketplace and in
  their **My tickets** wallet view, like a real-world ticket.
- **ALGO and USDC payments** — choose the currency per event. Purchases are atomic:
  the payment leg (ALGO payment or USDC transfer) and the ticket transfer settle in
  a single grouped transaction.
- **Web3Auth onboarding + auto top-up** — new accounts are derived from the social
  login and funded with ALGO so they can meet the MBR and pay opt-in costs. A demo
  USDC faucet seeds buyers with test USDC when the dispenser holds some.

### How the pieces map

| Concern | Implementation |
| --- | --- |
| Ticket NFT | One ASA per event (`decimals: 0`, `total = totalTickets`), `algorand.send.assetCreate`; artwork URL set as the ASA `url` |
| Wallet / login | Web3Auth v10 (`@web3auth/modal`); key reinterpreted as an Algorand Ed25519 key (`src/lib/web3auth.ts`) |
| ALGO top-up | `POST /api/faucet` → `algorand.account.ensureFunded(addr, dispenser, algo(1))` (idempotent) |
| USDC top-up | `POST /api/usdc-faucet` → best-effort test USDC from the dispenser |
| Image upload | `POST /api/uploads` (saved under `data/uploads`), served by `GET /api/uploads/[name]` |
| Purchase | Atomic `[payment-or-USDC, ticket-transfer]` group: buyer signs the payment leg in-browser, server signs the ticket transfer (`/api/purchase`) |
| Event storage | JSON file (`data/events.json`) via `src/lib/events-repository.ts` — swap for a real DB in production |

## Setup

```bash
npm install
cp .env.local.example .env.local   # (or use a .env file)
```

### 1. Organizer account

```bash
npm run gen:account
```

Put the printed mnemonic in `ORGANIZER_MNEMONIC` (single line, 25 words) and fund
the address on TestNet at https://bank.testnet.algorand.network. This account mints
tickets, receives payments, and (by default) funds new users.

### 2. Web3Auth

Create a "Plug and Play" project at https://dashboard.web3auth.io, then set
`NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` and add `http://localhost:3000` to allowed origins.

### 3. (Optional) USDC

To sell tickets priced in USDC, fund the organizer/dispenser with test USDC from
https://faucet.circle.com (select **Algorand TestNet**). The organizer auto-opts-in
to USDC the first time you mint a USDC event.

### 4. Run

```bash
npm run dev      # http://localhost:3000
```

Flow: `/admin` → create event (upload artwork, pick ALGO/USDC) → **Mint tickets** →
`/events` → sign in → **Buy ticket** → see it in **My tickets**.

## Environment variables

| Var | Purpose |
| --- | --- |
| `ALGORAND_NETWORK` | `testnet` (default), `mainnet`, or `localnet` |
| `ORGANIZER_MNEMONIC` | Creates events, mints + holds tickets, receives payments |
| `DISPENSER_MNEMONIC` | Optional; funds new users (defaults to organizer) |
| `NEXT_PUBLIC_USER_TOPUP_ALGO` | ALGO top-up target per user (default `1`) |
| `NEXT_PUBLIC_USDC_ASSET_ID` | USDC ASA id (default TestNet `10458941`) |
| `NEXT_PUBLIC_WEB3AUTH_CLIENT_ID` | Web3Auth project client id |
| `NEXT_PUBLIC_WEB3AUTH_NETWORK` | `sapphire_devnet` / `sapphire_mainnet` |
| `NEXT_PUBLIC_ALGOD_SERVER` | Optional algod URL (default AlgoNode TestNet) |

## Production hardening

- **Datastore + uploads**: the JSON store and `data/uploads` are for local/demo use.
  Use a database and object storage (e.g. S3 / Vercel Blob) in production; pin NFT
  artwork to IPFS and set ARC-3/ARC-19 metadata for fully on-chain tickets.
- **Admin auth**: `/admin` is unauthenticated in this demo — add admin auth before
  exposing it.
- **Key custody**: organizer/dispenser keys live in server env. Use a KMS/HSM signer
  for production.
- **Versions**: Web3Auth `@web3auth/modal@^10` (per requirement); AlgoKit Utils
  `v9.2.0` (latest stable; v10 is beta on npm), AlgoSDK `v3`.
