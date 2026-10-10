# TBS RoamAgent — Product Requirements Document

## 1. What to build

**TBS RoamAgent** is an agentic AI travel concierge web application built for the **SAMARTHA Hackathon**.
It lets a traveller plan, compare, book and recover trips through a single conversational + dashboard
experience. The "agent" continuously watches prices, operator feeds, weather and safety advisories and
proposes actions instead of only displaying data.

### Product goals
- Reduce the effort of multi-step trip planning to a single natural-language request.
- Make trade-offs between price, speed, safety and comfort explicit and comparable.
- Detect disruptions early and offer one-click recovery.
- Be accessible to non-English speakers and users with assistive needs.
- Demo end-to-end within a hackathon window with a real frontend, API and database.

### Non-goals (for the hackathon scope)
- Real payment gateway integration (checkout is simulated with a fare breakdown + PNR).
- Real third-party GDS / airline APIs (seeded + simulated inventory is used).
- Multi-tenant auth / SSO (a single demo user profile is assumed).

## 2. Targeted users

| Persona | Need | Success signal |
|---|---|---|
| **Business traveller (Swaroop, 30s)** | Book a reliable route fast, reschedule on disruption | Less than 2 minutes from request to booking review |
| **Budget traveller** | Cheapest option within a hard budget | Budget respected in every result |
| **Family traveller** | Safety, comfort, cancellable fares | Safety score and refundability surfaced prominently |
| **Accessibility-first user** | Large text, high contrast, screen-reader announcements, regional language | Settings apply instantly across the app |
| **Travel desk / operator** | See disruptions and recovery options in one queue | Recovery accepted in ≤ 2 clicks |

## 3. Features

### F1 — Dashboard
- KPI tiles: upcoming trips, total spend, active alerts, AI savings.
- Next-trip spotlight with fare, travel time, safety score and quick actions.
- Disruption radar preview, 6-month spend trend, recent activity feed.

### F2 — AI Travel Chat
- Natural-language trip requests ("cheap trip from Bengaluru to Hyderabad next weekend for 2 under ₹6000").
- Intent extraction: origin, destination, date, travellers, budget, priority.
- Rule-based agent replies with ranked recommendations and contextual suggestion chips.
- Hand-off: parsed request can be sent straight into Trip Search.
- Typing indicator, message history, clear-chat, error states.

### F3 — Conversational Trip Planner
- Free-text → structured plan: describe the trip in one message (English **or** Telugu) and get an
  editable structured form.
- Extracts: origin, destination, departure date, preferred time window / clock time, required arrival
  date/time, passengers, max budget, seater/sleeper, accessibility + luggage needs, first- and
  last-mile requirements.
- Follow-up questions for missing essentials (origin, destination, date, passengers) — **never invents
  a date or travel requirement**.
- Editable grouped form with per-field validation, "auto-filled" provenance badges, confidence and
  LLM / on-device source indicator.
- LLM extraction only via the server-side proxy (`ROAMAGENT_LLM_API_KEY`); unconfigured → 501 →
  deterministic rule fallback so the UI never blocks.
- Telugu input support: postposition reordering, city/keyword/numeral translation.
- Hand-off to Itinerary Planning, carrying the full structured plan.
- Reset, accessibility chips (wheelchair / senior / infant / …), cabin+checked luggage counters.

### F4 — Itinerary Planning (route engine)
- Graph-search engine over a **fixed simulated connection dataset** (Visakhapatnam ↔ Hyderabad and
  other corridors) that assembles feasible multi-leg journeys (direct + transfers).
- Each connection has origin/destination + stops, departure/arrival times, duration, fare, transport
  type, availability + seats, coach class, accessibility, luggage allowance, data source and
  last-updated timestamp.
- Validates **arrival deadlines, budget, transfer times, seat availability, accessibility, luggage and
  passenger preferences**.
- **Rejects impossible connections** (sold out, too few seats, too-little transfer time, unsupported
  needs) with explicit reasons; when nothing satisfies every constraint it explains why and suggests
  clearly labelled alternatives (over budget / misses deadline / outside preferred window).
- Itinerary cards show fare, journey duration, departure/arrival, transfers, comfort, transfer risk,
  arrival-deadline compliance and data freshness.
- Sorting (recommended, price, duration, arrival, departure, transfers) and filtering (price, duration,
  mode, coach, direct-only, deadline-only, availability-only).
- **All schedules, fares and availability are simulated** and labelled as such — never claimed to be
  live transport data.

### F5 — Trip Search
- Form: from, to, date, priority, travellers, budget.
- Client + server validation with inline error messages.
- Loading skeletons, empty state, demo/live data badge, graceful API fallback.

### F6 — Itinerary Comparison
- Select up to 3 itineraries.
- Side-by-side table: fare, travel time, stops, safety, on-time record, weighted score.
- Priority selector (Balanced / Cheapest / Fastest / Safest) re-ranks and highlights a winner with reasons.

### F7 — Disruption Management
- Active / all / resolved filters.
- Severity classification (info, warning, critical) and category icons (delay, cancellation, weather, strike).
- Simulate delay/cancellation, accept recovery, dismiss.
- Suggested alternatives ranked by safety.

### F8 — My Trips
- Status tabs (all, upcoming, completed, cancelled).
- Trip cards with seats, dates, travellers; details modal; check-in flow.
- Cancellation with confirmation modal and refund messaging.

### F9 — Booking Review
- Itinerary selector, dynamic traveller forms (1–9), contact email, seat preference, add-ons.
- Fare breakdown: base, taxes, add-ons, refundable discount, total.
- Terms acceptance, validation, submit with loading, confirmation screen with generated PNR.

### F10 — Settings (language & accessibility)
- Language: English, Hindi, Telugu, Tamil, Spanish (live UI translation).
- Text size (S/M/L/XL), high-contrast mode, reduced motion, reduce transparency.
- Currency and 12h/24h time format.
- Screen-reader announcement toggle + test announcement.
- Preferences persist in `localStorage` and apply via `<html>` data attributes.

## 4. Success metrics (hackathon)
- All 10 screens functional and responsive (mobile → desktop).
- Type check, lint, unit/integration tests and production build all pass.
- End-to-end demo: chat/plan → itinerary planning → search → compare → booking → trip → disruption recovery.
