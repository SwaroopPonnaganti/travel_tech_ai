import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Booking, CreateBookingInput, Disruption, Itinerary, Trip } from "../src/lib/types";
import { buildLocalBooking, validateBookingInput } from "../src/lib/bookings";
import { seedBookings, seedDisruptions, seedItineraries, seedTrips } from "./seed";

const DB_PATH = process.env.ROAMAGENT_DB_PATH ?? resolve(process.cwd(), "server/data/roamagent.db");
if (DB_PATH !== ":memory:") mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS itineraries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      date TEXT NOT NULL,
      legs TEXT NOT NULL,
      price INTEGER NOT NULL,
      stops INTEGER NOT NULL,
      safety_score INTEGER NOT NULL,
      reliability_pct INTEGER NOT NULL,
      rating REAL NOT NULL,
      co2_kg INTEGER NOT NULL,
      refundable INTEGER NOT NULL,
      tags TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      ref TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL,
      travellers INTEGER NOT NULL,
      price INTEGER NOT NULL,
      itinerary_id TEXT NOT NULL,
      seat TEXT NOT NULL,
      check_in_open INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS disruptions (
      id TEXT PRIMARY KEY,
      trip_id TEXT,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      severity TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      ref TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      itinerary_id TEXT NOT NULL,
      itinerary_json TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      date TEXT NOT NULL,
      travellers INTEGER NOT NULL,
      passengers_json TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      seat_preference TEXT NOT NULL,
      seat TEXT NOT NULL,
      add_ons TEXT NOT NULL,
      base_fare INTEGER NOT NULL,
      taxes INTEGER NOT NULL,
      addons_total INTEGER NOT NULL,
      discount INTEGER NOT NULL,
      total INTEGER NOT NULL,
      assumptions TEXT NOT NULL,
      consent_notifications INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      cancelled_at TEXT
    );
  `);
}

export function seedIfEmpty(): void {
  const count = db.prepare("SELECT COUNT(*) AS n FROM itineraries").get() as { n: number };
  if (count.n > 0) return;

  const insertItinerary = db.prepare(`
    INSERT INTO itineraries (id, title, origin, destination, date, legs, price, stops, safety_score, reliability_pct, rating, co2_kg, refundable, tags)
    VALUES (@id, @title, @origin, @destination, @date, @legs, @price, @stops, @safety_score, @reliability_pct, @rating, @co2_kg, @refundable, @tags)
  `);
  const insertTrip = db.prepare(`
    INSERT INTO trips (id, ref, title, origin, destination, start_date, end_date, status, travellers, price, itinerary_id, seat, check_in_open)
    VALUES (@id, @ref, @title, @origin, @destination, @start_date, @end_date, @status, @travellers, @price, @itinerary_id, @seat, @check_in_open)
  `);
  const insertDisruption = db.prepare(`
    INSERT INTO disruptions (id, trip_id, title, detail, severity, kind, created_at, resolved)
    VALUES (@id, @trip_id, @title, @detail, @severity, @kind, @created_at, @resolved)
  `);
  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      id, ref, status, itinerary_id, itinerary_json, origin, destination, date, travellers,
      passengers_json, contact_email, seat_preference, seat, add_ons, base_fare, taxes,
      addons_total, discount, total, assumptions, consent_notifications, created_at, cancelled_at
    ) VALUES (
      @id, @ref, @status, @itinerary_id, @itinerary_json, @origin, @destination, @date, @travellers,
      @passengers_json, @contact_email, @seat_preference, @seat, @add_ons, @base_fare, @taxes,
      @addons_total, @discount, @total, @assumptions, @consent_notifications, @created_at, @cancelled_at
    )
  `);

  const seed = db.transaction(() => {
    for (const it of seedItineraries) {
      insertItinerary.run({
        id: it.id,
        title: it.title,
        origin: it.from,
        destination: it.to,
        date: it.date,
        legs: JSON.stringify(it.legs),
        price: it.price,
        stops: it.stops,
        safety_score: it.safetyScore,
        reliability_pct: it.reliabilityPct,
        rating: it.rating,
        co2_kg: it.co2Kg,
        refundable: it.refundable ? 1 : 0,
        tags: JSON.stringify(it.tags),
      });
    }
    for (const t of seedTrips) {
      insertTrip.run({
        id: t.id,
        ref: t.ref,
        title: t.title,
        origin: t.from,
        destination: t.to,
        start_date: t.startDate,
        end_date: t.endDate,
        status: t.status,
        travellers: t.travellers,
        price: t.price,
        itinerary_id: t.itineraryId,
        seat: t.seat,
        check_in_open: t.checkInOpen ? 1 : 0,
      });
    }
    for (const d of seedDisruptions) {
      insertDisruption.run({
        id: d.id,
        trip_id: d.tripId,
        title: d.title,
        detail: d.detail,
        severity: d.severity,
        kind: d.kind,
        created_at: d.createdAt,
        resolved: d.resolved ? 1 : 0,
      });
    }
    for (const b of seedBookings) {
      insertBooking.run({
        id: b.id,
        ref: b.ref,
        status: b.status,
        itinerary_id: b.itinerary.id,
        itinerary_json: JSON.stringify(b.itinerary),
        origin: b.itinerary.from,
        destination: b.itinerary.to,
        date: b.itinerary.date,
        travellers: b.travellers,
        passengers_json: JSON.stringify(b.passengers),
        contact_email: b.contactEmail,
        seat_preference: b.seatPreference,
        seat: b.seat,
        add_ons: JSON.stringify(b.addOns),
        base_fare: b.fare.baseFare,
        taxes: b.fare.taxes,
        addons_total: b.fare.addOns,
        discount: b.fare.discount,
        total: b.fare.total,
        assumptions: JSON.stringify(b.assumptions),
        consent_notifications: b.consentNotifications ? 1 : 0,
        created_at: b.createdAt,
        cancelled_at: b.cancelledAt,
      });
    }
  });
  seed();
}

interface ItineraryRow {
  id: string;
  title: string;
  origin: string;
  destination: string;
  date: string;
  legs: string;
  price: number;
  stops: number;
  safety_score: number;
  reliability_pct: number;
  rating: number;
  co2_kg: number;
  refundable: number;
  tags: string;
}

export function rowToItinerary(row: ItineraryRow): Itinerary {
  return {
    id: row.id,
    title: row.title,
    from: row.origin,
    to: row.destination,
    date: row.date,
    legs: JSON.parse(row.legs),
    price: row.price,
    stops: row.stops,
    safetyScore: row.safety_score,
    reliabilityPct: row.reliability_pct,
    rating: row.rating,
    co2Kg: row.co2_kg,
    refundable: row.refundable === 1,
    tags: JSON.parse(row.tags),
  };
}

export function listItineraries(filter?: { from?: string; to?: string; maxPrice?: number }): Itinerary[] {
  let sql = "SELECT * FROM itineraries WHERE 1=1";
  const params: Record<string, string | number> = {};
  if (filter?.from) {
    sql += " AND origin = @from";
    params.from = filter.from;
  }
  if (filter?.to) {
    sql += " AND destination = @to";
    params.to = filter.to;
  }
  if (filter?.maxPrice !== undefined) {
    sql += " AND price <= @maxPrice";
    params.maxPrice = filter.maxPrice;
  }
  sql += " ORDER BY price ASC";
  const rows = db.prepare(sql).all(params) as ItineraryRow[];
  return rows.map(rowToItinerary);
}

interface TripRow {
  id: string;
  ref: string;
  title: string;
  origin: string;
  destination: string;
  start_date: string;
  end_date: string;
  status: string;
  travellers: number;
  price: number;
  itinerary_id: string;
  seat: string;
  check_in_open: number;
}

export function rowToTrip(row: TripRow): Trip {
  return {
    id: row.id,
    ref: row.ref,
    title: row.title,
    from: row.origin,
    to: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as Trip["status"],
    travellers: row.travellers,
    price: row.price,
    itineraryId: row.itinerary_id,
    seat: row.seat,
    checkInOpen: row.check_in_open === 1,
  };
}

export function listTrips(): Trip[] {
  const rows = db.prepare("SELECT * FROM trips ORDER BY start_date ASC").all() as TripRow[];
  return rows.map(rowToTrip);
}

export function listDisruptions(): Disruption[] {
  const rows = db
    .prepare("SELECT * FROM disruptions ORDER BY created_at DESC")
    .all() as Array<{
    id: string;
    trip_id: string | null;
    title: string;
    detail: string;
    severity: string;
    kind: string;
    created_at: string;
    resolved: number;
  }>;
  return rows.map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    detail: row.detail,
    severity: row.severity as Disruption["severity"],
    kind: row.kind as Disruption["kind"],
    createdAt: row.created_at,
    resolved: row.resolved === 1,
  }));
}

/** Error thrown for invalid or impossible booking operations. */
export class BookingError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(message: string, status = 400, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "BookingError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

interface BookingRow {
  id: string;
  ref: string;
  status: string;
  itinerary_id: string;
  itinerary_json: string;
  origin: string;
  destination: string;
  date: string;
  travellers: number;
  passengers_json: string;
  contact_email: string;
  seat_preference: string;
  seat: string;
  add_ons: string;
  base_fare: number;
  taxes: number;
  addons_total: number;
  discount: number;
  total: number;
  assumptions: string;
  consent_notifications: number;
  created_at: string;
  cancelled_at: string | null;
}

function rowToBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    ref: row.ref,
    status: row.status as Booking["status"],
    itinerary: JSON.parse(row.itinerary_json),
    passengers: JSON.parse(row.passengers_json),
    travellers: row.travellers,
    contactEmail: row.contact_email,
    seatPreference: row.seat_preference,
    seat: row.seat,
    addOns: JSON.parse(row.add_ons),
    fare: {
      baseFare: row.base_fare,
      taxes: row.taxes,
      addOns: row.addons_total,
      discount: row.discount,
      total: row.total,
      perPerson: row.travellers > 0 ? Math.round(row.base_fare / row.travellers) : row.base_fare,
    },
    assumptions: JSON.parse(row.assumptions),
    consentNotifications: row.consent_notifications === 1,
    simulated: true,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
  };
}

export function listBookings(): Booking[] {
  const rows = db.prepare("SELECT * FROM bookings ORDER BY created_at DESC").all() as BookingRow[];
  return rows.map(rowToBooking);
}

export function getBookingByRef(ref: string): Booking | null {
  const row = db.prepare("SELECT * FROM bookings WHERE ref = ?").get(ref) as BookingRow | undefined;
  return row ? rowToBooking(row) : null;
}

/**
 * Persist a new simulated booking. Rejects invalid input (including a missing
 * explicit confirmation) with a 400 BookingError and generates a unique ref.
 */
export function createBooking(input: CreateBookingInput): Booking {
  const fieldErrors = validateBookingInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    throw new BookingError("Booking details are invalid", 400, fieldErrors);
  }

  const existingRefs = (db.prepare("SELECT ref FROM bookings").all() as Array<{ ref: string }>).map((r) => r.ref);
  const booking = buildLocalBooking(input, { existingRefs });

  db.prepare(`
    INSERT INTO bookings (
      id, ref, status, itinerary_id, itinerary_json, origin, destination, date, travellers,
      passengers_json, contact_email, seat_preference, seat, add_ons, base_fare, taxes,
      addons_total, discount, total, assumptions, consent_notifications, created_at, cancelled_at
    ) VALUES (
      @id, @ref, @status, @itinerary_id, @itinerary_json, @origin, @destination, @date, @travellers,
      @passengers_json, @contact_email, @seat_preference, @seat, @add_ons, @base_fare, @taxes,
      @addons_total, @discount, @total, @assumptions, @consent_notifications, @created_at, @cancelled_at
    )
  `).run({
    id: booking.id,
    ref: booking.ref,
    status: booking.status,
    itinerary_id: booking.itinerary.id,
    itinerary_json: JSON.stringify(booking.itinerary),
    origin: booking.itinerary.from,
    destination: booking.itinerary.to,
    date: booking.itinerary.date,
    travellers: booking.travellers,
    passengers_json: JSON.stringify(booking.passengers),
    contact_email: booking.contactEmail,
    seat_preference: booking.seatPreference,
    seat: booking.seat,
    add_ons: JSON.stringify(booking.addOns),
    base_fare: booking.fare.baseFare,
    taxes: booking.fare.taxes,
    addons_total: booking.fare.addOns,
    discount: booking.fare.discount,
    total: booking.fare.total,
    assumptions: JSON.stringify(booking.assumptions),
    consent_notifications: booking.consentNotifications ? 1 : 0,
    created_at: booking.createdAt,
    cancelled_at: booking.cancelledAt,
  });

  return getBookingByRef(booking.ref)!;
}

/** Cancel a simulated booking. Requires explicit confirmation upstream. */
export function cancelBooking(ref: string): Booking {
  const existing = getBookingByRef(ref);
  if (!existing) {
    throw new BookingError("Booking not found", 404);
  }
  if (existing.status === "cancelled") {
    throw new BookingError("Booking is already cancelled", 409);
  }
  db.prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = ? WHERE ref = ?").run(
    new Date().toISOString(),
    ref,
  );
  return getBookingByRef(ref)!;
}
