import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsProvider } from "../../state/SettingsContext";
import { NotificationsProvider } from "../../state/NotificationsContext";
import { NotificationBell } from "./NotificationCenter";

function renderBell() {
  return render(
    <SettingsProvider>
      <NotificationsProvider>
        <NotificationBell />
      </NotificationsProvider>
    </SettingsProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("NotificationCenter", () => {
  it("opens a simulated notification centre from the bell", async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(screen.getByRole("button", { name: /notification centre/i }));

    expect(screen.getByText(/notification centre/i)).toBeInTheDocument();
    expect(screen.getByText(/simulated previews/i)).toBeInTheDocument();
    expect(screen.getByText(/6E-2145 running 45 min late/i)).toBeInTheDocument();
  });

  it("gates simulated delivery behind explicit consent", async () => {
    const user = userEvent.setup();
    renderBell();
    await user.click(screen.getByRole("button", { name: /notification centre/i }));

    const previewButtons = screen.getAllByRole("button", { name: /preview delivery/i });
    expect(previewButtons[0]).toBeDisabled();

    await user.click(screen.getByLabelText(/allow simulated notifications/i));

    const enabled = screen.getAllByRole("button", { name: /preview delivery/i });
    expect(enabled[0]).toBeEnabled();

    await user.click(enabled[0]!);
    expect(await screen.findByText(/preview simulated/i)).toBeInTheDocument();
  });
});
