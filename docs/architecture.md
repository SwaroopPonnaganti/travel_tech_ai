# Architecture

## 1. App flow

```
                ┌───────────────────────────────────────────────┐
                │                 Browser (SPA)                  │
                │  React + TypeScript + Vite + Tailwind          │
                │                                                │
   Nav ─────────┤  Dashboard · Chat · Planner · Itineraries      │
                │  Search · Compare · Disruptions · My Trips      │
                │  Booking · Settings                             │
                └───────────────┬────────────────────────────────┘
                                │  fetch("/api/...")
                                │  (Vite dev proxy → :4000)
                                ▼
                ┌───────────────────────────────────────────────┐
                │           Node.js + Express API                │
                │  /api/health /api/itineraries /api/trips       │
                │  /api/bookings /api/disruptions /api/chat      │
                │  /api/agent/status /api/agent/plan             │
                └───────────────┬────────────────────────────────┘
                                │  better-sqlite3 (synchronous)
                                │  optional: OpenAI-compatible LLM
                                │  (ROAMAGENT_LLM_API_KEY, server-only)
                                ▼
                ┌───────────────────────────────────────────────┐
                │            SQLite  server/data/*.db            │
                │  itineraries · trips · bookings · disruptions  │
                └───────────────────────────────────────────────┘
```

### Request lifecycle
1. A page calls a typed helper in `src/lib/api.ts` (`apiFetch` / `withFallback`).
2. `withFallback` tries the Express API first; if it is unavailable it returns bundled demo
   data (`src/lib/mock.ts`) and flags the UI as `demo`, so the app never shows a dead screen.
3. The API validates input, queries SQLite and returns JSON domain objects.
4. Errors are normalised into `ApiError` and rendered with `<ErrorState />` + retry.

### Agentic layer
- `src/lib/intent.ts` — deterministic intent parser (origin, destination, date, travellers, budget, priority).
- `src/lib/compare.ts` — weighted scoring engine that ranks itineraries by user priority.
- `src/lib/chat.ts` — conversation router that combines intent + ranking into grounded replies.
- These are pure, framework-free functions → fully unit-testable and portable to the server later.

### Conversational Trip Planner
- `src/lib/planner.ts` — pure extraction/validation core: parses free text (English **and** Telugu)
  into a structured `TripPlan`, sanitises untrusted input, validates it, computes missing/essential
  fields, merges multi-turn edits (never overwrites values the user already set) and produces the
  follow-up question for the next missing field. Telugu postpositions (`నుండి` = "from", dative `కు/కి`
  = "to") are reordered to English preposition order before keyword translation.
- `src/lib/llm.ts` — client bridge. Talks only to the proxy: `GET /api/agent/status` and
  `POST /api/agent/plan`. If the server reports no LLM (501) or the call fails, it silently falls
  back to the rule parser so the UI is never blocked.
- `server/llm.ts` — server-side provider. Reads `ROAMAGENT_LLM_API_KEY` / `ROAMAGENT_LLM_BASE_URL`
  / `ROAMAGENT_LLM_MODEL` and calls an OpenAI-compatible chat-completions endpoint with a strict
  JSON schema. The key stays on the server and is never shipped to the browser.
- Flow: free text → rule extraction → (optional) LLM extraction → merge (LLM wins, rules fill gaps)
  → sanitize → validate → editable form + follow-up question → hand-off to Itinerary Planning.

### Itinerary-planning engine (simulated)
- `src/lib/connections.ts` — the **fixed demonstration dataset**: a list of scheduled bus services
  (edges) between Visakhapatnam, Vijayawada, Rajahmundry, Hyderabad, Kurnool, Bengaluru and Chennai,
  including direct Visakhapatnam ↔ Hyderabad overnight/day services and multi-leg corridors. Each
  connection carries origin/destination + boarding/alighting stops, departure/arrival, duration, fare,
  transport type, availability + seats left, coach class, accessibility, luggage allowance, a data
  source and a last-updated timestamp. **Every row is simulated** and materialised into dated
  connections via `connectionsForDate(date)`.
- `src/lib/itinerary.ts` — the route-planning engine. It builds a time-aware adjacency graph and runs
  a depth-limited (max 3 legs) search that:
  - assembles multi-leg journeys (direct + transfers) for the requested date and departure window;
  - validates transfer times (`MIN_TRANSFER_MIN` = 30 min), seats for the party, accessibility and
    luggage, arrival deadlines and budget;
  - **rejects impossible connections** (sold out, too few seats, too-little transfer time, unsupported
    needs) with a human-readable reason;
  - classifies journeys as **feasible** or **labelled alternatives** (over budget / misses deadline /
    departs outside the preferred window), and explains why when none is feasible;
  - derives transfer locations, waiting times and transfer risk, and computes price/duration/comfort/
    risk scores. `sortItineraries` and `filterItineraries` power price/duration/arrival sorting and
    filtering. Deterministic and fully unit-tested.
- `src/components/planner/PlannedItineraryCard.tsx` and `src/pages/ItineraryResultsPage.tsx` —
  rich itinerary cards (fare, duration, dep/arr times, transfers, comfort, transfer risk,
  deadline compliance, data freshness) plus sorting/filtering and a prominent **simulated-data**
  banner. Reached from the planner via `Find options` (route `/itineraries`).

### Disruption simulator (simulated)
- `src/lib/disruption.ts` — `simulateDisruption(original, plan, kind, options)`. Injects one simulated
  disruption (**bus delay**, **bus cancellation**, **missed connection**, **unavailable last-mile
  transport**), identifies the affected leg, perturbs the connection pool (shift the delayed leg, remove
  the cancelled/missed/unavailable leg, delay the preceding leg for a missed connection) and asks the
  **real** `planItineraries` engine to recalculate the remaining journey from the resume city. The
  recovered legs are composed back onto the untouched prefix with `assembleItinerary` and re-checked
  against the original deadline, budget and comfort constraints. Returns per-option extra cost, arrival
  delay, deadline/budget status, trade-off bullets and a clear **no-alternative** result. `servicePool`,
  `shiftConnection` and `assembleItinerary` are exported from `itinerary.ts` for reuse — no recovery
  option is hard-coded.
- `src/pages/DisruptionSimulatorPage.tsx` — scenario controls (journey selector, disruption-type radio
  group, delay length, affected leg), visible **Simulate Disruption** and **Reset** buttons, affected-leg
  panel, impact summary, an original-vs-revised comparison table and recalculated option cards (reusing
  `PlannedItineraryCard`). Route `/simulator`, nav item "Disruption Simulator", linked from Disruption
  Management. Every event/status is badged **Simulated**.

### Simulated booking workflow
- `src/lib/bookings.ts` — pure domain core: `computeFare` (base + 12% taxes + add-ons − 5% refundable
  discount), `validateBookingInput`, `generateBookingRef` (`TBS-####`, collision-safe), `seatForPreference`,
  `bookingItineraryFromPlanned` / `bookingItineraryFromLegacy` / `normalizeToBookingItinerary`,
  `buildLocalBooking`, `bookingToTrip` and `seedBookings`. Every booking carries `simulated: true`.
- `server/db.ts` — a `bookings` table (ref unique, status, itinerary JSON, passengers JSON, fare columns,
  assumptions, consent, timestamps) plus `listBookings`, `getBookingByRef`, `createBooking` (validates →
  `BookingError` with field errors) and `cancelBooking` (404 unknown, 409 already cancelled). The DB path
  honours `ROAMAGENT_DB_PATH` (tests use `:memory:`).
- `server/index.ts` — `GET /api/bookings`, `GET /api/bookings/:ref`, `POST /api/bookings`,
  `POST /api/bookings/:ref/cancel`. **Create and cancel require `confirmed: true`** and return `400`
  otherwise, so no consequential action can happen without explicit confirmation.
- `src/state/BookingsContext.tsx` — `useBookings()` exposes `{ bookings, trips, loading, source, error,
  createBooking, cancelBooking, getBooking, refresh }`. It talks to the API and falls back to
  `seedBookings()` offline; `trips` is a legacy-compatible view via `bookingToTrip`. Client (4xx) errors
  propagate; transient failures degrade to a local simulated booking.
- `src/pages/BookingReviewPage.tsx` — full journey + fare + traveller form, then an explicit confirmation
  modal before saving. `src/pages/MyTripsPage.tsx` — saved bookings, filters, disruption alerts, suggested
  alternatives, detail modal, check-in and a confirm-guarded cancellation.

### Notification centre (simulated)
- `src/state/NotificationsContext.tsx` — `useNotifications()` holds the in-app notifications, unread
  count, a persisted **consent** flag (`roamagent.notify.consent`) and `previewDelivery`, which only
  "delivers" when consent is granted. `src/lib/notifications.ts` builds notifications from booking and
  cancellation events and seeds demo notices for the centre.
- `src/components/notifications/NotificationCenter.tsx` — `NotificationBell` (unread badge) and a
  slide-over panel with a consent toggle and per-item simulated delivery previews (email / SMS / push).
  Wired into `AppShell` for desktop and mobile. **No real messages are sent.**

### State
- `SettingsContext` — language + accessibility, persisted to `localStorage`, applied to `<html>`.
- `NotificationsProvider` — in-app notifications + delivery consent (persisted).
- `BookingsProvider` — saved simulated bookings/cancellations (API-backed, demo fallback).
- Server data is fetched through the contexts; pages consume `useBookings()` / `useNotifications()`.

## 2. Folder & file structure

```
travel-assistant/
├── index.html                 # Vite entry HTML
├── package.json               # scripts, deps
├── vite.config.ts             # React plugin, dev proxy, Vitest config
├── tailwind.config.js         # navy/teal palette, fonts, animations
├── postcss.config.js
├── eslint.config.js
├── tsconfig.json / .app / .node
├── docs/                      # PRD, architecture, rules, phases, design, memory
├── prototype/                 # original single-file SafeRoute prototype (preserved)
├── server/
│   ├── index.ts               # Express app + routes (incl. /api/agent/*)
│   ├── llm.ts                 # server-side LLM provider (key stays on server)
│   ├── db.ts                  # SQLite schema, seeds, data access
│   └── seed.ts                # seed itineraries / trips / bookings / disruptions
└── src/
    ├── main.tsx               # React entry
    ├── App.tsx                # providers + routes
    ├── index.css              # Tailwind layers + a11y modes
    ├── config/nav.ts          # navigation model
    ├── lib/                   # types, format, intent, planner, llm, compare, chat, api, i18n, mock, cn
    │                          # + connections (simulated dataset) + itinerary (route engine)
    │                          # + disruption (simulated what-if recovery)
    │                          # + bookings (fare/validation/refs) + bookingsApi + notifications
    ├── state/                 # SettingsContext, NotificationsContext, BookingsContext
    ├── components/
    │   ├── layout/AppShell.tsx
    │   ├── ui/                # Button, Card, Badge, Field, Modal, Skeleton, …
    │   ├── planner/           # TripPlanForm.tsx, PlannedItineraryCard.tsx
    │   ├── notifications/     # NotificationCenter.tsx (bell + panel)
    │   ├── ItineraryCard.tsx
    │   ├── TransportIcon.tsx
    │   └── LiveRegion.tsx
    ├── pages/                 # one file per feature screen (incl. ItineraryResultsPage.tsx, DisruptionSimulatorPage.tsx)
    └── test/setup.ts          # Vitest jsdom setup
```

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| UI | React 18 + TypeScript | Component model, type safety |
| Build | Vite 6 | Fast HMR, simple config |
| Styling | Tailwind CSS 3 | Utility-first, custom navy/teal theme |
| Icons | lucide-react | Consistent, tree-shakeable icon set |
| Routing | react-router-dom 6 | Nested layout routes |
| API | Node.js + Express 4 | Simple, familiar REST |
| DB | SQLite via better-sqlite3 | Zero-config, synchronous, demo-friendly |
| Testing | Vitest + Testing Library | Vite-native, fast, jsdom |
| Lint/format | ESLint 9 (flat) + typescript-eslint | Standard TS/React rules |
| LLM (optional) | OpenAI-compatible chat completions via `server/llm.ts` | Server-side key; deterministic fallback when unconfigured |
