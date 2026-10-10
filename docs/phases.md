# Delivery Phases

Legend: ✅ done in this build · 🚧 next · ⏳ planned

## Phase 0 — Discovery & setup ✅
- Inspect existing repo; preserve the `SafeRoute AI` prototype under `prototype/`.
- Scaffold Vite + React + TS + Tailwind + ESLint + Vitest, install dependencies.
- Establish navy/teal theme, layout shell and design tokens.

## Phase 1 — Frontend foundation & screens ✅
- Routing + `AppShell` (sidebar, mobile drawer, live region).
- Reusable UI kit (Button, Card, Badge, Field, Modal, Skeleton, Empty/Error states, StatCard, Toggle, Segmented).
- **Dashboard** — KPIs, next trip, disruption radar, spend trend, activity.
- **AI Travel Chat** — intent parsing, grounded replies, suggestion chips, search hand-off.
- **Trip Search** — validated form, loading skeletons, fallback data, ranking.
- **Itinerary Comparison** — select up to 3, weighted scoring, winner highlight.
- **Disruption Management** — filters, simulate, recover, alternatives.
- **My Trips** — tabs, details modal, check-in, cancellation.
- **Booking Review** — traveller forms, fare breakdown, confirmation + PNR.
- **Settings** — language + accessibility controls with instant, persistent effect.
- Tests (format, intent, compare, chat, Button, routing) and docs.

## Phase 2 — Backend & persistence 🚧
- ✅ Minimal Express + SQLite API scaffold (health, itineraries, trips, disruptions, chat).
- ✅ Agent endpoints — `GET /api/agent/status` and `POST /api/agent/plan` (server-side LLM proxy, returns 501 when unconfigured so the client falls back).
- 🚧 Move the intent/compare/chat engine into reusable server modules.
- 🚧 Persist bookings (`POST /api/bookings`) and cancellations from the UI.
- 🚧 Persist disruption generation + recovery actions.
- 🚧 Wire the frontend to the live API as the primary source (fallback becomes error-only).

## Phase 3 — Agentic intelligence 🚧
- ✅ **Conversational Trip Planner** — free-text (English + Telugu) extraction into an editable structured form, follow-up questions for missing essentials, never invents dates, LLM with secure server-side key + rule-based fallback (`src/lib/planner.ts`, `src/lib/llm.ts`, `TripPlannerPage`, `TripPlanForm`).
- 🚧 LLM-backed chat with tool-calling over inventory/advisories.
- ⏳ Proactive price-drop and disruption watchers with notification centre.
- ⏳ Personalised ranking from trip history and preferences.

## Phase 4 — Auth, payments, polish ⏳
- Login / profile / saved travellers and documents.
- Payment gateway sandbox and real PNR issuance.
- E2E tests (Playwright), performance budget, offline PWA shell.

## Phase 5 — Hardening & submission ⏳
- Accessibility audit (axe), i18n coverage for all screens.
- Observability, rate limiting, security headers.
- Hackathon demo script, screenshots and final documentation.
