# Project Memory

> Living log of progress. Update after every work session.

## Status: Phase 1 complete ✅ · Phase 2 in progress 🚧

### Current focus
- **Phase 1 (frontend) is complete and passing all checks.**
- Phase 2 (backend) has a working Express + SQLite scaffold; next up is persisting bookings,
  cancellations and disruption recovery, and moving the intent/compare engine server-side.

### Files most recently worked on
- `server/index.ts`, `server/db.ts`, `server/seed.ts` — Express + SQLite API scaffold.
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

### Documentation
- `docs/PRD.md`, `docs/architecture.md`, `docs/rules.md`, `docs/phases.md`, `docs/design.md`,
  `docs/memory.md`.

## Verification (all green)
| Check | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | ✅ pass |
| Lint | `npm run lint` | ✅ pass |
| Tests | `npm test` | ✅ 40 passed (6 files) |
| Build | `npm run build` | ✅ pass (dist generated) |
| API | `curl localhost:4000/api/health` | ✅ ok |
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

## Next session (Phase 2)
1. `POST /api/bookings` + cancel endpoint; wire Booking Review and My Trips to persist via API.
2. Move intent/compare/chat into `server/` services and have `/api/chat` use them.
3. Add API integration tests and seed reset script.
4. Update this file and commit.
