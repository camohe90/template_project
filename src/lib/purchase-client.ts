import algosdk from "algosdk";
import { getAlgodClient } from "./algod";
import { USDC_ASSET_ID, toBaseUnits, type Currency } from "./constants";

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * Thrown when a USDC purchase can't proceed because the buyer lacks test USDC
 * and the demo faucet couldn't cover them. The UI uses this to show a tutorial.
 * By the time this is thrown the buyer is already opted in to USDC, so they can
 * receive tokens from Circle's faucet immediately.
 */
export class NeedsUsdcError extends Error {
  address: string;
  neededUsdc: number;
  haveUsdc: number;
  constructor(address: string, neededUsdc: number, haveUsdc: number) {
    super("Not enough test USDC");
    this.name = "NeedsUsdcError";
    this.address = address;
    this.neededUsdc = neededUsdc;
    this.haveUsdc = haveUsdc;
  }
}

/** Optional progress reporter for the multi-step purchase flow. */
export type StageReporter = (message: string) => void;

/** Base-unit balance of an asset for an address (0 if not opted in). */
async function assetBalance(address: string, assetId: number): Promise<bigint> {
  try {
    const info = await getAlgodClient().accountAssetInformation(address, assetId).do();
    return BigInt(info.assetHolding?.amount ?? 0);
  } catch {
    return 0n;
  }
}

async function isOptedIn(address: string, assetId: number): Promise<boolean> {
  const info = await getAlgodClient().accountInformation(address).do();
  return (info.assets ?? []).some((a) => Number(a.assetId) === assetId);
}

/**
 * Opt the account in to one or more assets in a single signed step (grouped
 * atomically when there is more than one). No-op when `assetIds` is empty.
 */
async function optInAssets(account: algosdk.Account, assetIds: number[]): Promise<void> {
  if (assetIds.length === 0) return;
  const algod = getAlgodClient();
  const suggestedParams = await algod.getTransactionParams().do();
  const txns = assetIds.map((id) =>
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: account.addr,
      receiver: account.addr,
      assetIndex: BigInt(id),
      amount: 0,
      suggestedParams,
    }),
  );
  if (txns.length > 1) algosdk.assignGroupID(txns);
  const signed = txns.map((t) => t.signTxn(account.sk));
  await algod.sendRawTransaction(signed).do();
  await algosdk.waitForConfirmation(algod, txns[0].txID(), 6);
}

export interface PurchaseTarget {
  id: string;
  assetId: number;
  organizerAddress: string;
  price: number;
  currency: Currency;
}

export interface PurchaseResult {
  ok: boolean;
  txId: string;
  confirmedRound: number;
  assetId: number;
  ticketsSold: number;
}

/** Ensure the buyer has enough USDC, using the faucet if needed (assumes opted in). */
async function ensureUsdcBalance(
  account: algosdk.Account,
  priceBase: bigint,
  onStage?: StageReporter,
): Promise<void> {
  const buyer = account.addr.toString();
  let balance = await assetBalance(buyer, USDC_ASSET_ID);
  if (balance >= priceBase) return;

  onStage?.("Topping up test USDC…");
  const shortfallUsdc = Number(priceBase - balance) / 1_000_000;
  const res = await fetch("/api/usdc-faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: buyer, amount: Math.max(shortfallUsdc, 10) }),
  });

  if (!res.ok) {
    throw new NeedsUsdcError(buyer, Number(priceBase) / 1_000_000, Number(balance) / 1_000_000);
  }

  balance = await assetBalance(buyer, USDC_ASSET_ID);
  if (balance < priceBase) {
    throw new NeedsUsdcError(buyer, Number(priceBase) / 1_000_000, Number(balance) / 1_000_000);
  }
}

/**
 * Build the atomic [payment, ticket-transfer] group, sign the payment leg in
 * the browser, and hand the rest to the server (which signs + submits).
 *
 * All required opt-ins (the ticket ASA, plus USDC for USDC events) are done
 * once, in a single step, at the start of the purchase. Reports progress via
 * `onStage`.
 */
export async function purchaseTicket(
  account: algosdk.Account,
  event: PurchaseTarget,
  onStage?: StageReporter,
): Promise<PurchaseResult> {
  const buyer = account.addr.toString();
  const algod = getAlgodClient();
  const usdcEvent = event.currency === "USDC";
  const priceBase = toBaseUnits(event.price, event.currency);

  // Single opt-in step: opt in to whatever the buyer still needs (USDC for
  // USDC events + the ticket ASA), grouped into one signed transaction.
  const toOptIn: number[] = [];
  if (usdcEvent && !(await isOptedIn(buyer, USDC_ASSET_ID))) toOptIn.push(USDC_ASSET_ID);
  if (!(await isOptedIn(buyer, event.assetId))) toOptIn.push(event.assetId);
  if (toOptIn.length) {
    onStage?.("Setting up your account…");
    await optInAssets(account, toOptIn);
  }

  // For USDC events, make sure the buyer actually holds enough USDC.
  if (usdcEvent) {
    await ensureUsdcBalance(account, priceBase, onStage);
  }

  onStage?.("Awaiting your signature…");
  const suggestedParams = await algod.getTransactionParams().do();

  const paymentLeg = usdcEvent
    ? algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: account.addr,
        receiver: event.organizerAddress,
        assetIndex: BigInt(USDC_ASSET_ID),
        amount: priceBase,
        suggestedParams,
      })
    : algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: account.addr,
        receiver: event.organizerAddress,
        amount: priceBase,
        suggestedParams,
      });

  const ticketAxfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: event.organizerAddress,
    receiver: account.addr,
    assetIndex: BigInt(event.assetId),
    amount: 1,
    suggestedParams,
  });

  algosdk.assignGroupID([paymentLeg, ticketAxfer]);
  const signedPayment = paymentLeg.signTxn(account.sk);

  onStage?.("Finalizing on Algorand…");
  const res = await fetch("/api/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: event.id,
      buyerAddress: buyer,
      signedPaymentTxn: bytesToB64(signedPayment),
      unsignedAxferTxn: bytesToB64(algosdk.encodeUnsignedTransaction(ticketAxfer)),
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Purchase failed");
  return data as PurchaseResult;
}
