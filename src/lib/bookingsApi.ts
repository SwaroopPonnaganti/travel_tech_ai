import { apiFetch } from "./api";
import type { Booking, CreateBookingInput } from "./types";

export function fetchBookings(): Promise<Booking[]> {
  return apiFetch<Booking[]>("/api/bookings");
}

export function createBookingRequest(input: CreateBookingInput): Promise<Booking> {
  return apiFetch<Booking>("/api/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelBookingRequest(ref: string): Promise<Booking> {
  return apiFetch<Booking>(`/api/bookings/${encodeURIComponent(ref)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ confirmed: true }),
  });
}
