import algosdk from "algosdk";
import { getAlgodClient } from "./algod";
import { USDC_ASSET_ID, toBaseUnits, type Currency } from "./constants";

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

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

/** Opt an account in to an asset (0-amount self transfer). */
async function optIn(account: algosdk.Account, assetId: number): Promise<void> {
  const algod = getAlgodClient();
  const suggestedParams = await algod.getTransactionParams().do();
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: account.addr,
    receiver: account.addr,
    assetIndex: BigInt(assetId),
    amount: 0,
    suggestedParams,
  });
  const signed = txn.signTxn(account.sk);
  await algod.sendRawTransaction(signed).do();
  await algosdk.waitForConfirmation(algod, txn.txID(), 6);
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

/** Ensure the buyer holds enough USDC, opting in and using the faucet if needed. */
async function ensureUsdc(account: algosdk.Account, priceBase: bigint): Promise<void> {
  const buyer = account.addr.toString();

  if (!(await isOptedIn(buyer, USDC_ASSET_ID))) {
    await optIn(account, USDC_ASSET_ID);
  }

  let balance = await assetBalance(buyer, USDC_ASSET_ID);
  if (balance >= priceBase) return;

  // Top up from the demo faucet (best effort), then re-check.
  const shortfallUsdc = Number(priceBase - balance) / 1_000_000;
  const res = await fetch("/api/usdc-faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: buyer, amount: Math.max(shortfallUsdc, 10) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.error ??
        "You don't have enough test USDC. Get some from Circle's TestNet faucet (faucet.circle.com).",
    );
  }

  balance = await assetBalance(buyer, USDC_ASSET_ID);
  if (balance < priceBase) {
    throw new Error("Test USDC top-up did not arrive in time. Please try again.");
  }
}

/**
 * Build the atomic [payment, ticket-transfer] group, sign the payment leg in
 * the browser, and hand the rest to the server (which signs + submits). Handles
 * both ALGO and USDC events, opting the buyer in to the ticket ASA (and USDC)
 * as needed.
 */
export async function purchaseTicket(
  account: algosdk.Account,
  event: PurchaseTarget,
): Promise<PurchaseResult> {
  const buyer = account.addr.toString();
  const algod = getAlgodClient();
  const priceBase = toBaseUnits(event.price, event.currency);

  // Opt in to the ticket asset so the buyer can receive it.
  if (!(await isOptedIn(buyer, event.assetId))) {
    await optIn(account, event.assetId);
  }

  // For USDC events, make sure the buyer holds enough USDC.
  if (event.currency === "USDC") {
    await ensureUsdc(account, priceBase);
  }

  const suggestedParams = await algod.getTransactionParams().do();

  const paymentLeg =
    event.currency === "USDC"
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
