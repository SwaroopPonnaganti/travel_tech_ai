import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SettingsProvider } from "../state/SettingsContext";
import { BookingsProvider } from "../state/BookingsContext";
import { NotificationsProvider } from "../state/NotificationsContext";
import { MyTripsPage } from "./MyTripsPage";
import { seedBookings } from "../lib/bookings";

function jsonResponse(data: unknown, status = 200) {
  return { ok: status < 400, status, statusText: "OK", json: async () => data } as unknown as Response;
}

const seeded = seedBookings();
let fetchMock: ReturnType<typeof vi.fn>;
let calls: Array<{ url: string; method: string }>;

beforeEach(() => {
  calls = [];
  fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    if (url.includes("/cancel")) {
      const ref = decodeURIComponent(url.split("/bookings/")[1]!.replace("/cancel", ""));
      const original = seeded.find((b) => b.ref === ref)!;
      return Promise.resolve(jsonResponse({ ...original, status: "cancelled", cancelledAt: new Date().toISOString() }));
    }
    return Promise.resolve(jsonResponse(seeded));
  });
  vi.stubGlobal("fetch", fetchMock);
});

function renderPage() {
  return render(
    <SettingsProvider>
      <NotificationsProvider>
        <BookingsProvider>
          <MemoryRouter initialEntries={["/trips"]}>
            <MyTripsPage />
          </MemoryRouter>
        </BookingsProvider>
      </NotificationsProvider>
    </SettingsProvider>,
  );
}

describe("MyTripsPage", () => {
  it("lists saved bookings with references and disruption alerts", async () => {
    renderPage();
    expect(await screen.findByText(/TBS-4821/)).toBeInTheDocument();
    expect(screen.getAllByText(/Bengaluru → Hyderabad/).length).toBeGreaterThan(0);
    expect(screen.getByText(/6E-2145 running 45 min late/i)).toBeInTheDocument();
    expect(screen.getAllByText(/suggested alternatives/i).length).toBeGreaterThan(0);
  });

  it("requires confirmation before cancelling a booking", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/TBS-4821/);

    const cancelButtons = screen.getAllByRole("button", { name: /^cancel$/i });
    await user.click(cancelButtons[0]!);

    expect(await screen.findByText(/cancel this booking\?/i)).toBeInTheDocument();
    expect(calls.some((c) => c.url.includes("/cancel"))).toBe(false);

    await user.click(screen.getByRole("button", { name: /^yes, cancel$/i }));

    await waitFor(() => expect(screen.queryByText(/cancel this booking\?/i)).not.toBeInTheDocument());
    expect(calls.some((c) => c.url.includes("/cancel") && c.method === "POST")).toBe(true);
  });
});
