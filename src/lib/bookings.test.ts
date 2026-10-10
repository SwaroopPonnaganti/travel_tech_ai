import { describe, it, expect } from "vitest";
import {
  ADD_ONS,
  bookingAssumptions,
  bookingItineraryFromLegacy,
  bookingItineraryFromPlanned,
  bookingStatusFromTrip,
  bookingToTrip,
  buildLocalBooking,
  computeFare,
  generateBookingRef,
  normalizeToBookingItinerary,
  seedBookings,
  TAX_RATE,
  validateBookingInput,
} from "./bookings";
import { itineraries } from "./mock";
import { planItineraries } from "./itinerary";
import { createEmptyTripPlan } from "./planner";
import { DEMO_SERVICE_DATE } from "./connections";
import type { CreateBookingInput, PlannedItinerary } from "./types";

const legacy = itineraries[0]!;
const bookingItinerary = bookingItineraryFromLegacy(legacy);

function validInput(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    itinerary: bookingItinerary,
    passengers: [{ firstName: "Asha", lastName: "Rao", idNumber: "P1234567" }],
    contactEmail: "asha@example.com",
    seatPreference: "window",
    addOns: [],
    consentNotifications: true,
    confirmed: true,
    ...overrides,
  };
}

function demoPlanned(): PlannedItinerary {
  const result = planItineraries({
    ...createEmptyTripPlan(),
    origin: "Visakhapatnam",
    destination: "Hyderabad",
    departureDate: DEMO_SERVICE_DATE,
    passengers: 2,
  });
  return [...result.feasible, ...result.alternatives][0]!;
}

describe("computeFare", () => {
  it("itemises base, taxes, add-ons, discount and total", () => {
    const fare = computeFare(bookingItinerary, 2, []);
    const base = bookingItinerary.price * 2;
    expect(fare.baseFare).toBe(base);
    expect(fare.taxes).toBe(Math.round(base * TAX_RATE));
    expect(fare.discount).toBe(bookingItinerary.refundable ? Math.round(base * 0.05) : 0);
    expect(fare.total).toBe(fare.baseFare + fare.taxes + fare.addOns - fare.discount);
  });

  it("adds optional extras", () => {
    const ids = ADD_ONS.map((a) => a.id);
    const fare = computeFare(bookingItinerary, 1, ids);
    expect(fare.addOns).toBe(ADD_ONS.reduce((sum, a) => sum + a.price, 0));
  });

  it("clamps the traveller count to at least one", () => {
    expect(computeFare(bookingItinerary, 0, []).baseFare).toBe(bookingItinerary.price);
  });
});

describe("itinerary normalisation", () => {
  it("freezes a legacy itinerary", () => {
    expect(bookingItinerary.legs).toEqual(legacy.legs);
    expect(bookingItinerary.price).toBe(legacy.price);
    expect(bookingItinerary.simulated).toBe(true);
  });

  it("freezes a planned itinerary from the planning engine", () => {
    const planned = demoPlanned();
    const frozen = bookingItineraryFromPlanned(planned);
    expect(frozen.legs).toHaveLength(planned.connections.length);
    expect(frozen.price).toBe(planned.fare);
    expect(frozen.from).toBe(planned.from);
  });

  it("detects the itinerary shape", () => {
    expect(normalizeToBookingItinerary(legacy).id).toBe(legacy.id);
    expect(normalizeToBookingItinerary(demoPlanned()).simulated).toBe(true);
  });
});

describe("validateBookingInput", () => {
  it("accepts a complete booking", () => {
    expect(validateBookingInput(validInput())).toEqual({});
  });

  it("requires explicit confirmation", () => {
    const errors = validateBookingInput(validInput({ confirmed: false }));
    expect(errors.confirmed).toBeTruthy();
  });

  it("flags missing traveller details and bad email", () => {
    const errors = validateBookingInput(
      validInput({ passengers: [{ firstName: "", lastName: "", idNumber: "12" }], contactEmail: "nope" }),
    );
    expect(errors["first-0"]).toBeTruthy();
    expect(errors["last-0"]).toBeTruthy();
    expect(errors["id-0"]).toBeTruthy();
    expect(errors.email).toBeTruthy();
  });

  it("rejects empty and oversized parties", () => {
    expect(validateBookingInput(validInput({ passengers: [] })).passengers).toBeTruthy();
    const many = Array.from({ length: 12 }, (_, i) => ({
      firstName: "A",
      lastName: "B",
      idNumber: `ID${i}0000`,
    }));
    expect(validateBookingInput(validInput({ passengers: many })).passengers).toBeTruthy();
  });
});

describe("generateBookingRef", () => {
  it("formats as TBS-#### and avoids collisions", () => {
    const ref = generateBookingRef([], () => 0.5);
    expect(ref).toMatch(/^TBS-\d{4}$/);
    const second = generateBookingRef([ref], () => 0.5);
    expect(second).not.toBe(ref);
  });
});

describe("buildLocalBooking", () => {
  it("assembles a confirmed simulated booking with assumptions", () => {
    const booking = buildLocalBooking(validInput(), { ref: "TBS-4242", id: "bk-1", now: Date.parse("2026-10-01T00:00:00Z") });
    expect(booking.ref).toBe("TBS-4242");
    expect(booking.status).toBe("confirmed");
    expect(booking.travellers).toBe(1);
    expect(booking.assumptions.length).toBeGreaterThan(0);
    expect(booking.assumptions.join(" ")).toMatch(/simulated/i);
    expect(booking.simulated).toBe(true);
  });

  it("maps to a legacy-compatible trip", () => {
    const booking = buildLocalBooking(validInput(), { ref: "TBS-4243", id: "bk-2" });
    const trip = bookingToTrip(booking);
    expect(trip.ref).toBe(booking.ref);
    expect(trip.status).toBe("upcoming");
    expect(trip.price).toBe(booking.fare.total);
  });
});

describe("assumptions and seed data", () => {
  it("always states that booking is simulated", () => {
    expect(bookingAssumptions(bookingItinerary).join(" ")).toMatch(/no payment/i);
  });

  it("maps trip statuses to booking statuses", () => {
    expect(bookingStatusFromTrip("upcoming")).toBe("confirmed");
    expect(bookingStatusFromTrip("completed")).toBe("completed");
    expect(bookingStatusFromTrip("cancelled")).toBe("cancelled");
  });

  it("provides offline fallback bookings", () => {
    const seed = seedBookings();
    expect(seed.length).toBeGreaterThan(0);
    expect(seed.every((b) => b.simulated)).toBe(true);
  });
});
