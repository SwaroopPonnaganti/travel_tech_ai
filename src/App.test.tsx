import { describe, it, expect } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./App";
import { SettingsProvider } from "./state/SettingsContext";
import { TripsProvider } from "./state/TripsContext";

function renderAt(path: string) {
  return render(
    <SettingsProvider>
      <TripsProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </TripsProvider>
    </SettingsProvider>,
  );
}

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

  it("shows a not found page for unknown routes", () => {
    renderAt("/does-not-exist");
    expect(screen.getByText(/lost in transit/i)).toBeInTheDocument();
  });
});
