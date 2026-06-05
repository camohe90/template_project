export type EventStatus = "draft" | "active" | "paused";

export interface TicketEvent {
  id: string;
  name: string;
  description: string;
  venue: string;
  /** ISO date string for when the event takes place. */
  date: string;
  imageUrl?: string;
  totalTickets: number;
  /** Price per ticket, in whole ALGO. */
  priceAlgo: number;
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
  "name" | "description" | "venue" | "date" | "priceAlgo" | "totalTickets"
> & { imageUrl?: string };

export type UpdateEventInput = Partial<
  Pick<
    TicketEvent,
    "name" | "description" | "venue" | "date" | "priceAlgo" | "imageUrl" | "status"
  >
>;
