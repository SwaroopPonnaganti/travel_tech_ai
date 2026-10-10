# Architecture

## 1. App flow

```
                ┌───────────────────────────────────────────────┐
                │                 Browser (SPA)                  │
                │  React + TypeScript + Vite + Tailwind          │
                │                                                │
   Nav ─────────┤  Dashboard · Chat · Planner · Search · Compare │
                │  Disruptions · My Trips · Booking · Settings   │
                └───────────────┬────────────────────────────────┘
                                │  fetch("/api/...")
                                │  (Vite dev proxy → :4000)
                                ▼
                ┌───────────────────────────────────────────────┐
                │           Node.js + Express API                │
                │  /api/health /api/itineraries /api/trips       │
                │  /api/disruptions /api/chat                    │
                │  /api/agent/status /api/agent/plan             │
                └───────────────┬────────────────────────────────┘
                                │  better-sqlite3 (synchronous)
                                │  optional: OpenAI-compatible LLM
                                │  (ROAMAGENT_LLM_API_KEY, server-only)
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
  → sanitize → validate → editable form + follow-up question → hand-off to Trip Search.

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
│   ├── index.ts               # Express app + routes (incl. /api/agent/*)
│   ├── llm.ts                 # server-side LLM provider (key stays on server)
│   ├── db.ts                  # SQLite schema, seeds, data access
│   └── seed.ts                # seed itineraries / trips / disruptions
└── src/
    ├── main.tsx               # React entry
    ├── App.tsx                # providers + routes
    ├── index.css              # Tailwind layers + a11y modes
    ├── config/nav.ts          # navigation model
    ├── lib/                   # types, format, intent, planner, llm, compare, chat, api, i18n, mock, cn
    ├── state/                 # SettingsContext, TripsContext
    ├── components/
    │   ├── layout/AppShell.tsx
    │   ├── ui/                # Button, Card, Badge, Field, Modal, Skeleton, …
    │   ├── planner/           # TripPlanForm.tsx (structured plan editor)
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
| LLM (optional) | OpenAI-compatible chat completions via `server/llm.ts` | Server-side key; deterministic fallback when unconfigured |
