import { Link } from "react-router-dom";
import {
  CalendarClock,
  IndianRupee,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Plane,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { ModeIcon } from "../components/TransportIcon";
import { useBookings } from "../state/BookingsContext";
import { useSettings } from "../state/SettingsContext";
import { activityFeed, disruptions, monthlySpend } from "../lib/mock";
import { formatDate, formatMoney, relativeTime } from "../lib/format";

const toneMap = { good: "teal", info: "navy", warn: "amber" } as const;
const severityTone = { info: "navy", warning: "amber", critical: "rose" } as const;

export function Dashboard() {
  const { bookings } = useBookings();
  const { settings, t } = useSettings();

  const upcoming = bookings
    .filter((booking) => booking.status === "confirmed")
    .sort((a, b) => a.itinerary.date.localeCompare(b.itinerary.date));
  const activeDisruptions = disruptions.filter((d) => !d.resolved);
  const nextBooking = upcoming[0];
  const nextTrip = nextBooking?.itinerary;
  const totalSpend = bookings
    .filter((booking) => booking.status !== "cancelled")
    .reduce((sum, booking) => sum + booking.fare.total, 0);
  const maxSpend = Math.max(...monthlySpend.map((m) => m.amount));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Sparkles className="h-5 w-5" />}
        title={`Welcome back, Swaroop`}
        description="RoamAgent is monitoring your trips, fares and safety advisories in real time."
        action={
          <Link to="/search" className="btn-primary">
            Plan a new trip <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Upcoming trips" value={String(upcoming.length)} icon={<CalendarClock className="h-5 w-5" />} />
        <StatCard
          label="Total spend"
          value={formatMoney(totalSpend, settings.currency)}
          delta={{ value: "8.2% vs last quarter", positive: false }}
          icon={<IndianRupee className="h-5 w-5" />}
        />
        <StatCard
          label="Active alerts"
          value={String(activeDisruptions.length)}
          tone={activeDisruptions.length ? "amber" : "teal"}
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <StatCard
          label="AI savings"
          value={formatMoney(4820, settings.currency)}
          delta={{ value: "36% below average", positive: true }}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Next trip"
          subtitle={nextBooking ? nextBooking.ref : "No upcoming trips"}
          action={
            nextBooking && (
              <Link to="/trips" className="text-sm font-medium text-teal-300 hover:text-teal-200">
                View all
              </Link>
            )
          }
        >
          {nextBooking && nextTrip ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-500/15 text-teal-200">
                  <ModeIcon mode={nextTrip.legs[0]!.mode} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold text-white">
                    {nextTrip.from} <ArrowRight className="inline h-4 w-4 text-teal-300" /> {nextTrip.to}
                  </p>
                  <p className="text-sm text-slate-400">
                    {formatDate(nextTrip.date, settings.language)} · {nextBooking.travellers} travellers · {nextBooking.seat}
                  </p>
                </div>
                <Badge tone="teal" className="ml-auto">
                  Confirmed
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-xs text-slate-400">Total fare</p>
                  <p className="font-semibold text-white">{formatMoney(nextBooking.fare.total, settings.currency)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-xs text-slate-400">Travel time</p>
                  <p className="font-semibold text-white">
                    {(() => {
                      const minutes = nextTrip.legs.reduce((sum, leg) => sum + leg.durationMin, 0);
                      return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
                    })()}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <p className="text-xs text-slate-400">Legs</p>
                  <p className="font-semibold text-teal-300">{nextTrip.legs.length}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link to="/trips" className="btn-secondary">
                  <MapPin className="h-4 w-4" /> Manage booking
                </Link>
                <Link to="/chat" className="btn-ghost btn border border-white/10">
                  <Sparkles className="h-4 w-4" /> Ask RoamAgent
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Plane className="h-5 w-5" />}
              title="No upcoming trips"
              description="Start a search and RoamAgent will rank the best options for your budget and priorities."
              action={
                <Link to="/search" className="btn-primary">
                  Search trips
                </Link>
              }
            />
          )}
        </Card>

        <Card title="Disruption radar" subtitle="Prioritised by impact">
          <ul className="space-y-3">
            {activeDisruptions.slice(0, 3).map((d) => (
              <li key={d.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-100">{d.title}</p>
                  <Badge tone={severityTone[d.severity]}>{d.severity}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400">{relativeTime(d.createdAt)}</p>
              </li>
            ))}
          </ul>
          <Link to="/disruptions" className="mt-4 inline-flex text-sm font-medium text-teal-300 hover:text-teal-200">
            Open disruption centre
          </Link>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Spend trend" subtitle="Last 6 months">
          <div className="flex h-40 items-end gap-3">
            {monthlySpend.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-navy-600 to-teal-500 transition-all"
                  style={{ height: `${Math.max(8, (m.amount / maxSpend) * 100)}%` }}
                  title={`${m.month}: ${formatMoney(m.amount, settings.currency)}`}
                />
                <span className="text-xs text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Recent activity">
          <ul className="space-y-3">
            {activityFeed.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <Badge tone={toneMap[a.tone as keyof typeof toneMap] ?? "neutral"}>●</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-200">{a.text}</p>
                  <p className="text-xs text-slate-500">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">{t("common.empty")} · demo feed</p>
        </Card>
      </div>
    </div>
  );
}
