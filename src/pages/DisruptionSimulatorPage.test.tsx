import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SettingsProvider } from "../state/SettingsContext";
import { DisruptionSimulatorPage } from "./DisruptionSimulatorPage";

function renderPage() {
  return render(
    <SettingsProvider>
      <MemoryRouter initialEntries={["/simulator"]}>
        <DisruptionSimulatorPage />
      </MemoryRouter>
    </SettingsProvider>,
  );
}

describe("DisruptionSimulatorPage", () => {
  it("shows the simulated banner and simulator controls", () => {
    renderPage();
    expect(screen.getByText(/simulated demonstration data/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simulate disruption/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reset$/i })).toBeInTheDocument();
    expect(screen.getByText(/Ready to simulate/i)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /disruption type/i })).toBeInTheDocument();
  });

  it("recalculates recovery options and can be reset", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /simulate disruption/i }));

    await waitFor(() => {
      expect(screen.getByText(/Original vs revised/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Recommended|Alternative/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Recalculated options/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^reset$/i }));
    await waitFor(() => {
      expect(screen.getByText(/Ready to simulate/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Original vs revised/i)).not.toBeInTheDocument();
  });

  it("supports every disruption type", async () => {
    const user = userEvent.setup();
    renderPage();
    for (const label of [/bus cancellation/i, /missed connection/i, /last-mile unavailable/i]) {
      await user.click(screen.getByRole("radio", { name: label }));
      await user.click(screen.getByRole("button", { name: /simulate disruption/i }));
      await waitFor(() => {
        expect(screen.getByText(/Original vs revised/i)).toBeInTheDocument();
      });
      await user.click(screen.getAllByRole("button", { name: /^reset$/i })[0]!);
    }
  });
});
