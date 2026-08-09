# Spec: Frontend ↔ Backend Integration

## What it solves

Spec `04-frontend-ui-shell.md` builds the app's screens against mock local state. This spec replaces that mock state with real calls to the Spring Boot API for everything the backend already supports (auth, categories, transactions, summary, excel import), and wires up the Google OAuth2 login flow end to end. Investments/savings stay on local mock state — there's no backend for them yet (roadmap item 4).

## Scope

Includes:
- Google login flow: "Sign in with Google" → `/oauth2/authorization/google` → Google → backend callback → redirect to `${app.frontend-redirect-uri}?token=<jwt>` → `auth-callback` route stores the JWT and redirects into the app.
- `AuthService`: store/read JWT (e.g. `localStorage`), `login()`, `logout()`, `getCurrentUser()` via `GET /api/auth/me`, `isAdmin()`.
- `auth.interceptor.ts`: attach `Authorization: Bearer <token>` to every `/api/**` request; on `401`, clear the token and redirect to login.
- `auth.guard.ts` / `admin.guard.ts`: protect app routes behind a valid session; category-write UI hidden/disabled for non-admins (backend already 403s, this just avoids a dead-end UX).
- `CategoriesService`, `TransactionsService`: real `HttpClient` calls replacing the mock arrays from spec 04, matching `core/models/category.model.ts` / `transaction.model.ts` exactly (already aligned with the backend DTOs).
- `ImportService`: `POST /api/transactions/import/preview` (multipart) and `POST /api/transactions/import/confirm`, replacing the wizard's simulated preview/confirm states.
- Dashboard summary: `GET /api/transactions/summary?month=yyyy-MM` replacing the mock stat-card/breakdown math.
- Error handling: map backend validation messages (Spanish, from `message` fields per `backend/.agentic-rules`) to the same inline error UI spec 04 already has (disabled buttons, inline error text) rather than generic toasts.

Does NOT include (yet):
- Investments/savings endpoints (none exist on the backend — those screens keep spec 04's local mock state until a future backend spec adds them).
- Role management UI (promote/demote) — backend doesn't expose it either.
- Refresh tokens / silent re-login — on JWT expiry (1h), user is redirected to log in again via Google, same as the backend spec's design.

## Data model

No new entities. This spec is pure integration — it consumes the DTOs already defined in `backend/src/main/java/com/nicolas/finanzas/{auth,category,transaction}/dto/` and already mirrored in `frontend/src/app/core/models/*.model.ts`. If a mismatch is found during implementation, the frontend model is the one that gets corrected (backend DTOs are source of truth).

## Endpoints

| Method | Path | Used by |
|---|---|---|
| GET | `/oauth2/authorization/google` | "Sign in with Google" button (full-page redirect, not an XHR) |
| GET | `/api/auth/me` | `AuthService.getCurrentUser()`, on app init and after login |
| GET | `/api/categories` | Categories screen, category selects elsewhere (quick-add, filters, import preview) |
| POST/PUT/DELETE | `/api/categories`, `/api/categories/{id}` | Categories screen create/edit/delete (admin-only; backend 403s otherwise) |
| GET | `/api/transactions?type&categoryId&month` | Transactions screen, dashboard recent-tx panel |
| POST/PUT/DELETE | `/api/transactions`, `/api/transactions/{id}` | Transactions screen create/edit/delete, dashboard quick-add |
| GET | `/api/transactions/summary?month=yyyy-MM` | Dashboard stat cards + category breakdown |
| POST | `/api/transactions/import/preview` (multipart) | Import wizard step 2 |
| POST | `/api/transactions/import/confirm` | Import wizard step 2 → 3 |

## Edge cases / business rules

- `401` on any `/api/**` call (expired/missing JWT): interceptor clears stored token and redirects to login — no retry, no silent refresh (matches backend spec's no-refresh-token decision).
- `403` on category writes: the current user isn't `ADMIN` — the create/edit/delete controls should already be hidden for non-admin users (`isAdmin()` check), so a `403` here means a state desync (e.g. role changed mid-session) — show the same inline error style as a validation failure, don't crash the screen.
- A transaction/category `404` (not `403`, per backend spec's leak-avoidance design) on edit/delete of a row that's no longer there (deleted by another tab/session) — remove the row from local state and show a brief inline notice, don't treat it as a network error.
- Import preview `errors` list is non-empty → confirm stays disabled, exactly like spec 04's mocked "error" wizard mode — the real backend response now drives the same UI state instead of the simulated one.
- `exchangeRate` is only sent/shown when `currency === 'USD'`, `null` for `ARS` — matches `TransactionRequest`'s validation (`@Positive` only applies when present).
- Dates: input/display as `yyyy-MM-dd` (native `<input type="date">` already matches backend `LocalDate` JSON serialization) — no timezone conversion needed since these are pure calendar dates, not instants.

## Out of scope / future

- Investments/savings backend + integration (needs new backend entities/endpoints first, roadmap item 4).
- Refresh tokens, "remember me", logout-everywhere.
- Real-time updates (polling/websockets) — data refreshes on navigation/action, not live-pushed.
- Admin role-management UI.
