import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Trip, TripStatus } from "../lib/types";
import { trips as seedTrips } from "../lib/mock";

interface TripsContextValue {
  trips: Trip[];
  getTrip: (id: string) => Trip | undefined;
  cancelTrip: (id: string) => void;
  addTrip: (trip: Trip) => void;
  updateStatus: (id: string, status: TripStatus) => void;
}

const TripsContext = createContext<TripsContextValue | null>(null);

export function TripsProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(seedTrips);

  const getTrip = useCallback((id: string) => trips.find((t) => t.id === id), [trips]);

  const cancelTrip = useCallback((id: string) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, status: "cancelled" } : t)));
  }, []);

  const addTrip = useCallback((trip: Trip) => {
    setTrips((prev) => [trip, ...prev]);
  }, []);

  const updateStatus = useCallback((id: string, status: TripStatus) => {
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }, []);

  const value = useMemo(
    () => ({ trips, getTrip, cancelTrip, addTrip, updateStatus }),
    [trips, getTrip, cancelTrip, addTrip, updateStatus],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error("useTrips must be used inside <TripsProvider>");
  return ctx;
}
