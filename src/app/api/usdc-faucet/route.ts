import { NextResponse } from "next/server";
import algosdk from "algosdk";
import {
  assetBalance,
  getAlgorand,
  getDispenser,
} from "@/lib/server-algorand";
import { USDC_ASSET_ID, toBaseUnits } from "@/lib/constants";

export const runtime = "nodejs";

/**
 * Best-effort test-USDC faucet for the demo.
 *
 * Sends test USDC from the dispenser to an already-opted-in buyer so they can
 * pay for USDC-priced tickets. The buyer must opt in to USDC client-side first
 * (the server cannot opt in on their behalf). If the dispenser holds no test
 * USDC, we return guidance to Circle's TestNet faucet.
 */
export async function POST(req: Request) {
  let address: string | undefined;
  let amount: number | undefined;
  try {
    ({ address, amount } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!address || !algosdk.isValidAddress(address)) {
    return NextResponse.json({ error: "A valid Algorand address is required" }, { status: 400 });
  }

  const requested = Number.isFinite(amount) && (amount as number) > 0 ? (amount as number) : 10;
  const needed = toBaseUnits(requested, "USDC");

  const algorand = getAlgorand();
  const dispenser = getDispenser();

  const dispenserBalance = await assetBalance(dispenser.addr.toString(), USDC_ASSET_ID);
  if (dispenserBalance < needed) {
    return NextResponse.json(
      {
        error:
          "The dispenser has no test USDC to hand out. Fund the organizer/dispenser " +
          "with test USDC from Circle's faucet (https://faucet.circle.com, select " +
          "Algorand TestNet), or get USDC for this address there directly.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await algorand.send.assetTransfer({
      sender: dispenser.addr,
      receiver: address,
      assetId: BigInt(USDC_ASSET_ID),
      amount: needed,
    });
    return NextResponse.json({ ok: true, amount: requested, txId: result.txIds[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "USDC faucet failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
