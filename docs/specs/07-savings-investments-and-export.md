# Spec: Savings & Investments module + Data export (PDF/CSV/XLS)

> **Implementation status**: Investments (IOL) shipped as specced below — stateless proxy, zero
> server-side persistence. Savings and Export diverged from this spec; see
> [Implementation notes](#implementation-notes-post-launch) at the end of this document before
> treating the sections below as current behavior.

## What it solves

Three related gaps closed together:

1. **Savings** (`/investments` today) is a frontend-only mock (`investments.ts`/`investments.model.ts`) with hardcoded arrays that reset on page reload — there's no backend, so nothing persists. This spec gives manual savings entries (cash, bank accounts, etc.) real persistence, ARS/USD, combined into the same "pesify USD via blue" pattern already used across dashboard/analytics.
2. **Investments** (same page, Portfolio tab): instead of manual holdings entry, this connects live to the user's real IOL (invertironline.com) brokerage account so they see their actual stocks/bonds — with a hard constraint: **fintrack never persists IOL credentials, tokens, or portfolio data anywhere in the database.** Everything is fetched live per-request and held only in the browser (`sessionStorage`) for the session.
3. **Export**: users have no way to get their data out of the app. This adds an export endpoint that produces a CSV, XLSX, or PDF of transactions (income and/or expenses, one or both types) for a date range, including per-row detail and the same balance/summary figures shown on the dashboard.

## Scope

Includes:
- **Backend — Savings**: CRUD for manual savings entries (`SavingEntry`: label, amount, currency, ownerUser). Simple list + total by currency, no history/snapshots.
- **Backend — Investments (IOL)**: stateless proxy under `/api/iol/**` forwarding login and portfolio reads to IOL's public API (`api.invertironline.com`). No `@Entity`, no `Repository` — zero persistence is the defining constraint of this part of the spec. The IOL session token round-trips via request body/header only, never a cookie, never written to Postgres, never logged. Backend does not even cache it in memory between requests (strict pass-through per call).
- **Frontend — Savings**: replace the in-memory `Saving[]` signal in `investments.ts` with calls to the new `SavingsService`, keep the existing UI (savings list, ARS/USD toggle) — this is a data-source swap, not a redesign.
- **Frontend — Investments (IOL)**: replace the fake `iolConnected` boolean/`toggleIol()` with a real login flow (username/password modal) backed by `IolService`, which holds the IOL access/refresh token in `sessionStorage` (survives a page refresh, cleared when the tab/browser closes) and proactively refreshes before the ~15-minute IOL token expires. When connected, the Portfolio tab's holdings table/gauge/stat-cards render live IOL data (read-only — nothing to edit, it isn't ours). When not connected, the table starts empty with a prompt to connect (the current hardcoded mock array is removed entirely, no manual-entry fallback in this version).
- **Backend — Export**: `GET /api/transactions/export` with `format` (`csv` | `xlsx` | `pdf`), `type` (`INCOME` | `EXPENSE` | omitted = both), and the same `month` / `from`+`to` filters already used by `/api/transactions` (reuses `TransactionService.findAll`/date-range resolution, see spec `05-frontend-backend-integration.md` for the filter contract). Streams a file download (`Content-Disposition: attachment`).
- Export content, all three formats:
  - Row-level detail: date, type, category, description, amount, currency, exchange rate (if USD), amount in ARS equivalent.
  - Summary block: total income, total expense, balance — per currency (ARS, USD) and combined (pesified at the blue rate active at export time, same as dashboard's `effectiveRate`).
  - PDF additionally gets a simple header (period label, generated-at timestamp) and the summary block rendered as a readable table before the row detail — it's a report, not just a data dump.
- **Frontend — Export UI**: new "Exportar" action (button/menu) on the dashboard and/or transactions page: pick format (CSV/XLSX/PDF), pick type (income/expense/both), reuses the existing `app-period-filter` component for the date range, triggers a file download via the browser (no preview step — this isn't the import wizard).

Does not include:
- Manual entry of holdings / persisted investment data — discarded in favor of the live IOL integration. Users without an IOL account see an empty Portfolio tab (no manual fallback in this version).
- Trading/placing orders via IOL — read-only (portfolio view + quotes) only.
- Investment transaction history (buys/sells over time) — only current holdings snapshot, fetched fresh each time.
- Savings/investment snapshots over time (the dashboard's "evolution" chart stays frontend-mocked until a follow-up spec adds historical snapshots — which would need persistence, conflicting with IOL's zero-persistence constraint for the investments side).
- Scheduled/recurring exports or emailing the export.
- Exporting anything other than transactions (no savings/investments export in this version).

## Data model

**SavingEntry** (`saving.model`, new)
- `id`, `label`, `amount` (BigDecimal), `currency` (`Currency`: ARS/USD), `user` (`@ManyToOne` -> User)

**Investments (IOL)**: no entity, no table — zero persistence is the central constraint of this part of the spec (see Endpoints and Edge cases). DTOs only (`IolLoginRequest`, `IolTokenResponse`, `IolHoldingResponse`, `IolPortfolioResponse`), all transient, never `@Entity`/`@Column`-annotated, never passed to a `Repository`.

No new entities for export — it reads existing `Transaction` rows via `TransactionService`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/savings` | List the current user's savings entries |
| POST | `/api/savings` | Create a savings entry |
| PUT | `/api/savings/{id}` | Update a savings entry |
| DELETE | `/api/savings/{id}` | Delete a savings entry |
| POST | `/api/iol/login` | Forwards `{username, password}` to IOL's `/token` (password grant). Returns `{accessToken, refreshToken, expiresInSeconds}`. Requires our own app JWT. Credentials never logged, never persisted. |
| POST | `/api/iol/refresh` | Forwards `{refreshToken}` to IOL's `/token` (refresh grant). Returns a new token triplet. Requires app JWT. |
| GET | `/api/iol/portfolio` | Requires header `X-Iol-Token` with the IOL access token. Forwards to IOL's portfolio endpoint(s), maps to `IolHoldingResponse[]` (ticker/name/qty/avgCost/price/currency/value/result). Requires app JWT. |
| GET | `/api/transactions/export?format=csv\|xlsx\|pdf&type=&month=\|from=&to=` | Stream a file with transaction detail + summary for the given filters |

## Edge cases / business rules

- Savings entries are scoped to the authenticated user (`CurrentUserProvider`), same as transactions and categories — no cross-user visibility. IOL endpoints don't use `CurrentUserProvider` at all (nothing user-scoped is stored server-side); they're gated only by requiring our own app JWT like everything else under `SecurityConfig`'s default `.anyRequest().authenticated()`.
- `amount` (savings) must be `> 0` (mirrors the `@Positive` rule already used on `Transaction.amount`).
- IOL's access token is short-lived (~15 min per IOL docs) — the frontend proactively refreshes it (using the `expiresInSeconds` returned at login) instead of waiting for a 401.
- A `401` from `/api/iol/portfolio` (IOL session expired) must NOT trigger fintrack's own logout-and-redirect-to-login flow — the frontend's `auth.interceptor.ts` only does that for our own app JWT's 401s; an expired IOL token just prompts "reconnect to IOL" inline on the Portfolio tab.
- IOL login failure (bad IOL username/password) surfaces a generic error message — the proxy never echoes or logs the submitted password, even if IOL's own error response happens to include it.
- IOL's `moneda` field must be mapped explicitly to fintrack's `Currency` enum (ARS/USD) — an unrecognized value logs a warning and excludes that row rather than silently mis-tagging its currency.
- Disconnecting clears the `sessionStorage` token client-side only — no server-side IOL logout call in v1.
- Export with no matching transactions for the given filters still returns a valid (mostly-empty) file with the summary block showing zeros, not a 404 — consistent with how the dashboard shows an empty state rather than erroring on an empty period.
- Export `format` must be one of `csv`/`xlsx`/`pdf` (case-insensitive) — unknown value -> `400` via the same `GlobalExceptionHandler` pattern as other invalid-input errors.
- Same `from`/`to` partial-range validation as `/api/transactions` (see fix in `TransactionService.resolveRange`): passing only one of `from`/`to` is rejected, not silently ignored.
- Export USD pesification uses the dolar-blue rate the frontend already fetches (`DolarBlueService`) — the frontend passes the rate it's currently showing the user as a query param (`blueRate`) so the PDF/summary matches exactly what's on screen; if omitted, backend falls back to the average `exchangeRate` across the exported USD transactions (same fallback logic as `Dashboard.avgUsdRate`).

## Out of scope / future

- Trading/order placement via IOL (read-only in v1).
- Caching the IOL token in the backend between requests (deliberately avoided for the strictest possible zero-persistence guarantee, even though an in-memory cache would arguably still satisfy "nothing in Postgres").
- Manual holdings entry as a fallback for users without an IOL account.
- Historical snapshots / net-worth-over-time chart backed by real data.
- Exporting savings/investments, not just transactions.
- Scheduled or emailed exports.
- PDF charts/graphs (v1 PDF is tabular only, no embedded gauge/bar visuals).

## Implementation notes (post-launch)

What actually shipped, where it diverges from the scope above:

- **Investments (IOL)**: implemented as specced — `backend/.../iol/` (client/service/controller/dto,
  no entity/repository), `IolService`/`IolApiClient`, frontend `IolService` holding the token in
  `sessionStorage`. Endpoints match the table above.
- **Savings**: the backend `SavingEntry` CRUD (`/api/savings`) described above was **never built**.
  Savings stayed frontend-only, but moved from an in-memory mock to `localStorage`
  (`frontend/src/app/features/investments/investments.ts`, key `fintrack.savings`) so entries
  survive a reload. Each entry also gained a `kind` (`BANK`/`CASH`), not in the original data model,
  used by the net worth breakdown below. Still no cross-device sync, no backend entity.
- **Export** (`/api/transactions/export`, CSV/XLSX/PDF): **not implemented**. No controller,
  service, or frontend "Exportar" action exists.
- **Net worth ("Patrimonio" tab)**: added, not in the original spec. Consolidates IOL portfolio
  value + bank savings + cash savings into one ARS/USD-toggleable total, pesified at the dolar-blue
  rate (same pattern as the dashboard's combined total). Falls back to an explicit
  "couldn't fetch the rate" state instead of guessing when the blue quote fails — see `toView`/
  `combine` in `investments.ts`.
- **Privacy mode**: added, not in the original spec. A sidebar toggle (`core/privacy/privacy.service.ts`)
  masks every amount rendered through `CurrencyFormatPipe` (`$ ••••`) app-wide, for demos/screenshots.
  Descriptions, category names, and tickers are intentionally left unmasked. Chart *shapes*
  (donut arc lengths, analytics bar heights) still derive from real proportions even when the
  amount text is masked — known, accepted gap, not silently patched.

If backend-persisted savings or export get picked up later, treat the "Scope"/"Endpoints" sections
above as the starting design, not as already-built — verify against the current code first.
