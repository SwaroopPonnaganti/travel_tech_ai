import type { AppNotification, Booking } from "./types";

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function notificationFromBooking(booking: Booking): AppNotification {
  return {
    id: nextId("n-book"),
    kind: "booking-confirmed",
    channel: "email",
    title: `Booking confirmed · ${booking.ref}`,
    recipient: booking.contactEmail,
    preview: `Your simulated booking ${booking.ref} for ${booking.itinerary.from} → ${booking.itinerary.to} on ${booking.itinerary.date} is confirmed for ${booking.travellers} traveller(s). Demo only — no real ticket was issued.`,
    createdAt: new Date().toISOString(),
    read: false,
    simulated: true,
  };
}

export function notificationFromCancellation(booking: Booking): AppNotification {
  return {
    id: nextId("n-cancel"),
    kind: "booking-cancelled",
    channel: "sms",
    title: `Cancellation processed · ${booking.ref}`,
    recipient: booking.contactEmail,
    preview: `Booking ${booking.ref} (${booking.itinerary.from} → ${booking.itinerary.to}) was cancelled in this simulation. No real refund was issued.`,
    createdAt: new Date().toISOString(),
    read: false,
    simulated: true,
  };
}

/**
 * Starter notifications so the centre is populated on first load.
 * Every entry is a simulated preview — nothing is ever actually sent.
 */
export function seedNotifications(): AppNotification[] {
  return [
    {
      id: "seed-n1",
      kind: "disruption",
      channel: "push",
      title: "6E-2145 running 45 min late",
      recipient: "Swaroop P",
      preview: "Air traffic control restriction at HYD. Estimated new arrival 09:15. RoamAgent is holding your connecting cab.",
      createdAt: "2026-10-17T18:20:00.000Z",
      read: false,
      simulated: true,
    },
    {
      id: "seed-n2",
      kind: "alternative",
      channel: "email",
      title: "Suggested alternative for TBS-4821",
      recipient: "you@example.com",
      preview: "A simulated alternative keeps you within your arrival deadline. Open My Trips to compare it before you decide.",
      createdAt: "2026-10-17T18:25:00.000Z",
      read: false,
      simulated: true,
    },
    {
      id: "seed-n3",
      kind: "price-drop",
      channel: "push",
      title: "Price drop of ₹1,240 on Bengaluru → Hyderabad",
      recipient: "Swaroop P",
      preview: "A watched simulated fare dropped. Preview only — no live fares are monitored.",
      createdAt: "2026-10-16T09:05:00.000Z",
      read: true,
      simulated: true,
    },
  ];
}
