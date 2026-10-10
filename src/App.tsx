import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { SettingsProvider } from "./state/SettingsContext";
import { TripsProvider } from "./state/TripsContext";
import { Dashboard } from "./pages/Dashboard";
import { ChatPage } from "./pages/ChatPage";
import { TripPlannerPage } from "./pages/TripPlannerPage";
import { SearchPage } from "./pages/SearchPage";
import { ItineraryResultsPage } from "./pages/ItineraryResultsPage";
import { ComparePage } from "./pages/ComparePage";
import { DisruptionsPage } from "./pages/DisruptionsPage";
import { DisruptionSimulatorPage } from "./pages/DisruptionSimulatorPage";
import { MyTripsPage } from "./pages/MyTripsPage";
import { BookingReviewPage } from "./pages/BookingReviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="plan" element={<TripPlannerPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="itineraries" element={<ItineraryResultsPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="disruptions" element={<DisruptionsPage />} />
        <Route path="simulator" element={<DisruptionSimulatorPage />} />
        <Route path="trips" element={<MyTripsPage />} />
        <Route path="booking" element={<BookingReviewPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <TripsProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TripsProvider>
    </SettingsProvider>
  );
}
