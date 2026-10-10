import { useMemo, useState, type FormEvent } from "react";
import { useLocation, Link } from "react-router-dom";
import { ClipboardCheck, ShieldCheck, CheckCircle2, ArrowLeft, Plus, Minus } from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Field";
import { Badge } from "../components/ui/Badge";
import { ItineraryCard } from "../components/ItineraryCard";
import { itineraries } from "../lib/mock";
import type { TravellerDetails, Trip } from "../lib/types";
import { useSettings } from "../state/SettingsContext";
import { useTrips } from "../state/TripsContext";
import { formatMoney, formatDuration } from "../lib/format";
import { totalDuration } from "../lib/compare";

const ADD_ONS = [
  { id: "meal", label: "Pre-book meal", price: 350 },
  { id: "insurance", label: "Travel insurance", price: 199 },
  { id: "lounge", label: "Airport lounge access", price: 1200 },
];

interface BookingState {
  itineraryId?: string;
  travellers?: number;
}

const emptyTraveller = (): TravellerDetails => ({ firstName: "", lastName: "", idNumber: "" });

export function BookingReviewPage() {
  const { settings, t, announce } = useSettings();
  const { addTrip } = useTrips();
  const location = useLocation();
  const state = (location.state ?? {}) as BookingState;

  const [itineraryId, setItineraryId] = useState(state.itineraryId ?? itineraries[0]!.id);
  const itinerary = useMemo(() => itineraries.find((i) => i.id === itineraryId)!, [itineraryId]);
  const [count, setCount] = useState(state.travellers ?? 1);
  const [travellers, setTravellers] = useState<TravellerDetails[]>([emptyTraveller()]);
  const [email, setEmail] = useState("");
  const [seatPref, setSeatPref] = useState("window");
  const [addOns, setAddOns] = useState<string[]>([]);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<Trip | null>(null);

  function changeCount(next: number) {
    const n = Math.min(9, Math.max(1, next));
    setCount(n);
    setTravellers((prev) => {
      const copy = [...prev];
      while (copy.length < n) copy.push(emptyTraveller());
      return copy.slice(0, n);
    });
  }

  const base = itinerary.price * count;
  const taxes = Math.round(base * 0.12);
  const addOnTotal = addOns.reduce((sum, id) => sum + (ADD_ONS.find((a) => a.id === id)?.price ?? 0), 0);
  const discount = itinerary.refundable ? Math.round(base * 0.05) : 0;
  const total = base + taxes + addOnTotal - discount;

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    travellers.forEach((tr, idx) => {
      if (!tr.firstName.trim()) next[`first-${idx}`] = "First name required";
      if (!tr.lastName.trim()) next[`last-${idx}`] = "Last name required";
      if (tr.idNumber.trim().length < 5) next[`id-${idx}`] = "Enter a valid ID number";
    });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address";
    if (!terms) next.terms = "You must accept the terms to continue";
    return next;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      announce("Please correct the booking form errors");
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      const ref = `TBS-${Math.floor(1000 + Math.random() * 9000)}`;
      const trip: Trip = {
        id: `trip-${Date.now()}`,
        ref,
        title: `${itinerary.from} → ${itinerary.to} ${itinerary.title}`,
        from: itinerary.from,
        to: itinerary.to,
        startDate: itinerary.date,
        endDate: itinerary.date,
        status: "upcoming",
        travellers: count,
        price: total,
        itineraryId: itinerary.id,
        seat: seatPref === "window" ? "12A" : "To be assigned",
        checkInOpen: false,
      };
      addTrip(trip);
      setConfirmed(trip);
      setSubmitting(false);
      announce(`Booking confirmed. Reference ${ref}`);
    }, 1100);
  }

  if (confirmed) {
    return (
      <div className="space-y-6">
        <PageHeader icon={<ClipboardCheck className="h-5 w-5" />} title={t("nav.booking")} />
        <Card className="border-teal-500/40 bg-teal-500/5 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-teal-500 text-navy-950">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-display text-xl font-bold text-white">Booking confirmed</h2>
          <p className="mt-1 text-sm text-slate-300">
            Reference <strong className="text-teal-300">{confirmed.ref}</strong> · itinerary sent to {email}
          </p>
          <dl className="mx-auto mt-5 grid max-w-md gap-3 text-left text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <dt className="text-xs text-slate-400">Route</dt>
              <dd className="text-slate-100">
                {confirmed.from} → {confirmed.to}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <dt className="text-xs text-slate-400">Travellers</dt>
              <dd className="text-slate-100">{confirmed.travellers}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <dt className="text-xs text-slate-400">Total paid</dt>
              <dd className="text-slate-100">{formatMoney(confirmed.price, settings.currency)}</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <dt className="text-xs text-slate-400">Seat</dt>
              <dd className="text-slate-100">{confirmed.seat}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/trips" className="btn-primary">
              Go to My Trips
            </Link>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setConfirmed(null);
                setAddOns([]);
                setTerms(false);
              }}
            >
              Book another
            </button>
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
        description="RoamAgent validates your details, applies the best available fare rules and issues the ticket."
        action={
          <Link to="/search" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" /> Back to search
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <form className="space-y-6 lg:col-span-2" onSubmit={submit} noValidate>
          <ItineraryCard itinerary={itinerary} compact />

          <Card title="Choose itinerary">
            <Field label="Itinerary">
              {(id) => (
                <Select id={id} value={itineraryId} onChange={(e) => setItineraryId(e.target.value)}>
                  {itineraries.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.title} · {formatMoney(it.price, settings.currency)} · {formatDuration(totalDuration(it))}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </Card>

          <Card
            title="Traveller details"
            action={
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" aria-label="Fewer travellers" icon={<Minus className="h-4 w-4" />} onClick={() => changeCount(count - 1)} />
                <span className="w-6 text-center font-semibold text-slate-100">{count}</span>
                <Button type="button" variant="ghost" aria-label="More travellers" icon={<Plus className="h-4 w-4" />} onClick={() => changeCount(count + 1)} />
              </div>
            }
          >
            <div className="space-y-5">
              {travellers.map((tr, idx) => (
                <fieldset key={idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Traveller {idx + 1}
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="First name" error={errors[`first-${idx}`]}>
                      {(fid) => (
                        <Input
                          id={fid}
                          value={tr.firstName}
                          invalid={!!errors[`first-${idx}`]}
                          onChange={(e) =>
                            setTravellers((prev) => prev.map((p, i) => (i === idx ? { ...p, firstName: e.target.value } : p)))
                          }
                        />
                      )}
                    </Field>
                    <Field label="Last name" error={errors[`last-${idx}`]}>
                      {(fid) => (
                        <Input
                          id={fid}
                          value={tr.lastName}
                          invalid={!!errors[`last-${idx}`]}
                          onChange={(e) =>
                            setTravellers((prev) => prev.map((p, i) => (i === idx ? { ...p, lastName: e.target.value } : p)))
                          }
                        />
                      )}
                    </Field>
                    <Field label="ID number" error={errors[`id-${idx}`]} hint="Passport / Aadhaar / ID">
                      {(fid) => (
                        <Input
                          id={fid}
                          value={tr.idNumber}
                          invalid={!!errors[`id-${idx}`]}
                          onChange={(e) =>
                            setTravellers((prev) => prev.map((p, i) => (i === idx ? { ...p, idNumber: e.target.value } : p)))
                          }
                        />
                      )}
                    </Field>
                  </div>
                </fieldset>
              ))}
            </div>
          </Card>

          <Card title="Contact & preferences">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact email" error={errors.email}>
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
              <Field label="Seat preference">
                {(id) => (
                  <Select id={id} value={seatPref} onChange={(e) => setSeatPref(e.target.value)}>
                    <option value="window">Window</option>
                    <option value="aisle">Aisle</option>
                    <option value="flexible">No preference</option>
                  </Select>
                )}
              </Field>
            </div>

            <fieldset className="mt-5">
              <legend className="label">Add-ons</legend>
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
          <Card title="Fare summary">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Base fare ({count}×)</dt>
                <dd className="text-slate-100">{formatMoney(base, settings.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Taxes & fees (12%)</dt>
                <dd className="text-slate-100">{formatMoney(taxes, settings.currency)}</dd>
              </div>
              {addOnTotal > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">Add-ons</dt>
                  <dd className="text-slate-100">{formatMoney(addOnTotal, settings.currency)}</dd>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-teal-300">Refundable discount</dt>
                  <dd className="text-teal-300">−{formatMoney(discount, settings.currency)}</dd>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-display text-base font-bold">
                <dt>Total</dt>
                <dd>{formatMoney(total, settings.currency)}</dd>
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
              I accept the fare rules, cancellation policy and privacy terms.
            </label>
            {errors.terms && (
              <p role="alert" className="mt-1 text-xs font-medium text-rose-300">
                {errors.terms}
              </p>
            )}

            <Button type="submit" loading={submitting} className="mt-4 w-full" icon={<ShieldCheck className="h-4 w-4" />}>
              Confirm & pay
            </Button>
            <Badge tone="teal" className="mt-3">
              <ShieldCheck className="h-3.5 w-3.5" /> PCI-DSS secure checkout
            </Badge>
          </Card>
        </div>
      </div>
    </div>
  );
}
