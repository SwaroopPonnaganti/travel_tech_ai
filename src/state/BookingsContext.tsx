import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Booking, CreateBookingInput, Trip } from "../lib/types";
import { ApiError } from "../lib/api";
import { bookingToTrip, buildLocalBooking, seedBookings } from "../lib/bookings";
import { cancelBookingRequest, createBookingRequest, fetchBookings } from "../lib/bookingsApi";

interface BookingsContextValue {
  bookings: Booking[];
  /** Legacy-compatible view for dashboard widgets. */
  trips: Trip[];
  loading: boolean;
  source: "live" | "demo";
  error: string | null;
  createBooking: (input: CreateBookingInput) => Promise<Booking>;
  cancelBooking: (ref: string, confirmed: boolean) => Promise<Booking>;
  getBooking: (ref: string) => Booking | undefined;
  refresh: () => Promise<void>;
}

const BookingsContext = createContext<BookingsContextValue | null>(null);

function isClientError(err: unknown): boolean {
  return err instanceof ApiError && err.status >= 400 && err.status < 500;
}

export function BookingsProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"live" | "demo">("demo");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBookings();
      setBookings(data);
      setSource("live");
      setError(null);
    } catch (err) {
      setBookings(seedBookings());
      setSource("demo");
      setError(err instanceof Error ? err.message : "Booking API unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchBookings()
      .then((data) => {
        if (!active) return;
        setBookings(data);
        setSource("live");
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setBookings(seedBookings());
        setSource("demo");
        setError(err instanceof Error ? err.message : "Booking API unavailable");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const createBooking = useCallback(
    async (input: CreateBookingInput) => {
      if (!input?.confirmed) {
        throw new ApiError("Booking requires explicit confirmation", 400);
      }
      try {
        const booking = await createBookingRequest(input);
        setBookings((prev) => [booking, ...prev.filter((b) => b.ref !== booking.ref)]);
        setSource("live");
        setError(null);
        return booking;
      } catch (err) {
        if (isClientError(err)) throw err;
        const booking = buildLocalBooking(input, { existingRefs: bookings.map((b) => b.ref) });
        setBookings((prev) => [booking, ...prev]);
        setSource("demo");
        setError(err instanceof Error ? err.message : "Saved locally");
        return booking;
      }
    },
    [bookings],
  );

  const cancelBooking = useCallback(
    async (ref: string, confirmed: boolean) => {
      if (!confirmed) {
        throw new ApiError("Cancellation requires explicit confirmation", 400);
      }
      try {
        const booking = await cancelBookingRequest(ref);
        setBookings((prev) => prev.map((b) => (b.ref === ref ? booking : b)));
        return booking;
      } catch (err) {
        if (isClientError(err)) throw err;
        const current = bookings.find((b) => b.ref === ref);
        if (!current) throw new ApiError("Booking not found", 404);
        const updated: Booking = { ...current, status: "cancelled", cancelledAt: new Date().toISOString() };
        setBookings((prev) => prev.map((b) => (b.ref === ref ? updated : b)));
        setSource("demo");
        setError(err instanceof Error ? err.message : "Cancelled locally");
        return updated;
      }
    },
    [bookings],
  );

  const getBooking = useCallback((ref: string) => bookings.find((b) => b.ref === ref), [bookings]);

  const trips = useMemo(() => bookings.map(bookingToTrip), [bookings]);

  const value = useMemo(
    () => ({ bookings, trips, loading, source, error, createBooking, cancelBooking, getBooking, refresh: load }),
    [bookings, trips, loading, source, error, createBooking, cancelBooking, getBooking, load],
  );

  return <BookingsContext.Provider value={value}>{children}</BookingsContext.Provider>;
}

export function useBookings(): BookingsContextValue {
  const ctx = useContext(BookingsContext);
  if (!ctx) throw new Error("useBookings must be used inside <BookingsProvider>");
  return ctx;
}
