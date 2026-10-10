import type {
  Booking,
  BookingItinerary,
  BookingStatus,
  CreateBookingInput,
  FareBreakdown,
  Itinerary,
  Leg,
  PlannedItinerary,
  TravellerDetails,
  Trip,
} from "./types";
import { itineraries as legacyItineraries, trips as legacyTrips } from "./mock";

/** Optional booking extras. Prices are per booking, in INR. */
export const ADD_ONS: Array<{ id: string; label: string; price: number }> = [
  { id: "meal", label: "Pre-book meal", price: 350 },
  { id: "insurance", label: "Travel insurance", price: 199 },
  { id: "lounge", label: "Airport lounge access", price: 1200 },
];

export const TAX_RATE = 0.12;
export const REFUNDABLE_DISCOUNT_RATE = 0.05;
export const MAX_TRAVELLERS = 9;
export const MIN_ID_LENGTH = 5;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REF_PREFIX = "TBS";

export function emptyTraveller(): TravellerDetails {
  return { firstName: "", lastName: "", idNumber: "" };
}

export function addOnTotal(ids: string[]): number {
  return ids.reduce((sum, id) => sum + (ADD_ONS.find((a) => a.id === id)?.price ?? 0), 0);
}

/** Itemised fare for a selected itinerary. Pure so client and server agree. */
export function computeFare(itinerary: BookingItinerary, travellers: number, addOns: string[]): FareBreakdown {
  const count = Math.max(1, Math.floor(travellers) || 1);
  const perPerson = itinerary.price;
  const baseFare = perPerson * count;
  const taxes = Math.round(baseFare * TAX_RATE);
  const extras = addOnTotal(addOns);
  const discount = itinerary.refundable ? Math.round(baseFare * REFUNDABLE_DISCOUNT_RATE) : 0;
  const total = baseFare + taxes + extras - discount;
  return { baseFare, taxes, addOns: extras, discount, total, perPerson };
}

/** Human-readable assumptions attached to every simulated booking. */
export function bookingAssumptions(itinerary: BookingItinerary): string[] {
  const assumptions = [
    "This is a simulated booking — no payment is taken and no real reservation is made.",
    "All fares, schedules, seats and operators are simulated demonstration data.",
    `Fare is per traveller plus ${Math.round(TAX_RATE * 100)}% taxes and fees.`,
  ];
  if (itinerary.refundable) {
    assumptions.push(`Refundable itinerary: a ${Math.round(REFUNDABLE_DISCOUNT_RATE * 100)}% refundable discount has been applied.`);
  }
  assumptions.push(
    itinerary.legs.length === 1
      ? "Single-leg door-to-door journey as selected."
      : `${itinerary.legs.length} connected legs with transfer buffers included.`,
  );
  return assumptions;
}

/** Freeze a planning-engine itinerary into the bookable snapshot shape. */
export function bookingItineraryFromPlanned(it: PlannedItinerary): BookingItinerary {
  const legs: Leg[] = it.connections.map((c) => ({
    mode: c.mode,
    operator: c.operator,
    code: c.code,
    depart: c.depart,
    arrive: c.arrive,
    durationMin: c.durationMin,
    from: c.fromStop,
    to: c.toStop,
  }));
  return {
    id: it.id,
    title: `${it.from} → ${it.to}`,
    from: it.from,
    to: it.to,
    date: it.date,
    legs,
    price: it.fare,
    refundable: false,
    simulated: true,
  };
}

/** Freeze a legacy itinerary into the bookable snapshot shape. */
export function bookingItineraryFromLegacy(it: Itinerary): BookingItinerary {
  return {
    id: it.id,
    title: `${it.from} → ${it.to} · ${it.title}`,
    from: it.from,
    to: it.to,
    date: it.date,
    legs: it.legs,
    price: it.price,
    refundable: it.refundable,
    simulated: true,
  };
}

/** Normalise either itinerary shape into the bookable snapshot. */
export function normalizeToBookingItinerary(source: Itinerary | PlannedItinerary): BookingItinerary {
  return "connections" in source ? bookingItineraryFromPlanned(source) : bookingItineraryFromLegacy(source);
}

export function seatForPreference(preference: string): string {
  if (preference === "window") return "12A";
  if (preference === "aisle") return "12C";
  return "Assigned at check-in";
}

/** Validate a booking request. Returns a map of field → message (empty = valid). */
export function validateBookingInput(input: CreateBookingInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.confirmed) errors.confirmed = "Booking requires explicit confirmation";

  const it = input.itinerary;
  if (!it || !it.from || !it.to || !it.date || !Array.isArray(it.legs) || it.legs.length === 0) {
    errors.itinerary = "Select a valid itinerary";
  }

  const passengers = input.passengers ?? [];
  if (passengers.length < 1) {
    errors.passengers = "Add at least one traveller";
  }
  if (passengers.length > MAX_TRAVELLERS) {
    errors.passengers = `A maximum of ${MAX_TRAVELLERS} travellers is supported`;
  }
  passengers.forEach((p, idx) => {
    if (!p.firstName?.trim()) errors[`first-${idx}`] = "First name required";
    if (!p.lastName?.trim()) errors[`last-${idx}`] = "Last name required";
    if (!p.idNumber || p.idNumber.trim().length < MIN_ID_LENGTH) {
      errors[`id-${idx}`] = "Enter a valid ID number";
    }
  });

  if (!input.contactEmail || !EMAIL_RE.test(input.contactEmail)) {
    errors.email = "Enter a valid email address";
  }

  return errors;
}

export function assertConfirmed(input: { confirmed?: boolean }): void {
  if (!input?.confirmed) {
    throw new Error("Booking requires explicit confirmation");
  }
}

/**
 * Generate a unique demo booking reference. Deterministic given an rng, so it
 * can be unit-tested. Collisions against existing refs are skipped.
 */
export function generateBookingRef(existing: Iterable<string>, rng: () => number = Math.random): string {
  const taken = new Set(existing);
  for (let attempt = 0; attempt < 1000; attempt++) {
    const n = 1000 + Math.floor(rng() * 9000);
    const ref = `${REF_PREFIX}-${n}`;
    if (!taken.has(ref)) return ref;
  }
  return `${REF_PREFIX}-${Date.now().toString().slice(-4)}`;
}

export function maskIdNumber(id: string): string {
  const trimmed = (id ?? "").trim();
  if (trimmed.length <= 4) return "••••";
  return "•".repeat(Math.min(8, trimmed.length - 4)) + trimmed.slice(-4);
}

export function newBookingId(now: number = Date.now(), rng: () => number = Math.random): string {
  return `bk-${now.toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`;
}

export interface BuildLocalBookingOptions {
  id?: string;
  ref?: string;
  status?: BookingStatus;
  createdAt?: string;
  existingRefs?: Iterable<string>;
  now?: number;
  rng?: () => number;
}

/** Assemble a Booking from a validated input (used by the API and the offline demo path). */
export function buildLocalBooking(input: CreateBookingInput, options: BuildLocalBookingOptions = {}): Booking {
  const rng = options.rng ?? Math.random;
  const now = options.now ?? Date.now();
  const travellers = input.passengers.length;
  const fare = computeFare(input.itinerary, travellers, input.addOns);
  const ref = options.ref ?? generateBookingRef(options.existingRefs ?? [], rng);
  return {
    id: options.id ?? newBookingId(now, rng),
    ref,
    status: options.status ?? "confirmed",
    itinerary: input.itinerary,
    passengers: input.passengers,
    travellers,
    contactEmail: input.contactEmail,
    seatPreference: input.seatPreference,
    seat: seatForPreference(input.seatPreference),
    addOns: input.addOns,
    fare,
    assumptions: bookingAssumptions(input.itinerary),
    consentNotifications: input.consentNotifications,
    simulated: true,
    createdAt: options.createdAt ?? new Date(now).toISOString(),
    cancelledAt: null,
  };
}

export function bookingStatusToTripStatus(status: BookingStatus): Trip["status"] {
  if (status === "confirmed") return "upcoming";
  if (status === "completed") return "completed";
  return "cancelled";
}

/** Legacy-compatible Trip view so existing dashboard widgets keep working. */
export function bookingToTrip(booking: Booking): Trip {
  return {
    id: booking.id,
    ref: booking.ref,
    title: booking.itinerary.title,
    from: booking.itinerary.from,
    to: booking.itinerary.to,
    startDate: booking.itinerary.date,
    endDate: booking.itinerary.date,
    status: bookingStatusToTripStatus(booking.status),
    travellers: booking.travellers,
    price: booking.fare.total,
    itineraryId: booking.itinerary.id,
    seat: booking.seat,
    checkInOpen: false,
  };
}

export function demoPassengers(count: number): TravellerDetails[] {
  return Array.from({ length: Math.max(1, count) }, (_, i) => ({
    firstName: `Traveller ${i + 1}`,
    lastName: "Demo",
    idNumber: `DEMO${String(i + 1).padStart(4, "0")}`,
  }));
}

export function demoBooking(itinerary: BookingItinerary, opts: Partial<Booking> & { travellers: number }): Booking {
  const travellers = opts.travellers;
  const addOns = opts.addOns ?? [];
  return {
    id: opts.id ?? `seed-${itinerary.id}`,
    ref: opts.ref ?? "TBS-0000",
    status: opts.status ?? "confirmed",
    itinerary,
    passengers: opts.passengers ?? demoPassengers(travellers),
    travellers,
    contactEmail: opts.contactEmail ?? "you@example.com",
    seatPreference: opts.seatPreference ?? "window",
    seat: opts.seat ?? seatForPreference(opts.seatPreference ?? "window"),
    addOns,
    fare: computeFare(itinerary, travellers, addOns),
    assumptions: bookingAssumptions(itinerary),
    consentNotifications: opts.consentNotifications ?? false,
    simulated: true,
    createdAt: opts.createdAt ?? "2026-10-01T09:00:00.000Z",
    cancelledAt: opts.cancelledAt ?? null,
  };
}

/** Offline fallback bookings, converted from the bundled demo data. */
export function seedBookings(): Booking[] {
  return legacyTrips.map((trip) => {
    const itinerary =
      legacyItineraries.find((i) => i.id === trip.itineraryId) ?? legacyItineraries[0]!;
    return demoBooking(bookingItineraryFromLegacy(itinerary), {
      id: trip.id,
      ref: trip.ref,
      status: bookingStatusFromTrip(trip.status),
      travellers: trip.travellers,
      seat: trip.seat,
      createdAt: `${trip.startDate}T09:00:00.000Z`,
      cancelledAt: trip.status === "cancelled" ? `${trip.startDate}T09:00:00.000Z` : null,
    });
  });
}

export function bookingStatusFromTrip(status: Trip["status"]): BookingStatus {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "confirmed";
}
