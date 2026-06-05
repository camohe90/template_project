import { NextResponse } from "next/server";
import algosdk from "algosdk";
import { algo } from "@algorandfoundation/algokit-utils";
import { getAlgorand, getDispenser, userTopUpAlgo } from "@/lib/server-algorand";

export const runtime = "nodejs";

/**
 * Automatic top-up for brand-new Web3Auth users.
 *
 * Newly derived accounts hold 0 ALGO and cannot meet the minimum balance
 * requirement or pay for asset opt-ins. This endpoint funds them up to a
 * configurable threshold (default 1 ALGO) using AlgoKit's idempotent
 * `ensureFunded` — repeated calls are no-ops once the balance is sufficient.
 */
export async function POST(req: Request) {
  let address: string | undefined;
  try {
    ({ address } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!address || !algosdk.isValidAddress(address)) {
    return NextResponse.json(
      { error: "A valid Algorand address is required" },
      { status: 400 },
    );
  }

  try {
    const algorand = getAlgorand();
    const dispenser = getDispenser();
    const minSpend = algo(userTopUpAlgo());

    const result = await algorand.account.ensureFunded(address, dispenser, minSpend);
    const info = await algorand.account.getInformation(address);

    return NextResponse.json({
      funded: Boolean(result),
      amountFunded: result ? result.amountFunded.algo : 0,
      transactionId: result?.transactionId ?? null,
      balanceAlgo: info.balance.algo,
      minBalanceAlgo: info.minBalance.algo,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Top-up failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
