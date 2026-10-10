import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SettingsProvider } from "../state/SettingsContext";
import { BookingsProvider } from "../state/BookingsContext";
import { NotificationsProvider } from "../state/NotificationsContext";
import { BookingReviewPage } from "./BookingReviewPage";
import { itineraries } from "../lib/mock";
import { bookingItineraryFromLegacy, buildLocalBooking } from "../lib/bookings";

function jsonResponse(data: unknown, status = 200) {
  return { ok: status < 400, status, statusText: "OK", json: async () => data } as unknown as Response;
}

const itinerary = itineraries[0]!;
const createdBooking = buildLocalBooking(
  {
    itinerary: bookingItineraryFromLegacy(itinerary),
    passengers: [{ firstName: "Asha", lastName: "Rao", idNumber: "P1234567" }],
    contactEmail: "asha@example.com",
    seatPreference: "window",
    addOns: [],
    consentNotifications: true,
    confirmed: true,
  },
  { ref: "TBS-7777", id: "bk-test" },
);

let fetchMock: ReturnType<typeof vi.fn>;
let calls: Array<{ url: string; method: string }>;

beforeEach(() => {
  calls = [];
  fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    if (url.includes("/api/bookings") && method === "POST") {
      return Promise.resolve(jsonResponse(createdBooking, 201));
    }
    return Promise.resolve(jsonResponse([]));
  });
  vi.stubGlobal("fetch", fetchMock);
});

function renderPage() {
  return render(
    <SettingsProvider>
      <NotificationsProvider>
        <BookingsProvider>
          <MemoryRouter initialEntries={[{ pathname: "/booking", state: { itinerary, travellers: 1 } }]}>
            <BookingReviewPage />
          </MemoryRouter>
        </BookingsProvider>
      </NotificationsProvider>
    </SettingsProvider>,
  );
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("First name"), "Asha");
  await user.type(screen.getByLabelText("Last name"), "Rao");
  await user.type(screen.getByLabelText("ID number"), "P1234567");
  await user.type(screen.getByLabelText("Contact email"), "asha@example.com");
  await user.click(screen.getByLabelText(/I accept the fare rules/i));
}

describe("BookingReviewPage", () => {
  it("shows simulated banner, journey details and fare", () => {
    renderPage();
    expect(screen.getAllByText(/simulated booking/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/journey details/i)).toBeInTheDocument();
    expect(screen.getByText(/fare summary/i)).toBeInTheDocument();
    expect(screen.getByText(/base fare \(1×\)/i)).toBeInTheDocument();
  });

  it("requires an explicit confirmation before saving the booking", async () => {
    const user = userEvent.setup();
    renderPage();
    await fillForm(user);

    await user.click(screen.getByRole("button", { name: /review & confirm booking/i }));

    expect(await screen.findByText(/confirm simulated booking\?/i)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);

    await user.click(screen.getByRole("button", { name: /^confirm simulated booking$/i }));

    expect(await screen.findByText(/booking confirmed/i)).toBeInTheDocument();
    expect(screen.getByText("TBS-7777")).toBeInTheDocument();
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });

  it("blocks saving until the form is valid", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /review & confirm booking/i }));
    expect(screen.queryByText(/confirm simulated booking\?/i)).not.toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("asks for confirmation before changing the itinerary", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByLabelText("Itinerary"), "it-102");
    expect(await screen.findByText(/change itinerary\?/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^change itinerary$/i }));
    expect(screen.queryByText(/change itinerary\?/i)).not.toBeInTheDocument();
  });
});
