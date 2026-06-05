import { NextResponse } from "next/server";
import algosdk from "algosdk";
import { getEvent, incrementSold } from "@/lib/events-repository";
import { getAlgorand, getOrganizer } from "@/lib/server-algorand";
import { USDC_ASSET_ID, toBaseUnits } from "@/lib/constants";

export const runtime = "nodejs";

/**
 * Atomic ticket purchase.
 *
 * The client builds a 2-transaction atomic group:
 *   [0] payment leg : buyer -> organizer  (ticket price)
 *                     - ALGO events: a payment transaction
 *                     - USDC events: a USDC asset-transfer transaction
 *   [1] ticket axfer: organizer -> buyer  (1 ticket unit of the event ASA)
 *
 * The buyer signs txn[0] in the browser (Web3Auth key). The organizer's half
 * (txn[1]) can only be signed server-side, so the client posts its signed
 * payment plus the unsigned asset transfer here. We re-validate every field,
 * sign the transfer with the organizer account, and submit the group. Because
 * the two transactions share a group id, the payment only settles if the
 * ticket transfer settles too — no trust required in either direction.
 */
function b64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function sameGroup(a?: Uint8Array, b?: Uint8Array): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export async function POST(req: Request) {
  let payload: {
    eventId?: string;
    buyerAddress?: string;
    signedPaymentTxn?: string;
    unsignedAxferTxn?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { eventId, buyerAddress, signedPaymentTxn, unsignedAxferTxn } = payload;
  if (!eventId || !buyerAddress || !signedPaymentTxn || !unsignedAxferTxn) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const event = await getEvent(eventId);
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.status !== "active" || !event.assetId) {
    return NextResponse.json({ error: "Event is not on sale" }, { status: 400 });
  }
  if (event.ticketsSold >= event.totalTickets) {
    return NextResponse.json({ error: "Sold out" }, { status: 409 });
  }

  const algorand = getAlgorand();
  const organizer = getOrganizer();
  const organizerAddr = organizer.addr.toString();
  const expectedPrice = toBaseUnits(event.price, event.currency);

  // Decode both halves of the group.
  let payTxn: algosdk.Transaction;
  let signedPayBytes: Uint8Array;
  let axfer: algosdk.Transaction;
  try {
    signedPayBytes = b64ToBytes(signedPaymentTxn);
    payTxn = algosdk.decodeSignedTransaction(signedPayBytes).txn;
    axfer = algosdk.decodeUnsignedTransaction(b64ToBytes(unsignedAxferTxn));
  } catch {
    return NextResponse.json({ error: "Could not decode transactions" }, { status: 400 });
  }

  // Validate the payment leg — shape depends on the event currency.
  const payValid =
    payTxn.sender.toString() === buyerAddress &&
    (event.currency === "USDC"
      ? payTxn.assetTransfer?.receiver.toString() === organizerAddr &&
        payTxn.assetTransfer?.assetIndex === BigInt(USDC_ASSET_ID) &&
        payTxn.assetTransfer?.amount === expectedPrice
      : payTxn.payment?.receiver.toString() === organizerAddr &&
        payTxn.payment?.amount === expectedPrice);

  if (!payValid) {
    return NextResponse.json(
      { error: `Payment transaction does not match the ${event.currency} ticket price` },
      { status: 400 },
    );
  }

  // Validate the asset-transfer leg.
  if (
    axfer.sender.toString() !== organizerAddr ||
    axfer.assetTransfer?.receiver.toString() !== buyerAddress ||
    axfer.assetTransfer?.assetIndex !== BigInt(event.assetId) ||
    axfer.assetTransfer?.amount !== 1n
  ) {
    return NextResponse.json(
      { error: "Asset transfer transaction is invalid" },
      { status: 400 },
    );
  }

  // Both legs must belong to the same atomic group.
  if (!sameGroup(payTxn.group, axfer.group)) {
    return NextResponse.json(
      { error: "Transactions are not part of the same atomic group" },
      { status: 400 },
    );
  }

  try {
    const [signedAxferBytes] = await organizer.signer([axfer], [0]);
    const algod = algorand.client.algod;

    await algod.sendRawTransaction([signedPayBytes, signedAxferBytes]).do();
    const confirmed = await algosdk.waitForConfirmation(algod, payTxn.txID(), 6);

    const updated = await incrementSold(eventId, 1);

    return NextResponse.json({
      ok: true,
      txId: payTxn.txID(),
      confirmedRound: Number(confirmed.confirmedRound ?? 0),
      assetId: event.assetId,
      ticketsSold: updated?.ticketsSold ?? event.ticketsSold + 1,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Purchase failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
