import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./App";
import { SettingsProvider } from "./state/SettingsContext";
import { BookingsProvider } from "./state/BookingsContext";
import { NotificationsProvider } from "./state/NotificationsContext";

function renderAt(path: string) {
  return render(
    <SettingsProvider>
      <NotificationsProvider>
        <BookingsProvider>
          <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
          </MemoryRouter>
        </BookingsProvider>
      </NotificationsProvider>
    </SettingsProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [],
      } as unknown as Response),
    ),
  );
});

describe("App routing", () => {
  it("renders the dashboard at the root route", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
  });

  it("renders the AI chat page", () => {
    renderAt("/chat");
    expect(screen.getByRole("heading", { name: /ai travel chat/i })).toBeInTheDocument();
  });

  it("renders the settings page with language control", () => {
    renderAt("/settings");
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/preferred language/i)).toBeInTheDocument();
  });

  it("renders the trip search form", () => {
    renderAt("/search");
    expect(screen.getByRole("heading", { name: /trip search/i })).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
  });

  it("renders the trip planner with its structured form", async () => {
    renderAt("/plan");
    await act(async () => {});
    expect(screen.getByRole("heading", { name: /trip planner/i })).toBeInTheDocument();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("Departure date")).toBeInTheDocument();
    expect(screen.getByLabelText("Passengers")).toBeInTheDocument();
  });

  it("renders the itinerary planning results page", () => {
    renderAt("/itineraries");
    expect(screen.getByRole("heading", { name: /itinerary planning/i })).toBeInTheDocument();
    expect(screen.getByText(/simulated demonstration data/i)).toBeInTheDocument();
  });

  it("renders the disruption simulator", () => {
    renderAt("/simulator");
    expect(screen.getByRole("heading", { name: /disruption simulator/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simulate disruption/i })).toBeInTheDocument();
  });

  it("shows a not found page for unknown routes", () => {
    renderAt("/does-not-exist");
    expect(screen.getByText(/lost in transit/i)).toBeInTheDocument();
  });
});
