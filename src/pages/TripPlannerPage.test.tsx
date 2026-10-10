import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TripPlannerPage } from "./TripPlannerPage";
import { SettingsProvider } from "../state/SettingsContext";

function okJson(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as unknown as Response;
}

function errorJson(status: number, message: string): Response {
  return {
    ok: false,
    status,
    statusText: message,
    json: async () => ({ error: message }),
    text: async () => message,
  } as unknown as Response;
}

function routeFetch(input: RequestInfo | URL): Response | Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : String(input);
  if (url.includes("/api/agent/status")) return okJson({ llmConfigured: false, model: null, provider: null });
  if (url.includes("/api/agent/plan")) return errorJson(501, "LLM is not configured on this server");
  return errorJson(404, "Not found");
}

function renderPage() {
  return render(
    <SettingsProvider>
      <MemoryRouter initialEntries={["/plan"]}>
        <TripPlannerPage />
      </MemoryRouter>
    </SettingsProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => routeFetch(input)));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TripPlannerPage", () => {
  it("shows the LLM status badge", async () => {
    renderPage();
    expect(await screen.findByText(/on-device extraction/i)).toBeInTheDocument();
  });

  it("extracts a plan from a message and asks for the missing departure date", async () => {
    renderPage();
    const input = screen.getByLabelText(/describe your trip/i);

    fireEvent.change(input, { target: { value: "from Pune to Mumbai for 2 people under 4000 in a sleeper coach" } });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => expect(screen.getByLabelText("From")).toHaveValue("Pune"), { timeout: 3000 });
    expect(screen.getByLabelText("To")).toHaveValue("Mumbai");
    expect(screen.getByLabelText("Passengers")).toHaveValue(2);
    expect(screen.getByLabelText(/departure date/i)).toHaveValue("");

    expect((await screen.findAllByText(/when would you like to leave/i)).length).toBeGreaterThan(0);
  });

  it("does not invent an arrival date that was not stated", async () => {
    renderPage();
    const input = screen.getByLabelText(/describe your trip/i);
    fireEvent.change(input, { target: { value: "leave Delhi for Jaipur tomorrow with 3 people" } });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));

    await waitFor(() => expect(screen.getByLabelText("From")).toHaveValue("Delhi"), { timeout: 3000 });
    expect(screen.getByLabelText("Arrive by (date)")).toHaveValue("");
  });
});
