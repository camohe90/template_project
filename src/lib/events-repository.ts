import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  CreateEventInput,
  TicketEvent,
  UpdateEventInput,
} from "./types";

/**
 * Tiny JSON-file backed store for event metadata.
 *
 * This is intentionally simple so the demo runs with zero external
 * infrastructure. For production, swap this module for a real database
 * (e.g. Postgres/Neon) — the rest of the app only depends on the exported
 * functions below.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "events.json");

// Serialize writes within a single server process to avoid lost updates.
let writeChain: Promise<unknown> = Promise.resolve();

async function readAll(): Promise<TicketEvent[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as TicketEvent[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(events: TicketEvent[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(events, null, 2), "utf8");
}

function mutate<T>(fn: (events: TicketEvent[]) => Promise<{ events: TicketEvent[]; result: T }>): Promise<T> {
  const next = writeChain.then(async () => {
    const events = await readAll();
    const { events: updated, result } = await fn(events);
    await writeAll(updated);
    return result;
  });
  // keep the chain alive even if this op rejects
  writeChain = next.catch(() => undefined);
  return next;
}

export async function listEvents(): Promise<TicketEvent[]> {
  const events = await readAll();
  return events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEvent(id: string): Promise<TicketEvent | undefined> {
  const events = await readAll();
  return events.find((e) => e.id === id);
}

export async function createEvent(input: CreateEventInput): Promise<TicketEvent> {
  const event: TicketEvent = {
    id: randomUUID(),
    name: input.name,
    description: input.description,
    venue: input.venue,
    date: input.date,
    imageUrl: input.imageUrl,
    totalTickets: input.totalTickets,
    priceAlgo: input.priceAlgo,
    status: "draft",
    ticketsSold: 0,
    createdAt: new Date().toISOString(),
  };
  return mutate(async (events) => {
    events.push(event);
    return { events, result: event };
  });
}

export async function updateEvent(
  id: string,
  patch: UpdateEventInput & Partial<Pick<TicketEvent, "assetId" | "organizerAddress" | "status">>,
): Promise<TicketEvent | undefined> {
  return mutate(async (events) => {
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) return { events, result: undefined };
    events[idx] = { ...events[idx], ...patch };
    return { events, result: events[idx] };
  });
}

export async function incrementSold(id: string, by = 1): Promise<TicketEvent | undefined> {
  return mutate(async (events) => {
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) return { events, result: undefined };
    events[idx] = { ...events[idx], ticketsSold: events[idx].ticketsSold + by };
    return { events, result: events[idx] };
  });
}

export async function deleteEvent(id: string): Promise<boolean> {
  return mutate(async (events) => {
    const next = events.filter((e) => e.id !== id);
    return { events: next, result: next.length !== events.length };
  });
}
