import { NextResponse } from "next/server";
import {
  deleteEvent,
  getEvent,
  updateEvent,
} from "@/lib/events-repository";
import { getAlgorand, getOrganizer } from "@/lib/server-algorand";
import type { UpdateEventInput } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ event });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const existing = await getEvent(id);
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: UpdateEventInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Only an event with minted tickets can be set "active".
  if (body.status === "active" && !existing.assetId) {
    return NextResponse.json(
      { error: "Mint tickets before activating the event" },
      { status: 400 },
    );
  }

  const patch: UpdateEventInput = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.description !== undefined) patch.description = String(body.description);
  if (body.venue !== undefined) patch.venue = String(body.venue).trim();
  if (body.date !== undefined) patch.date = String(body.date).trim();
  if (body.imageUrl !== undefined) patch.imageUrl = String(body.imageUrl).trim();
  if (body.priceAlgo !== undefined) patch.priceAlgo = Number(body.priceAlgo);
  if (body.status !== undefined) patch.status = body.status;

  const event = await updateEvent(id, patch);
  return NextResponse.json({ event });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Best-effort: if tickets were minted and none have been sold, destroy the
  // ASA on-chain to reclaim the creator's minimum balance. If units are out in
  // the wild the destroy will fail — we still remove the local record.
  let assetDestroyed = false;
  if (event.assetId && event.ticketsSold === 0) {
    try {
      const algorand = getAlgorand();
      const organizer = getOrganizer();
      await algorand.send.assetDestroy({
        sender: organizer.addr,
        assetId: BigInt(event.assetId),
      });
      assetDestroyed = true;
    } catch {
      // ignore — record is removed regardless
    }
  }

  await deleteEvent(id);
  return NextResponse.json({ ok: true, assetDestroyed });
}
