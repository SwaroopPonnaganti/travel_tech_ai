import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SettingsProvider } from "../state/SettingsContext";
import { ItineraryResultsPage } from "./ItineraryResultsPage";
import { createEmptyTripPlan } from "../lib/planner";
import { DEMO_SERVICE_DATE } from "../lib/connections";
import type { TripPlan } from "../lib/types";

function renderWithPlan(plan: TripPlan | null) {
  return render(
    <SettingsProvider>
      <MemoryRouter initialEntries={[{ pathname: "/itineraries", state: plan ? { plan } : undefined }]}>
        <Routes>
          <Route path="/itineraries" element={<ItineraryResultsPage />} />
        </Routes>
      </MemoryRouter>
    </SettingsProvider>,
  );
}

function plan(overrides: Partial<TripPlan> = {}): TripPlan {
  return {
    ...createEmptyTripPlan(),
    origin: "Visakhapatnam",
    destination: "Hyderabad",
    departureDate: DEMO_SERVICE_DATE,
    passengers: 2,
    ...overrides,
  };
}

describe("ItineraryResultsPage", () => {
  it("marks all data as simulated and shows matching itineraries", () => {
    renderWithPlan(plan());
    expect(screen.getByText(/simulated demonstration data/i)).toBeInTheDocument();
    expect(screen.getByText(/Best matches/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Visakhapatnam/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Rejected connections/i)).toBeInTheDocument();
  });

  it("falls back to a demo plan when opened directly", () => {
    renderWithPlan(null);
    expect(screen.getByText(/Itinerary Planning/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Visakhapatnam/).length).toBeGreaterThan(0);
  });

  it("labels over-budget journeys as alternatives", () => {
    renderWithPlan(plan({ maxBudget: 600 }));
    expect(screen.getAllByText(/Alternatives/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Over budget by/i).length).toBeGreaterThan(0);
  });

  it("explains when no itinerary is possible", () => {
    renderWithPlan(plan({ destination: "Jaipur" }));
    expect(screen.getByText(/No itineraries match/i)).toBeInTheDocument();
    expect(screen.getAllByText(/no simulated schedules/i).length).toBeGreaterThan(0);
  });
});
