import { useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Info,
  Minus,
  Plus,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Field";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { ModeIcon } from "../components/TransportIcon";
import { itineraries as legacyItineraries } from "../lib/mock";
import type { Booking, BookingItinerary, CreateBookingInput, Itinerary, PlannedItinerary, TravellerDetails } from "../lib/types";
import { useSettings } from "../state/SettingsContext";
import { useBookings } from "../state/BookingsContext";
import { useNotifications } from "../state/NotificationsContext";
import { notificationFromBooking } from "../lib/notifications";
import {
  ADD_ONS,
  bookingAssumptions,
  bookingItineraryFromLegacy,
  computeFare,
  emptyTraveller,
  MAX_TRAVELLERS,
  normalizeToBookingItinerary,
  validateBookingInput,
} from "../lib/bookings";
import { ApiError } from "../lib/api";
import { formatDate, formatDuration, formatMoney, formatTime } from "../lib/format";

interface BookingState {
  itineraryId?: string;
  itinerary?: Itinerary;
  planned?: PlannedItinerary;
  travellers?: number;
}

export function BookingReviewPage() {
  const { settings, t, announce } = useSettings();
  const { createBooking } = useBookings();
  const { addNotification, consent } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as BookingState;

  const options = useMemo(() => {
    const list: BookingItinerary[] = legacyItineraries.map(bookingItineraryFromLegacy);
    if (state.planned) {
      const normalized = normalizeToBookingItinerary(state.planned);
      if (!list.some((o) => o.id === normalized.id)) list.unshift(normalized);
    }
    return list;
  }, [state.planned]);

  const initial = useMemo(() => {
    if (state.planned) return normalizeToBookingItinerary(state.planned);
    if (state.itinerary) return normalizeToBookingItinerary(state.itinerary);
    const found = state.itineraryId ? options.find((o) => o.id === state.itineraryId) : undefined;
    return found ?? options[0]!;
  }, [state.planned, state.itinerary, state.itineraryId, options]);

  const [selected, setSelected] = useState<BookingItinerary>(initial);
  const [pendingSelect, setPendingSelect] = useState<BookingItinerary | null>(null);
  const initialCount = Math.min(MAX_TRAVELLERS, Math.max(1, state.travellers ?? 1));
  const [passengers, setPassengers] = useState<TravellerDetails[]>(() =>
    Array.from({ length: initialCount }, () => emptyTraveller()),
  );
  const [email, setEmail] = useState("");
  const [seatPref, setSeatPref] = useState("window");
  const [addOns, setAddOns] = useState<string[]>([]);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  const count = passengers.length;
  const fare = useMemo(() => computeFare(selected, count, addOns), [selected, count, addOns]);
  const assumptions = useMemo(() => bookingAssumptions(selected), [selected]);

  function changeCount(next: number) {
    const n = Math.min(MAX_TRAVELLERS, Math.max(1, next));
    setPassengers((prev) => {
      const copy = [...prev];
      while (copy.length < n) copy.push(emptyTraveller());
      return copy.slice(0, n);
    });
  }

  function validate(): Record<string, string> {
    const input: CreateBookingInput = {
      itinerary: selected,
      passengers,
      contactEmail: email,
      seatPreference: seatPref,
      addOns,
      consentNotifications: consent,
      confirmed: true,
    };
    const found = validateBookingInput(input);
    if (!terms) found.terms = "You must accept the terms to continue";
    return found;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      announce("Please correct the booking form errors");
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmBooking() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await createBooking({
        itinerary: selected,
        passengers,
        contactEmail: email.trim(),
        seatPreference: seatPref,
        addOns,
        consentNotifications: consent,
        confirmed: true,
      });
      addNotification(notificationFromBooking(booking));
      setConfirmOpen(false);
      setConfirmed(booking);
      announce(`Simulated booking confirmed. Reference ${booking.ref}`);
    } catch (err) {
      setConfirmOpen(false);
      setSubmitError(err instanceof ApiError ? err.message : "Could not save the booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function requestItineraryChange(next: BookingItinerary) {
    if (next.id === selected.id) return;
    setPendingSelect(next);
  }

  if (confirmed) {
    return (
      <div className="space-y-6">
        <PageHeader icon={<ClipboardCheck className="h-5 w-5" />} title={t("nav.booking")} />
        <Card className="border-teal-500/40 bg-teal-500/5 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal-500 text-navy-950">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-white">{t("booking.success.title")}</h2>
          <p className="mt-1 text-sm text-slate-300">
            {t("booking.success.ref")} <strong className="text-teal-300">{confirmed.ref}</strong>
          </p>
          <p role="note" className="mx-auto mt-3 flex max-w-lg items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-xs text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {t("booking.simulated.banner")}
          </p>
          <dl className="mx-auto mt-5 grid max-w-md gap-3 text-left text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <dt className="text-xs text-slate-400">{t("booking.summary.route")}</dt>
              <dd className="text-slate-100">
                {confirmed.itinerary.from} → {confirmed.itinerary.to}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <dt className="text-xs text-slate-400">{t("booking.summary.travellers")}</dt>
              <dd className="text-slate-100">{confirmed.travellers}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <dt className="text-xs text-slate-400">{t("booking.summary.total")}</dt>
              <dd className="text-slate-100">{formatMoney(confirmed.fare.total, settings.currency)}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <dt className="text-xs text-slate-400">{t("booking.summary.seat")}</dt>
              <dd className="text-slate-100">{confirmed.seat}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate("/trips")}>{t("booking.success.toTrips")}</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirmed(null);
                setAddOns([]);
                setTerms(false);
                setPassengers(Array.from({ length: initialCount }, () => emptyTraveller()));
              }}
            >
              {t("booking.success.another")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardCheck className="h-5 w-5" />}
        title={t("nav.booking")}
        description={t("booking.description")}
        action={
          <Button variant="secondary" onClick={() => navigate(-1)} icon={<ArrowLeft className="h-4 w-4" />}>
            {t("booking.back")}
          </Button>
        }
      />

      <div role="note" className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
        <p>{t("booking.simulated.banner")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <form id="booking-form" className="space-y-6 lg:col-span-2" onSubmit={submit} noValidate>
          <Card title={t("booking.journey.title")} subtitle={t("booking.journey.subtitle")}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-500/15 text-teal-200">
                <ModeIcon mode={selected.legs[0]!.mode} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-lg font-semibold text-white">
                  {selected.from} → {selected.to}
                </p>
                <p className="text-sm text-slate-400">
                  {formatDate(selected.date, settings.language)} · {selected.legs.length}{" "}
                  {selected.legs.length === 1 ? t("booking.journey.leg") : t("booking.journey.legs")}
                </p>
              </div>
              <Badge tone="violet" className="ml-auto">
                <Sparkles className="h-3.5 w-3.5" /> {t("booking.simulated.badge")}
              </Badge>
            </div>

            <ol className="mt-4 space-y-2">
              {selected.legs.map((leg, idx) => (
                <li key={`${leg.code}-${idx}`} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <ModeIcon mode={leg.mode} className="h-4 w-4 text-teal-300" />
                      {leg.operator} · {leg.code}
                    </span>
                    <span className="text-xs text-slate-400">{formatDuration(leg.durationMin)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {leg.from} {formatTime(leg.depart, settings.timeFormat === "12h", settings.language)} → {leg.to}{" "}
                    {formatTime(leg.arrive, settings.timeFormat === "12h", settings.language)}
                  </p>
                </li>
              ))}
            </ol>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("booking.assumptions.title")}</p>
            <ul className="mt-2 space-y-1">
              {assumptions.map((a) => (
                <li key={a} className="flex items-start gap-2 text-xs text-slate-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" /> {a}
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t("booking.select.title")}>
            <Field label={t("booking.select.label")}>
              {(id) => (
                <Select id={id} value={selected.id} onChange={(e) => {
                  const next = options.find((o) => o.id === e.target.value);
                  if (next) requestItineraryChange(next);
                }}>
                  {options.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.title} · {formatMoney(it.price, settings.currency)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </Card>

          <Card
            title={t("booking.travellers.title")}
            action={
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" aria-label={t("booking.travellers.fewer")} icon={<Minus className="h-4 w-4" />} onClick={() => changeCount(count - 1)} />
                <span className="w-6 text-center font-semibold text-slate-100">{count}</span>
                <Button type="button" variant="ghost" aria-label={t("booking.travellers.more")} icon={<Plus className="h-4 w-4" />} onClick={() => changeCount(count + 1)} />
              </div>
            }
          >
            {errors.passengers && (
              <p role="alert" className="mb-3 text-xs font-medium text-rose-300">
                {errors.passengers}
              </p>
            )}
            <div className="space-y-5">
              {passengers.map((tr, idx) => (
                <fieldset key={idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {t("booking.travellers.passenger")} {idx + 1}
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label={t("booking.field.firstName")} error={errors[`first-${idx}`]}>
                      {(fid) => (
                        <Input
                          id={fid}
                          value={tr.firstName}
                          invalid={!!errors[`first-${idx}`]}
                          onChange={(e) =>
                            setPassengers((prev) => prev.map((p, i) => (i === idx ? { ...p, firstName: e.target.value } : p)))
                          }
                        />
                      )}
                    </Field>
                    <Field label={t("booking.field.lastName")} error={errors[`last-${idx}`]}>
                      {(fid) => (
                        <Input
                          id={fid}
                          value={tr.lastName}
                          invalid={!!errors[`last-${idx}`]}
                          onChange={(e) =>
                            setPassengers((prev) => prev.map((p, i) => (i === idx ? { ...p, lastName: e.target.value } : p)))
                          }
                        />
                      )}
                    </Field>
                    <Field label={t("booking.field.idNumber")} error={errors[`id-${idx}`]} hint={t("booking.field.idHint")}>
                      {(fid) => (
                        <Input
                          id={fid}
                          value={tr.idNumber}
                          invalid={!!errors[`id-${idx}`]}
                          onChange={(e) =>
                            setPassengers((prev) => prev.map((p, i) => (i === idx ? { ...p, idNumber: e.target.value } : p)))
                          }
                        />
                      )}
                    </Field>
                  </div>
                </fieldset>
              ))}
            </div>
          </Card>

          <Card title={t("booking.contact.title")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("booking.field.email")} error={errors.email}>
                {(id) => (
                  <Input
                    id={id}
                    type="email"
                    value={email}
                    invalid={!!errors.email}
                    placeholder="you@example.com"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
              </Field>
              <Field label={t("booking.field.seat")}>
                {(id) => (
                  <Select id={id} value={seatPref} onChange={(e) => setSeatPref(e.target.value)}>
                    <option value="window">{t("booking.seat.window")}</option>
                    <option value="aisle">{t("booking.seat.aisle")}</option>
                    <option value="flexible">{t("booking.seat.flexible")}</option>
                  </Select>
                )}
              </Field>
            </div>

            <fieldset className="mt-5">
              <legend className="label">{t("booking.addons.title")}</legend>
              <div className="space-y-2">
                {ADD_ONS.map((addon) => (
                  <label key={addon.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    <span className="flex items-center gap-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-teal-500"
                        checked={addOns.includes(addon.id)}
                        onChange={(e) =>
                          setAddOns((prev) => (e.target.checked ? [...prev, addon.id] : prev.filter((x) => x !== addon.id)))
                        }
                      />
                      {addon.label}
                    </span>
                    <span className="text-sm font-medium text-slate-300">
                      +{formatMoney(addon.price, settings.currency)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
        </form>

        <div className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
          <Card title={t("booking.fare.title")}>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">{t("booking.fare.base").replace("{count}", String(count))}</dt>
                <dd className="text-slate-100">{formatMoney(fare.baseFare, settings.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">{t("booking.fare.taxes")}</dt>
                <dd className="text-slate-100">{formatMoney(fare.taxes, settings.currency)}</dd>
              </div>
              {fare.addOns > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">{t("booking.fare.addons")}</dt>
                  <dd className="text-slate-100">{formatMoney(fare.addOns, settings.currency)}</dd>
                </div>
              )}
              {fare.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-teal-300">{t("booking.fare.discount")}</dt>
                  <dd className="text-teal-300">−{formatMoney(fare.discount, settings.currency)}</dd>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-display text-base font-bold">
                <dt>{t("booking.fare.total")}</dt>
                <dd>{formatMoney(fare.total, settings.currency)}</dd>
              </div>
            </dl>

            <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-teal-500"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                aria-invalid={!!errors.terms}
              />
              {t("booking.terms")}
            </label>
            {errors.terms && (
              <p role="alert" className="mt-1 text-xs font-medium text-rose-300">
                {errors.terms}
              </p>
            )}

            {submitError && (
              <p role="alert" className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
                {submitError}
              </p>
            )}

            <Button type="submit" form="booking-form" className="mt-4 w-full" icon={<ShieldCheck className="h-4 w-4" />}>
              {t("booking.submit")}
            </Button>
            <p className="mt-2 text-center text-[11px] text-slate-500">{t("booking.submit.hint")}</p>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title={t("booking.confirm.title")}
        onClose={() => (submitting ? undefined : setConfirmOpen(false))}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => void confirmBooking()} loading={submitting} icon={<ShieldCheck className="h-4 w-4" />}>
              {t("booking.confirm.action")}
            </Button>
          </>
        }
      >
        <p>{t("booking.confirm.body")}</p>
        <dl className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-400">{t("booking.summary.route")}</dt>
            <dd className="text-slate-100">
              {selected.from} → {selected.to}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">{t("booking.summary.travellers")}</dt>
            <dd className="text-slate-100">{count}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">{t("booking.summary.date")}</dt>
            <dd className="text-slate-100">{formatDate(selected.date, settings.language)}</dd>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 font-semibold">
            <dt>{t("booking.fare.total")}</dt>
            <dd>{formatMoney(fare.total, settings.currency)}</dd>
          </div>
        </dl>
        <p className="flex items-start gap-2 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t("booking.confirm.simulated")}
        </p>
      </Modal>

      <Modal
        open={!!pendingSelect}
        title={t("booking.change.title")}
        onClose={() => setPendingSelect(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingSelect(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (pendingSelect) setSelected(pendingSelect);
                setPendingSelect(null);
                announce("Itinerary changed");
              }}
              icon={<RouteIcon className="h-4 w-4" />}
            >
              {t("booking.change.action")}
            </Button>
          </>
        }
      >
        <p>{t("booking.change.body")}</p>
        {pendingSelect && (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-slate-100">
            {pendingSelect.title} · {formatDate(pendingSelect.date, settings.language)} ·{" "}
            {formatMoney(pendingSelect.price, settings.currency)}
          </p>
        )}
      </Modal>
    </div>
  );
}
