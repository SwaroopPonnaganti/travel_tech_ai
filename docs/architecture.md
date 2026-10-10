# Architecture

## 1. App flow

```
                ┌───────────────────────────────────────────────┐
                │                 Browser (SPA)                  │
                │  React + TypeScript + Vite + Tailwind          │
                │                                                │
   Nav ─────────┤  Dashboard · Chat · Search · Compare           │
                │  Disruptions · My Trips · Booking · Settings   │
                └───────────────┬────────────────────────────────┘
                                │  fetch("/api/...")
                                │  (Vite dev proxy → :4000)
                                ▼
                ┌───────────────────────────────────────────────┐
                │           Node.js + Express API                │
                │  /api/health /api/itineraries /api/trips       │
                │  /api/disruptions /api/chat                    │
                └───────────────┬────────────────────────────────┘
                                │  better-sqlite3 (synchronous)
                                ▼
                ┌───────────────────────────────────────────────┐
                │            SQLite  server/data/*.db            │
                │  itineraries · trips · disruptions             │
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

### State
- `SettingsContext` — language + accessibility, persisted to `localStorage`, applied to `<html>`.
- `TripsContext` — in-memory trip store (bookings, cancellations, status changes).
- Server data is fetched per page; local contexts hold session edits.

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
│   ├── index.ts               # Express app + routes
│   ├── db.ts                  # SQLite schema, seeds, data access
│   └── seed.ts                # seed itineraries / trips / disruptions
└── src/
    ├── main.tsx               # React entry
    ├── App.tsx                # providers + routes
    ├── index.css              # Tailwind layers + a11y modes
    ├── config/nav.ts          # navigation model
    ├── lib/                   # types, format, intent, compare, chat, api, i18n, mock, cn
    ├── state/                 # SettingsContext, TripsContext
    ├── components/
    │   ├── layout/AppShell.tsx
    │   ├── ui/                # Button, Card, Badge, Field, Modal, Skeleton, …
    │   ├── ItineraryCard.tsx
    │   ├── TransportIcon.tsx
    │   └── LiveRegion.tsx
    ├── pages/                 # one file per feature screen
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
