import algosdk from "algosdk";
import { getAlgodClient } from "./algod";

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Returns true if the address already holds (is opted in to) the asset. */
export async function isOptedIn(address: string, assetId: number): Promise<boolean> {
  const algod = getAlgodClient();
  const info = await algod.accountInformation(address).do();
  return (info.assets ?? []).some((a) => Number(a.assetId) === assetId);
}

/** Opt the buyer in to the ticket ASA (required before they can receive one). */
export async function optIn(account: algosdk.Account, assetId: number): Promise<string> {
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
  return txn.txID();
}

export interface PurchaseTarget {
  id: string;
  assetId: number;
  organizerAddress: string;
  priceAlgo: number;
}

export interface PurchaseResult {
  ok: boolean;
  txId: string;
  confirmedRound: number;
  assetId: number;
  ticketsSold: number;
}

/**
 * Build the atomic [payment, asset-transfer] group, sign the payment leg in the
 * browser, and hand the rest to the server (which signs + submits). Opts the
 * buyer in first if necessary.
 */
export async function purchaseTicket(
  account: algosdk.Account,
  event: PurchaseTarget,
): Promise<PurchaseResult> {
  const buyer = account.addr.toString();
  const algod = getAlgodClient();

  if (!(await isOptedIn(buyer, event.assetId))) {
    await optIn(account, event.assetId);
  }

  const suggestedParams = await algod.getTransactionParams().do();
  const priceMicroAlgos = BigInt(Math.round(event.priceAlgo * 1_000_000));

  const payment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
    sender: account.addr,
    receiver: event.organizerAddress,
    amount: priceMicroAlgos,
    suggestedParams,
  });

  const axfer = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: event.organizerAddress,
    receiver: account.addr,
    assetIndex: BigInt(event.assetId),
    amount: 1,
    suggestedParams,
  });

  algosdk.assignGroupID([payment, axfer]);

  const signedPayment = payment.signTxn(account.sk);

  const res = await fetch("/api/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: event.id,
      buyerAddress: buyer,
      signedPaymentTxn: bytesToB64(signedPayment),
      unsignedAxferTxn: bytesToB64(algosdk.encodeUnsignedTransaction(axfer)),
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Purchase failed");
  return data as PurchaseResult;
}
