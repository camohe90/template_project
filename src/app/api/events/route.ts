import { NextResponse } from "next/server";
import { createEvent, listEvents } from "@/lib/events-repository";
import type { CreateEventInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const events = await listEvents();
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  let body: Partial<CreateEventInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const venue = body.venue?.trim();
  const date = body.date?.trim();
  const description = body.description?.trim() ?? "";
  const totalTickets = Number(body.totalTickets);
  const price = Number(body.price);
  const currency = body.currency === "USDC" ? "USDC" : "ALGO";

  if (!name || !venue || !date) {
    return NextResponse.json(
      { error: "name, venue and date are required" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(totalTickets) || totalTickets <= 0) {
    return NextResponse.json(
      { error: "totalTickets must be a positive integer" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: "price must be a non-negative number" },
      { status: 400 },
    );
  }

  const event = await createEvent({
    name,
    venue,
    date,
    description,
    totalTickets,
    price,
    currency,
    imageUrl: body.imageUrl?.trim() || undefined,
  });

  return NextResponse.json({ event }, { status: 201 });
}
