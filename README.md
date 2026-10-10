# TBS RoamAgent — Agentic AI Travel Concierge

A full-stack travel concierge built for the **SAMARTHA Hackathon**: plan, compare, book and recover
trips through an agentic AI experience with a fast, accessible dashboard.

Built with **React + TypeScript + Vite + Tailwind CSS** on the frontend and **Node.js + Express + SQLite**
on the backend. Icons by **lucide-react**, tests by **Vitest**.

## Features
- **Dashboard** — KPIs, next trip, disruption radar, spend trend, activity feed.
- **AI Travel Chat** — natural-language requests parsed into origin/destination/date/budget/priority with grounded recommendations.
- **Trip Search** — validated form, loading skeletons, graceful live-API fallback, ranked results.
- **Itinerary Comparison** — compare up to 3 options with a weighted score and winner highlight.
- **Disruption Management** — severity filters, simulate/recover actions, ranked alternatives.
- **My Trips** — status tabs, details, check-in and cancellation flows.
- **Booking Review** — dynamic traveller forms, fare breakdown, confirmation with PNR.
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
| GET | `/api/trips` | Bookings |
| GET | `/api/disruptions` | Advisories / disruptions |
| POST | `/api/chat` | Chat echo (agent engine wiring in Phase 2) |

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
- **Phase 1 ✅** Frontend: all 8 screens, UI kit, intent/compare/chat engine, tests, docs.
- **Phase 2 🚧** Backend: Express + SQLite API, persist bookings/cancellations, server-side agent.
- **Phase 3 ⏳** LLM tool-calling agent, proactive watchers.
- **Phase 4 ⏳** Auth, payments, E2E tests.
