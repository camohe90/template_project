import type { Currency } from "./constants";

export type EventStatus = "draft" | "active" | "paused";

export interface TicketEvent {
  id: string;
  name: string;
  description: string;
  venue: string;
  /** ISO date string for when the event takes place. */
  date: string;
  /** Ticket artwork — a served upload path (/api/uploads/...) or external URL. */
  imageUrl?: string;
  totalTickets: number;
  /** Ticket price in display units of `currency`. */
  price: number;
  currency: Currency;
  status: EventStatus;
  /** ASA id of the ticket asset, set once tickets are minted. */
  assetId?: number;
  /** Organizer/treasury address that created and holds the tickets. */
  organizerAddress?: string;
  ticketsSold: number;
  createdAt: string;
}

export type CreateEventInput = Pick<
  TicketEvent,
  "name" | "description" | "venue" | "date" | "price" | "currency" | "totalTickets"
> & { imageUrl?: string };

export type UpdateEventInput = Partial<
  Pick<
    TicketEvent,
    "name" | "description" | "venue" | "date" | "price" | "currency" | "imageUrl" | "status"
  >
>;
