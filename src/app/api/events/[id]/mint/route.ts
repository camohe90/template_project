import { NextResponse } from "next/server";
import { getEvent, updateEvent } from "@/lib/events-repository";
import { getAlgorand, getOrganizer } from "@/lib/server-algorand";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Mint the ticket inventory for an event as a single ASA.
 *
 * Each unit of the asset is one ticket (decimals = 0, total = totalTickets).
 * The organizer holds the entire supply until tickets are purchased. We keep
 * `manager`/`reserve` on the organizer so the asset can be reconfigured or
 * destroyed later, and leave `freeze`/`clawback` unset so holders can freely
 * transfer their tickets.
 */
export async function POST(_req: Request, { params }: Ctx) {
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

    const assetName = event.name.slice(0, 32);
    const result = await algorand.send.assetCreate({
      sender: organizer.addr,
      total: BigInt(event.totalTickets),
      decimals: 0,
      assetName,
      unitName: "TICKET",
      url: event.imageUrl || undefined,
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
