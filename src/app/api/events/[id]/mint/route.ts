import { NextResponse } from "next/server";
import { getEvent, updateEvent } from "@/lib/events-repository";
import { ensureOptedIn, getAlgorand, getOrganizer } from "@/lib/server-algorand";
import { USDC_ASSET_ID } from "@/lib/constants";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** ASA URLs are capped at 96 bytes — only attach the artwork URL if it fits. */
function assetUrlFor(imageUrl: string | undefined, origin: string): string | undefined {
  if (!imageUrl) return undefined;
  const abs = imageUrl.startsWith("http") ? imageUrl : `${origin}${imageUrl}`;
  return abs.length <= 96 ? abs : undefined;
}

/**
 * Mint the ticket inventory for an event as a single ASA.
 *
 * Each unit of the asset is one ticket (decimals = 0, total = totalTickets).
 * The organizer holds the entire supply until tickets are purchased. We keep
 * `manager`/`reserve` on the organizer so the asset can be reconfigured or
 * destroyed later, and leave `freeze`/`clawback` unset so holders can freely
 * transfer their tickets.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.assetId) {
    return NextResponse.json(
      { error: "Tickets already minted", assetId: event.assetId },
      { status: 409 },
    );
  }

  try {
    const algorand = getAlgorand();
    const organizer = getOrganizer();

    // For USDC-priced events the organizer must hold USDC to receive payments.
    if (event.currency === "USDC") {
      await ensureOptedIn(organizer, USDC_ASSET_ID);
    }

    const origin = new URL(req.url).origin;
    const assetName = event.name.slice(0, 32);
    const result = await algorand.send.assetCreate({
      sender: organizer.addr,
      total: BigInt(event.totalTickets),
      decimals: 0,
      assetName,
      unitName: "TICKET",
      url: assetUrlFor(event.imageUrl, origin),
      manager: organizer.addr,
      reserve: organizer.addr,
      defaultFrozen: false,
    });

    const assetId = Number(result.assetId);
    const updated = await updateEvent(id, {
      assetId,
      organizerAddress: organizer.addr.toString(),
      status: "active",
    });

    return NextResponse.json({ event: updated, assetId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mint failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
