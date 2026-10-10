# TBS RoamAgent — Agentic AI Travel Concierge

A full-stack travel concierge built for the **SAMARTHA Hackathon**: plan, compare, book and recover
trips through an agentic AI experience with a fast, accessible dashboard.

Built with **React + TypeScript + Vite + Tailwind CSS** on the frontend and **Node.js + Express + SQLite**
on the backend. Icons by **lucide-react**, tests by **Vitest**.

## Features
- **Dashboard** — KPIs, next trip, disruption radar, spend trend, activity feed.
- **AI Travel Chat** — natural-language requests parsed into origin/destination/date/budget/priority with grounded recommendations.
- **Trip Planner** — describe a trip in English or Telugu and get an editable structured plan; follow-up questions fill the gaps, with optional server-side LLM extraction (rule fallback when no key).
- **Itinerary Planning** — a graph-search engine builds feasible multi-leg journeys from a fixed **simulated** connection dataset (Visakhapatnam ↔ Hyderabad and more), validates deadlines/budget/transfers/preferences, rejects impossible connections with reasons, and shows labelled alternatives. Sort/filter by price, duration and arrival time. All schedules/fares/availability are simulated.
- **Trip Search** — validated form, loading skeletons, graceful live-API fallback, ranked results.
- **Itinerary Comparison** — compare up to 3 options with a weighted score and winner highlight.
- **Disruption Management** — severity filters, simulate/recover actions, ranked alternatives.
- **Disruption Simulator** — inject a **simulated** bus delay, cancellation, missed connection or unavailable last-mile transport; RoamAgent recalculates the remaining journey with the real planning engine and compares original vs revised (extra cost, delay, deadline/budget re-checks, trade-offs). Simulate/Reset controls; all events and options are simulated.
- **My Trips** — saved **simulated** bookings with references, status filters, disruption alerts and suggested alternatives, details modal, check-in and confirm-guarded cancellation.
- **Booking Review** — dynamic traveller forms, fare breakdown and a **confirmation step that must be accepted before anything is saved**; confirming stores a simulated booking (unique `TBS-####` demo reference) via the API.
- **Notification centre** — in-app bell + slide-over panel with unread badge; notices generated from booking events with **consent-gated simulated** email/SMS/push previews (no real messages are sent).
- **Settings** — language (EN/HI/TE/TA/ES) and accessibility (text size, contrast, motion, announcements).

## Tech stack
React 18 · TypeScript · Vite 6 · Tailwind CSS 3 · lucide-react · react-router-dom · Node.js · Express · SQLite (better-sqlite3) · Vitest

## Getting started

```bash
npm install          # install dependencies (once)

npm run dev          # start web (5173) + api (4000) together
```

Then open **http://localhost:5173**.

Run the two sides separately if you prefer:

```bash
npm run dev:web      # frontend only  → http://localhost:5173
npm run dev:api      # backend only   → http://localhost:4000
```

The frontend proxies `/api` to the backend. If the API is not running, the UI automatically
falls back to bundled demo data (shown with a "Demo inventory" badge).

## Checks

```bash
npm run typecheck    # TypeScript project build (no emit)
npm run lint         # ESLint
npm test             # Vitest (unit + integration)
npm run build        # production build → dist/
npm run preview      # preview the production build
```

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Service health |
| GET | `/api/itineraries?from=&to=&maxPrice=` | Filtered inventory |
| GET | `/api/trips` | Seeded trip records |
| GET | `/api/bookings` | Saved simulated bookings |
| GET | `/api/bookings/:ref` | A single booking by reference |
| POST | `/api/bookings` | Create a simulated booking (requires `confirmed: true`) |
| POST | `/api/bookings/:ref/cancel` | Cancel a booking (requires `confirmed: true`) |
| GET | `/api/disruptions` | Advisories / disruptions |
| POST | `/api/chat` | Chat echo (agent engine wiring in Phase 2) |
| GET | `/api/agent/status` | Is a server-side LLM configured? |
| POST | `/api/agent/plan` | LLM trip-plan extraction (501 → client rule fallback) |

## Optional LLM (Trip Planner)

The Trip Planner extracts plans with an on-device rule parser by default. To enable LLM extraction,
set the key on the **server only** (it is never shipped to the browser — see `.env.example`):

```bash
export ROAMAGENT_LLM_API_KEY=sk-...
export ROAMAGENT_LLM_BASE_URL=https://api.openai.com/v1   # any OpenAI-compatible endpoint
export ROAMAGENT_LLM_MODEL=gpt-4o-mini
```

Without a key, `POST /api/agent/plan` returns `501` and the client falls back to the rule parser.

## Simulated itinerary data

The Itinerary Planning engine runs entirely on a **fixed demonstration dataset** of scheduled bus
services (`src/lib/connections.ts`) covering Visakhapatnam ↔ Hyderabad and other corridors. Times,
fares, seat counts and availability are hand-authored sample data — **not live transport data** — and
are labelled "Simulated" throughout the UI. The engine (`src/lib/itinerary.ts`) is deterministic and
unit-tested; no external transport APIs are called.

The **Disruption Simulator** (`src/lib/disruption.ts`) builds on the same dataset: it perturbs the
connection graph for a chosen simulated disruption and re-runs the real `planItineraries` engine to
recalculate the remaining journey. Every disruption event and recovery option is simulated.

## Simulated bookings & notifications

Bookings are simulated end to end: the Booking Review flow requires an explicit confirmation before
`POST /api/bookings` persists a booking to SQLite with a unique `TBS-####` demo reference. **No payment
is taken and no real reservation is made.** Cancellation is likewise confirm-guarded. The in-app
notification centre generates notices from booking events; its email/SMS/push previews are simulated and
gated behind an explicit consent toggle — **no real messages are ever sent**.

## Project structure

```
src/        frontend (pages, components, lib, state)
server/     Express + SQLite API
docs/       PRD, architecture, rules, phases, design, memory
prototype/  original single-file SafeRoute prototype (preserved)
```

## Documentation
- [PRD](docs/PRD.md) · [Architecture](docs/architecture.md) · [Rules](docs/rules.md)
- [Phases](docs/phases.md) · [Design](docs/design.md) · [Memory](docs/memory.md)

## Roadmap
- **Phase 1 ✅** Frontend: 8 screens, UI kit, intent/compare/chat engine, tests, docs.
- **Phase 2 🚧** Backend: Express + SQLite API; ✅ persist simulated bookings/cancellations; server-side agent next.
- **Phase 3 🚧** Agentic: ✅ **Conversational Trip Planner** (EN/Telugu extraction, follow-ups, LLM with rule fallback); ✅ **Itinerary-planning engine** (simulated graph search, constraint validation, labelled alternatives); ✅ **Disruption Simulator** (simulated what-if recovery via the same engine); ✅ **Notification centre** (in-app, consent-gated simulated previews); LLM tool-calling agent, proactive watchers next.
- **Phase 4 ⏳** Auth, payments, E2E tests.
