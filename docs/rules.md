# Rules — conventions, constraints and boundaries

## 1. What to use

- **React function components + hooks.** No class components.
- **TypeScript everywhere.** `strict` mode on; no `any` in new code (lint allows it for escapes only).
- **Vite** for dev/build, **Tailwind** utility classes for styling, plus the shared classes in
  `src/index.css` (`.card`, `.btn-primary`, `.input`, `.label`, `.chip`).
- **lucide-react** for every icon.
- **react-router-dom** for navigation (`NavLink` + `<Outlet />` layout).
- **Express + better-sqlite3** for the API; one module per concern (`db.ts`, `seed.ts`, `llm.ts`, `index.ts`).
- **Vitest + @testing-library/react** for tests; keep pure logic in `src/lib` so it is testable.
- **Shared helpers**: `formatMoney`, `formatDuration`, `formatDate` (never hand-roll formatting),
  `cn()` for conditional class names, `ApiError`/`withFallback` for network calls.
- **Accessibility first**: labels on all inputs, `aria-*` on interactive widgets, focus-visible rings,
  a live region for announcements.

## 2. What to avoid

- ❌ No inline hex colours — use the `navy-*`, `teal-*`, and semantic Tailwind tokens.
- ❌ No new UI libraries (MUI, Chakra, Bootstrap, shadcn) — build from the existing `ui/` primitives.
- ❌ No `alert()` / `confirm()` / `prompt()` — use `<Modal />`, inline errors and status text.
- ❌ No raw `fetch` in pages — go through `src/lib/api.ts`.
- ❌ No secrets, API keys or credentials committed. Use `.env` (git-ignored).
- ❌ No mock data duplicated across files — extend `src/lib/mock.ts` / `server/seed.ts`.
- ❌ No skipping types to "make it compile" (avoid `as unknown as` escapes).
- ❌ No `console.log` left in shipped client code.

## 3. Libraries

| Concern | Library | Notes |
|---|---|---|
| Icons | `lucide-react` | Import named icons only |
| Routing | `react-router-dom` | v6 data-free routing |
| Dates/money | `Intl.*` (built-in) | No moment/dayjs |
| Server | `express`, `cors` | JSON only |
| DB | `better-sqlite3` | Synchronous prepared statements |
| Test | `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | jsdom env |

## 4. Error handling

- **Network**: wrap calls in `try/catch`; surface `ApiError.message` through `<ErrorState onRetry />`.
- **Fallback**: `withFallback()` degrades to demo data and sets a `demo` badge instead of crashing.
- **Forms**: validate on submit, render field-level messages with `role="alert"`, keep values intact.
- **Async actions**: disable the trigger and show a spinner (`<Button loading />`); never allow double submit.
- **Server**: validate query/body, return `{ error }` with a correct status code, and use a global
  error middleware; never leak stack traces to the client.

## 5. Boundaries for the AI layer

- The agent is **grounded only** in the app's own inventory and advisory data. It must not invent
  flights, prices, policies or safety claims that are not in the dataset.
- When an exact match is missing, the agent **says so** and explains what it ranked instead.
- The agent **proposes** recovery/booking actions; the user always confirms through a real form/modal.
- No autonomous spending, cancellation or PII submission without an explicit user action.
- Replies are deterministic and auditable (`respondToMessage` is a pure function) — no hidden state.
- If confidence is low (few signals parsed), the agent asks a clarifying question instead of guessing.
- **Trip Planner** (`src/lib/planner.ts`): never invent a date or travel requirement — a missing
  essential triggers a follow-up question; values the user has already entered are never overwritten
  by a later extraction (`mergeTripPlan` fills empty slots only).
- **LLM is optional and server-side**: `ROAMAGENT_LLM_API_KEY` is read only by `server/llm.ts` and is
  never sent to the browser. The client reaches the model only through `POST /api/agent/plan`, which
  returns `501` when unconfigured so the deterministic rule parser takes over.
- All plan input is passed through `sanitizeTripPlan` (coerce / drop invalid values) before it
  reaches the form or a hand-off.
- **Route engine** (`src/lib/itinerary.ts`, `src/lib/connections.ts`): the connection dataset is
  **simulated demonstration data only** — never describe it as live inventory or real-time transport
  data. Every connection carries `simulated: true` and a source/updated-at stamp, and the UI shows a
  simulated-data banner. The engine must not fabricate a connection or itinerary: an impossible route
  returns no results plus an explanation, and impossible connections are rejected with a reason
  (sold out, too few seats, transfer below the 30-minute minimum, unsupported accessibility/luggage).
  Multi-leg journeys are capped at 3 legs and never revisit a city.
- **Disruption simulator** (`src/lib/disruption.ts`): every injected disruption and every recovery
  option is **simulated demonstration data** and must carry the simulated label. Recovery options must
  come from the real `planItineraries` engine — never be hard-coded or invented. A scenario with no
  reachable alternative must return an explicit no-alternative result rather than a fabricated fix.
  Recovered journeys are re-checked against the original arrival deadline, budget and minimum transfer
  time before being presented as feasible.
- **Booking** (`src/lib/bookings.ts`, `server/db.ts`): bookings are **simulated** — never take payment,
  never use payment credentials, never claim a real reservation, and label every reference as a demo
  identifier (`TBS-####`). A booking or cancellation must not happen without an **explicit confirmation
  step**: the API rejects `POST /api/bookings` and `POST /api/bookings/:ref/cancel` with `400` unless
  `confirmed: true`, and the UI opens a confirmation modal first. Validate all input server-side
  (`validateBookingInput` → `BookingError.fieldErrors`) before persisting.
- **Notifications** (`src/state/NotificationsContext.tsx`): the notification centre only produces
  **in-app** notices and **simulated delivery previews**. No real email/SMS/push is sent, and delivery
  previews are gated behind explicit user **consent** (default off, persisted). Notifications are
  derived from real app events (booking/cancellation) — never fabricated claims.
