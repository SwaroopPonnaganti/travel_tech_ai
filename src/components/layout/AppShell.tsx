import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, Plane, X, LifeBuoy } from "lucide-react";
import { NAV_ITEMS } from "../../config/nav";
import { useSettings } from "../../state/SettingsContext";
import { useBookings } from "../../state/BookingsContext";
import { NotificationBell } from "../notifications/NotificationCenter";
import { LiveRegion } from "../LiveRegion";
import { cn } from "../../lib/cn";
import { initials } from "../../lib/format";

function Brand() {
  const { t } = useSettings();
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-navy-600 to-teal-500 shadow-glow">
        <Plane className="h-5 w-5 text-white" aria-hidden="true" />
      </span>
      <span>
        <span className="block font-display text-sm font-bold tracking-tight text-white">TBS RoamAgent</span>
        <span className="block text-[11px] text-teal-300">{t("app.tagline")}</span>
      </span>
    </div>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useSettings();
  return (
    <nav className="flex flex-col gap-1" aria-label="Main navigation">
      {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
              isActive
                ? "bg-teal-500/15 text-teal-200 shadow-[inset_0_0_0_1px_rgba(45,212,191,0.35)]"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
            )
          }
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          {t(labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { t } = useSettings();
  const { trips } = useBookings();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const upcoming = trips.filter((tr) => tr.status === "upcoming" || tr.status === "in-progress").length;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <LiveRegion />

      {/* Desktop sidebar */}
      <aside className="hidden border-r border-white/10 bg-navy-900/60 p-5 backdrop-blur lg:flex lg:flex-col lg:gap-6">
        <Brand />
        <Navigation />
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <span className="text-xs font-semibold text-slate-300">Notification centre</span>
            <NotificationBell />
          </div>
          <div className="rounded-2xl border border-teal-500/25 bg-teal-500/5 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-teal-200">
              <LifeBuoy className="h-4 w-4" aria-hidden="true" /> 24×7 Travel Desk
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {upcoming} active {upcoming === 1 ? "trip" : "trips"} under monitoring.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-600 text-xs font-bold text-white">
              {initials("Swaroop P")}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-100">Swaroop P</span>
              <span className="block text-xs text-slate-500">Product Owner</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-navy-900/90 px-4 py-3 backdrop-blur">
          <Brand />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {drawerOpen && (
          <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Navigation">
            <div className="flex w-72 flex-col gap-6 border-r border-white/10 bg-navy-900 p-5">
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Navigation onNavigate={() => setDrawerOpen(false)} />
            </div>
            <button
              type="button"
              aria-label="Close navigation menu"
              className="flex-1 bg-navy-950/70 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
          </div>
        )}
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div key={location.pathname} className="animate-fade-up">
          <Outlet />
        </div>
        <footer className="mt-12 border-t border-white/10 pt-5 text-xs text-slate-500">
          TBS RoamAgent · SAMARTHA Hackathon build · {t("common.results")} served from the RoamAgent agent layer.
        </footer>
      </main>
    </div>
  );
}
