// @vitest-environment node
import { describe, it, expect, beforeAll } from "vitest";
import type { CreateBookingInput } from "../src/lib/types";
import { bookingItineraryFromLegacy } from "../src/lib/bookings";
import { seedItineraries } from "./seed";

type Db = typeof import("./db");
let db: Db;

const itinerary = bookingItineraryFromLegacy(seedItineraries[0]!);

function input(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    itinerary,
    passengers: [{ firstName: "Asha", lastName: "Rao", idNumber: "P1234567" }],
    contactEmail: "asha@example.com",
    seatPreference: "window",
    addOns: ["meal"],
    consentNotifications: true,
    confirmed: true,
    ...overrides,
  };
}

beforeAll(async () => {
  process.env.ROAMAGENT_DB_PATH = ":memory:";
  db = await import("./db");
  db.migrate();
  db.seedIfEmpty();
});

describe("bookings database", () => {
  it("seeds demo bookings on first run", () => {
    const seeded = db.listBookings();
    expect(seeded.length).toBeGreaterThanOrEqual(4);
    expect(seeded.every((b) => b.simulated)).toBe(true);
  });

  it("persists a new booking with a unique reference", () => {
    const created = db.createBooking(input());
    expect(created.ref).toMatch(/^TBS-\d{4}$/);
    expect(created.status).toBe("confirmed");
    expect(created.travellers).toBe(1);
    expect(created.fare.total).toBeGreaterThan(0);

    const found = db.getBookingByRef(created.ref);
    expect(found?.ref).toBe(created.ref);
    expect(db.listBookings().some((b) => b.ref === created.ref)).toBe(true);

    const second = db.createBooking(input());
    expect(second.ref).not.toBe(created.ref);
  });

  it("rejects a booking without explicit confirmation", () => {
    expect(() => db.createBooking(input({ confirmed: false }))).toThrowError(db.BookingError);
    try {
      db.createBooking(input({ confirmed: false }));
    } catch (err) {
      expect(err).toBeInstanceOf(db.BookingError);
      expect((err as InstanceType<typeof db.BookingError>).status).toBe(400);
      expect((err as InstanceType<typeof db.BookingError>).fieldErrors?.confirmed).toBeTruthy();
    }
  });

  it("rejects invalid contact details", () => {
    try {
      db.createBooking(input({ contactEmail: "bad" }));
      throw new Error("expected validation to fail");
    } catch (err) {
      expect(err).toBeInstanceOf(db.BookingError);
      expect((err as InstanceType<typeof db.BookingError>).fieldErrors?.email).toBeTruthy();
    }
  });

  it("cancels a booking and blocks double cancellation", () => {
    const created = db.createBooking(input());
    const cancelled = db.cancelBooking(created.ref);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledAt).toBeTruthy();

    try {
      db.cancelBooking(created.ref);
      throw new Error("expected second cancellation to fail");
    } catch (err) {
      expect(err).toBeInstanceOf(db.BookingError);
      expect((err as InstanceType<typeof db.BookingError>).status).toBe(409);
    }
  });

  it("returns 404 for unknown references", () => {
    expect(db.getBookingByRef("TBS-0000")).toBeNull();
    expect(() => db.cancelBooking("TBS-0000")).toThrowError(db.BookingError);
  });
});
