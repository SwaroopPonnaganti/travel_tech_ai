import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  HelpCircle,
  Luggage,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Ticket,
  Users,
  XCircle,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { EmptyState } from "../components/ui/EmptyState";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { ModeIcon } from "../components/TransportIcon";
import { useBookings } from "../state/BookingsContext";
import { useNotifications } from "../state/NotificationsContext";
import { useSettings } from "../state/SettingsContext";
import { disruptions as demoDisruptions, itineraries as legacyItineraries } from "../lib/mock";
import { createEmptyTripPlan } from "../lib/planner";
import { planItineraries } from "../lib/itinerary";
import { notificationFromCancellation } from "../lib/notifications";
import type { Booking, BookingStatus } from "../lib/types";
import { formatDate, formatDuration, formatMoney, formatTime } from "../lib/format";

const STATUS_TONE: Record<BookingStatus, "teal" | "navy" | "rose"> = {
  confirmed: "teal",
  completed: "navy",
  cancelled: "rose",
};

const FILTERS = [
  { value: "all" as const, label: "All" },
  { value: "confirmed" as const, label: "Confirmed" },
  { value: "completed" as const, label: "Completed" },
  { value: "cancelled" as const, label: "Cancelled" },
];

interface Suggestion {
  title: string;
  detail: string;
}

function suggestAlternatives(booking: Booking): Suggestion[] {
  const plan = {
    ...createEmptyTripPlan(),
    origin: booking.itinerary.from,
    destination: booking.itinerary.to,
    departureDate: booking.itinerary.date,
    passengers: booking.travellers,
  };
  const result = planItineraries(plan, { date: booking.itinerary.date });
  const fromEngine = [...result.feasible, ...result.alternatives].slice(0, 2).map((it) => ({
    title: `${it.modes.join(" + ")} · ${it.legs} ${it.legs === 1 ? "leg" : "legs"}`,
    detail: `${formatMoney(it.totalFare)} · ${formatDuration(it.totalDurationMin)}`,
  }));
  if (fromEngine.length) return fromEngine;
  return legacyItineraries
    .filter((it) => it.from === booking.itinerary.from && it.to === booking.itinerary.to)
    .slice(0, 2)
    .map((it) => ({
      title: it.title,
      detail: `${formatMoney(it.price)} · ${formatDuration(it.legs.reduce((s, l) => s + l.durationMin, 0))}`,
    }));
}

export function MyTripsPage() {
  const { t, announce } = useSettings();
  const { bookings, cancelBooking, loading, source, error, refresh } = useBookings();
  const { addNotification } = useNotifications();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [detail, setDetail] = useState<Booking | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState<string[]>([]);

  const filtered = useMemo(
    () => (filter === "all" ? bookings : bookings.filter((b) => b.status === filter)),
    [bookings, filter],
  );

  function checkIn(booking: Booking) {
    setCheckedIn((prev) => (prev.includes(booking.ref) ? prev : [...prev, booking.ref]));
    announce(`Simulated check-in complete for ${booking.ref}`);
  }

  async function confirmCancellation() {
    if (!confirmCancel) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await cancelBooking(confirmCancel.ref, true);
      addNotification(notificationFromCancellation(updated));
      announce(`Booking ${updated.ref} cancelled`);
      setConfirmCancel(null);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Could not cancel the booking");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Luggage className="h-5 w-5" />}
        title={t("trips.title")}
        description={t("trips.description")}
        action={<SegmentedControl name={t("trips.filter.label")} value={filter} onChange={setFilter} options={FILTERS} />}
      />

      {(source === "demo" || error) && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <span className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 shrink-0" /> {t("trips.offline")}
          </span>
          <Button variant="ghost" onClick={() => void refresh()} icon={<RefreshCw className="h-4 w-4" />}>
            {t("common.retry")}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Luggage className="h-5 w-5" />}
          title={t("trips.empty.title")}
          description={t("trips.empty.description")}
          action={
            <Link to="/itineraries" className="btn-primary">
              {t("trips.empty.action")}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((booking) => {
            const alerts = demoDisruptions.filter((d) => d.tripId === booking.id && !d.resolved);
            const isCheckedIn = checkedIn.includes(booking.ref);
            const suggestions = alerts.length > 0 ? suggestAlternatives(booking) : [];
            return (
              <article key={booking.id} className="card card-hover p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/15 text-teal-200">
                      <ModeIcon mode={booking.itinerary.legs[0]!.mode} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-display text-base font-semibold text-white">
                        {booking.itinerary.from} → {booking.itinerary.to}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {t("trips.ref")} {booking.ref}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={STATUS_TONE[booking.status]}>{booking.status}</Badge>
                    {isCheckedIn && (
                      <Badge tone="teal">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("trips.checkedIn")}
                      </Badge>
                    )}
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" /> {t("trips.date")}
                    </dt>
                    <dd className="text-slate-200">{formatDate(booking.itinerary.date)}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" /> {t("trips.route")}
                    </dt>
                    <dd className="text-slate-200">
                      {booking.itinerary.from} → {booking.itinerary.to}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" /> {t("trips.travellers")}
                    </dt>
                    <dd className="text-slate-200">{booking.travellers}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-slate-500">
                      <Ticket className="h-3.5 w-3.5" /> {t("trips.seat")}
                    </dt>
                    <dd className="text-slate-200">{booking.seat}</dd>
                  </div>
                </dl>

                {alerts.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {alerts.map((a) => (
                      <div key={a.id} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">
                        <p className="flex items-center gap-2 font-semibold">
                          <ShieldAlert className="h-3.5 w-3.5" /> {a.title}
                          <Badge tone="amber">{a.severity}</Badge>
                        </p>
                        <p className="mt-1 text-amber-200/90">{a.detail}</p>
                      </div>
                    ))}
                    {suggestions.length > 0 && (
                      <div className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-teal-200">
                          <Sparkles className="h-3.5 w-3.5" /> {t("trips.alternatives")}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {suggestions.map((s) => (
                            <li key={s.title} className="flex items-center justify-between gap-2 text-xs text-slate-300">
                              <span>{s.title}</span>
                              <span className="text-slate-400">{s.detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={() => setDetail(booking)}>
                    {t("trips.viewDetails")}
                  </Button>
                  {booking.status === "confirmed" && !isCheckedIn && (
                    <Button onClick={() => checkIn(booking)}>{t("trips.checkIn")}</Button>
                  )}
                  {booking.status === "confirmed" && (
                    <Button variant="ghost" icon={<XCircle className="h-4 w-4" />} onClick={() => setConfirmCancel(booking)}>
                      {t("trips.cancel")}
                    </Button>
                  )}
                  <span className="ml-auto font-display text-base font-bold text-white">
                    {formatMoney(booking.fare.total)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={!!detail} title={detail ? `${detail.itinerary.from} → ${detail.itinerary.to}` : t("trips.details.title")} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("trips.ref")}</span>
                <span className="font-medium text-slate-100">{detail.ref}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("trips.details.status")}</span>
                <Badge tone={STATUS_TONE[detail.status]}>{detail.status}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("trips.details.date")}</span>
                <span className="font-medium text-slate-100">{formatDate(detail.itinerary.date)}</span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("trips.details.journey")}</p>
              <ol className="space-y-2">
                {detail.itinerary.legs.map((leg, idx) => (
                  <li key={`${leg.code}-${idx}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-slate-200">
                        <ModeIcon mode={leg.mode} className="h-4 w-4 text-teal-300" />
                        {leg.operator} · {leg.code}
                      </span>
                      <span className="text-xs text-slate-400">{formatDuration(leg.durationMin)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {leg.from} {formatTime(leg.depart)} → {leg.to} {formatTime(leg.arrive)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("trips.details.passengers")}</p>
              <ul className="space-y-1 text-sm text-slate-300">
                {detail.passengers.map((p, idx) => (
                  <li key={idx}>
                    {p.firstName} {p.lastName} · {t("trips.details.idEnding")} {p.idNumber.slice(-4)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t("trips.details.total")}</span>
                <span className="font-semibold text-white">{formatMoney(detail.fare.total)}</span>
              </div>
            </div>

            <ul className="space-y-1">
              {detail.assumptions.slice(0, 2).map((a) => (
                <li key={a} className="text-xs text-slate-500">
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmCancel}
        title={t("trips.cancel.title")}
        onClose={() => (cancelling ? undefined : setConfirmCancel(null))}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(null)} disabled={cancelling}>
              {t("trips.cancel.keep")}
            </Button>
            <Button variant="danger" onClick={() => void confirmCancellation()} loading={cancelling}>
              {t("trips.cancel.confirm")}
            </Button>
          </>
        }
      >
        <p>{t("trips.cancel.body").replace("{ref}", confirmCancel?.ref ?? "")}</p>
        <p className="flex items-start gap-2 text-xs text-amber-200">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t("trips.cancel.simulated")}
        </p>
        {cancelError && (
          <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
            {cancelError}
          </p>
        )}
      </Modal>
    </div>
  );
}
