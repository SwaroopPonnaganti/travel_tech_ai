import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Luggage, ArrowRight, Ticket, CalendarDays, Users, MapPin, XCircle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { EmptyState } from "../components/ui/EmptyState";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { ModeIcon } from "../components/TransportIcon";
import { useTrips } from "../state/TripsContext";
import { useSettings } from "../state/SettingsContext";
import { itineraries } from "../lib/mock";
import type { Trip, TripStatus } from "../lib/types";
import { formatDate, formatMoney } from "../lib/format";

const STATUS_TONE: Record<TripStatus, "teal" | "navy" | "amber" | "rose"> = {
  upcoming: "teal",
  "in-progress": "amber",
  completed: "navy",
  cancelled: "rose",
};

const FILTERS = [
  { value: "all" as const, label: "All" },
  { value: "upcoming" as const, label: "Upcoming" },
  { value: "completed" as const, label: "Completed" },
  { value: "cancelled" as const, label: "Cancelled" },
];

export function MyTripsPage() {
  const { t, announce } = useSettings();
  const { trips, cancelTrip } = useTrips();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [detail, setDetail] = useState<Trip | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Trip | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState<string[]>([]);

  const filtered = useMemo(
    () => (filter === "all" ? trips : trips.filter((tr) => tr.status === filter)),
    [trips, filter],
  );

  function checkIn(trip: Trip) {
    setCheckingIn(trip.id);
    window.setTimeout(() => {
      setCheckedIn((prev) => [...prev, trip.id]);
      setCheckingIn(null);
      announce(`Check-in complete for ${trip.ref}`);
    }, 900);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Luggage className="h-5 w-5" />}
        title={t("nav.trips")}
        description="Every booking in one place — check-in status, seats, documents and quick actions."
        action={<SegmentedControl name="Trip filter" value={filter} onChange={setFilter} options={FILTERS} />}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Luggage className="h-5 w-5" />}
          title="No trips in this view"
          description="Change the filter or plan a new trip to get started."
          action={
            <Link to="/search" className="btn-primary">
              Search trips
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((trip) => {
            const itinerary = itineraries.find((i) => i.id === trip.itineraryId);
            const isCheckedIn = checkedIn.includes(trip.id);
            return (
              <article key={trip.id} className="card card-hover p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {itinerary && (
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/15 text-teal-200">
                        <ModeIcon mode={itinerary.legs[0]!.mode} className="h-5 w-5" />
                      </span>
                    )}
                    <div>
                      <h3 className="font-display text-base font-semibold text-white">{trip.title}</h3>
                      <p className="text-xs text-slate-400">Ref {trip.ref}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={STATUS_TONE[trip.status]}>{trip.status}</Badge>
                    {isCheckedIn && (
                      <Badge tone="teal">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Checked in
                      </Badge>
                    )}
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" /> Date
                    </dt>
                    <dd className="text-slate-200">{formatDate(trip.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5" /> Route
                    </dt>
                    <dd className="text-slate-200">
                      {trip.from} → {trip.to}
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" /> Travellers
                    </dt>
                    <dd className="text-slate-200">{trip.travellers}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-slate-500">
                      <Ticket className="h-3.5 w-3.5" /> Seats
                    </dt>
                    <dd className="text-slate-200">{trip.seat}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={() => setDetail(trip)}>
                    View details
                  </Button>
                  {trip.status === "upcoming" && !isCheckedIn && (
                    <Button loading={checkingIn === trip.id} onClick={() => checkIn(trip)}>
                      Check in
                    </Button>
                  )}
                  {(trip.status === "upcoming" || trip.status === "in-progress") && (
                    <Button variant="ghost" icon={<XCircle className="h-4 w-4" />} onClick={() => setConfirmCancel(trip)}>
                      Cancel
                    </Button>
                  )}
                  <span className="ml-auto font-display text-base font-bold text-white">
                    {formatMoney(trip.price)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={!!detail} title={detail?.title ?? "Trip details"} onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Reference</span>
              <span className="font-medium text-slate-100">{detail.ref}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Route</span>
              <span className="font-medium text-slate-100">
                {detail.from} <ArrowRight className="inline h-3.5 w-3.5 text-teal-300" /> {detail.to}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Dates</span>
              <span className="font-medium text-slate-100">
                {formatDate(detail.startDate)} – {formatDate(detail.endDate)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Seats</span>
              <span className="font-medium text-slate-100">{detail.seat}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Fare</span>
              <span className="font-medium text-slate-100">{formatMoney(detail.price)}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-slate-400">
              Free cancellation up to 24 hours before departure. ID proof required at boarding.
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmCancel}
        title="Cancel this trip?"
        onClose={() => setConfirmCancel(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(null)}>
              Keep trip
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (confirmCancel) {
                  cancelTrip(confirmCancel.id);
                  announce(`Trip ${confirmCancel.ref} cancelled`);
                }
                setConfirmCancel(null);
              }}
            >
              Yes, cancel
            </Button>
          </>
        }
      >
        <p>
          Cancelling <strong className="text-slate-100">{confirmCancel?.ref}</strong> will refund 90% of the fare to the
          original payment method within 5 working days.
        </p>
      </Modal>
    </div>
  );
}
