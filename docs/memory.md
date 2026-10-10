# Project Memory

> Living log of progress. Update after every work session.

## Status: Phase 1 complete ✅ · Phase 2 in progress 🚧 · Phase 3 agentic in progress 🚧

### Current focus
- **Phase 1 (frontend) is complete and passing all checks.**
- Phase 3 has a conversational Trip Planner and a simulated **itinerary-planning engine** (graph search
  over a fixed connection dataset, constraint validation, labelled alternatives).
- Phase 2 (backend) has a working Express + SQLite scaffold; next up is persisting bookings,
  cancellations and disruption recovery, and moving the intent/compare engine server-side.

### Files most recently worked on
- `src/lib/connections.ts`, `src/lib/itinerary.ts` — simulated dataset + route-planning engine.
- `src/components/planner/PlannedItineraryCard.tsx`, `src/pages/ItineraryResultsPage.tsx` — results UI.
- `src/config/nav.ts`, `src/App.tsx`, `src/pages/TripPlannerPage.tsx` — planner → engine hand-off.
- `docs/*` — PRD, architecture, rules, phases, design, memory.

---

## Completed

### Project setup
- Inspected the repo and preserved the original single-file `index.html` prototype as
  `prototype/safe-route-prototype.html` (working route-planning demo — kept as reference).
- Scaffolded Vite 6 + React 18 + TypeScript, Tailwind 3 (custom navy/teal theme), ESLint 9 flat config,
  Vitest + Testing Library. See `package.json` scripts.

### Frontend (Phase 1)
- `src/App.tsx` — router with nested `AppShell` layout; providers for settings + trips.
- `src/components/layout/AppShell.tsx` — desktop sidebar, mobile drawer, top bar, footer.
- UI kit: Button, Card, Badge, Field (Input/Select/Textarea), Modal, Skeleton, EmptyState,
  ErrorState, StatCard, ToggleSwitch, SegmentedControl, Spinner, PageHeader.
- Domain components: `ItineraryCard`, `TransportIcon`, `LiveRegion`.
- Screens: Dashboard, AI Chat, Trip Search, Itinerary Comparison, Disruption Management,
  My Trips, Booking Review, Settings, NotFound — all functional and responsive.

### Logic layer (pure, tested)
- `src/lib/intent.ts` — NL intent parser (route, date, travellers, budget, priority).
- `src/lib/compare.ts` — weighted itinerary scoring + winner reasons.
- `src/lib/chat.ts` — grounded agent replies + search hand-off.
- `src/lib/format.ts`, `mock.ts`, `api.ts`, `i18n.ts`, `cn.ts`, `types.ts`.

### Accessibility & i18n
- Language: English, Hindi, Telugu, Tamil, Spanish.
- Text size, high-contrast, reduced-motion, reduce-transparency, screen-reader announcements.
- Settings persisted to `localStorage`; applied via `<html>` data attributes.

### Backend (Phase 2 — started)
- `server/db.ts` — SQLite schema (`itineraries`, `trips`, `disruptions`), migration + seeding.
- `server/index.ts` — `/api/health`, `/api/itineraries`, `/api/trips`, `/api/disruptions`, `/api/chat`.
- Verified: web + API + Vite proxy all respond; `withFallback` shows "Live API" when the server is up.

### Conversational Trip Planner (new)
- **Domain** — `src/lib/types.ts`: `TripPlan` (origin, destination, departure date/window/time,
  arrival date/time, passengers, max budget, coach class, accessibility, luggage, first/last mile),
  `PlanExtraction`, `PlanValidation`, `AgentStatus`.
- **Rule engine** — `src/lib/planner.ts`: English + Telugu free-text extraction. Telugu postpositions
  (`నుండి` → "from", dative `కు/కి` → "to") are reordered before keyword/city translation; numerals,
  cities, dates, time windows, budget, coach, accessibility, luggage and first/last-mile needs are
  parsed. Also: `mergeTripPlan` (never overwrites user values), `sanitizeTripPlan` (coerces/drops
  untrusted input), `validateTripPlan`, `missingFields`, `plannerQuestion`, `summarizePlan`.
  **Never invents a date** — a missing date triggers a follow-up question instead.
- **LLM bridge** — `src/lib/llm.ts` (client) + `server/llm.ts` (server-side provider). Key lives only
  on the server (`ROAMAGENT_LLM_API_KEY` etc.); `/api/agent/status` reports config, `/api/agent/plan`
  proxies the call and returns **501 when unconfigured** so the client falls back to the rule parser.
- **UI** — `src/components/planner/TripPlanForm.tsx` (grouped, editable, auto-filled badges) and
  `src/pages/TripPlannerPage.tsx` (chat transcript + examples + structured plan + follow-up banner +
  hand-off to Trip Search). Route `/plan`, nav item "Trip Planner".
- **i18n** — `nav.planner` (all 5 languages) and the full `planner.*` set in English + Telugu
  (others fall back to English). Follow-up questions are English/Telugu.
- **Tests** — `src/lib/planner.test.ts` (24), `src/lib/llm.test.ts` (7), `src/pages/TripPlannerPage.test.tsx` (3),
  plus a new routing test in `App.test.tsx`.

### Itinerary-planning engine (new, simulated)
- **Types** — `src/lib/types.ts`: `Connection` (origin/destination + stops, departure/arrival, duration,
  fare, transport type, availability + seats, coach, accessibility, luggage, source, updated-at,
  `simulated: true`), `Transfer` (location, waiting time, risk, station change), `PlannedItinerary`,
  `PlanResult`, `PlanRejection`, `DatasetInfo`, `ItinerarySort`, `ItineraryFilters`.
- **Dataset** — `src/lib/connections.ts`: a fixed demonstration dataset of scheduled bus services
  (Visakhapatnam ↔ Hyderabad direct overnight/day, Visakhapatnam → Vijayawada → Hyderabad,
  Visakhapatnam → Rajahmundry → Vijayawada → Hyderabad, Hyderabad ↔ Bengaluru via Kurnool,
  Bengaluru ↔ Chennai). Includes sold-out, limited-seat, non-accessible and tight-transfer rows to
  exercise rejection. `connectionsForDate(date)` materialises dated connections; every row is simulated.
- **Engine** — `src/lib/itinerary.ts`: time-aware depth-limited graph search (max 3 legs) that builds
  feasible multi-leg journeys, validates transfer times (`MIN_TRANSFER_MIN` 30 min), seats, accessibility,
  luggage, arrival deadlines and budget, **rejects impossible connections** with reasons, and separates
  **feasible** matches from **labelled alternatives** (over budget / late / outside preferred window).
  Derives transfer location/wait/risk and price/duration/comfort/risk scores; `sortItineraries` +
  `filterItineraries`. Unknown routes return an explanation listing dataset cities — never a fake result.
- **UI** — `src/components/planner/PlannedItineraryCard.tsx` (fare, duration, dep/arr, transfers,
  comfort, transfer risk, deadline compliance, data freshness, expandable leg details) and
  `src/pages/ItineraryResultsPage.tsx` (simulated-data banner, explanation, sort control, filters,
  best matches + alternatives + rejected list). Route `/itineraries`, nav item "Itinerary Planning".
  Planner `Find options` now hands the full plan to the engine.
- **i18n** — `nav.itineraries` (all 5 languages) + full `plan.*` set in English (Telugu partial; others
  fall back to English).
- **Tests** — `src/lib/itinerary.test.ts` (21) and `src/pages/ItineraryResultsPage.test.tsx` (4), plus a
  new `/itineraries` routing test in `App.test.tsx`.

### Disruption simulator (new, simulated)
- **Types** — `src/lib/types.ts`: `DisruptionKind` (bus-delay, bus-cancellation, missed-connection,
  last-mile-unavailable), `DisruptionEvent`, `RevisedItinerary`, `DisruptionSimulation`.
- **Engine** — `src/lib/disruption.ts`: `simulateDisruption(original, plan, kind, options)` injects one
  simulated disruption, perturbs the connection pool (shift or remove the affected leg, delay the
  preceding leg for a missed connection), and calls the **real** `planItineraries` engine to recalculate
  the remaining journey from the resume city. Recovered options are composed back onto the untouched
  prefix with `assembleItinerary`, then re-checked against the original deadline, budget and comfort
  constraints. Produces affected-leg identification, a recalculation description, per-option extra cost,
  arrival delay, deadline/budget status and trade-off bullets, plus a clear no-alternative result.
  `servicePool`, `shiftConnection` and `assembleItinerary` were extracted from `itinerary.ts` for reuse.
- **UI** — `src/pages/DisruptionSimulatorPage.tsx`: scenario controls (journey selector, disruption-type
  radio group, delay length, affected leg), a visible **Simulate Disruption** and **Reset** button, the
  affected-leg panel, impact summary, an original-vs-revised comparison table and recalculated option
  cards (reusing `PlannedItineraryCard`). Route `/simulator`, nav item "Disruption Simulator", plus a
  link from the existing Disruption Management page. Every event/status is badged **Simulated**.
- **i18n** — `nav.simulator` (all 5 languages) + full `sim.*` set in English and `sim.title`/
  `sim.description` in the other languages (others fall back to English).
- **Tests** — `src/lib/disruption.test.ts` (11: delay handling, cancellation recovery, missed-connection
  transfer feasibility, no-alternative, deadline/budget re-checks), `src/pages/DisruptionSimulatorPage.test.tsx`
  (3), plus a new `/simulator` routing test in `App.test.tsx`.

### Documentation
- `docs/PRD.md`, `docs/architecture.md`, `docs/rules.md`, `docs/phases.md`, `docs/design.md`,
  `docs/memory.md`.
- `.env.example` — documents `PORT` and the optional `ROAMAGENT_LLM_*` variables.

## Verification (all green)
| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | ✅ pass |
| Lint | `npm run lint` | ✅ pass |
| Tests | `npm test` | ✅ 115 passed (13 files) |
| Build | `npm run build` | ✅ pass (dist generated) |
| API | `curl localhost:4000/api/health` | ✅ ok |
| Agent status | `curl localhost:4000/api/agent/status` | ✅ `llmConfigured:false` |
| Agent plan (no key) | `curl -X POST localhost:4000/api/agent/plan` | ✅ 501 fallback |
| Itineraries page | `curl localhost:5173/itineraries` | ✅ 200 (SPA) |
| Simulator page | `curl localhost:5173/simulator` | ✅ 200 (SPA) |
| Dev stack | `npm run dev` | ✅ web 5173 + api 4000 |

## How to run
```bash
npm install          # once
npm run dev          # web (5173) + api (4000) together
# or separately:
npm run dev:web      # frontend only
npm run dev:api      # backend only
```
Then open http://localhost:5173

## Next session (Phase 2/3)
1. `POST /api/bookings` + cancel endpoint; wire Booking Review and My Trips to persist via API.
2. Move intent/compare/chat into `server/` services and have `/api/chat` use them.
3. Add API integration tests and seed reset script.
4. Set `ROAMAGENT_LLM_API_KEY` and verify a live LLM plan end-to-end (currently 501 → rule fallback).
5. Persist the simulated connection dataset behind `GET /api/connections` and let the engine fetch it,
   keeping the bundled dataset as the offline fallback.
6. Update this file and commit.
