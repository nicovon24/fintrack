# Spec: Frontend UI Shell (from initial-design.html)

## What it solves

`docs/initial-design.html` is an interactive HTML mockup (mock data, in-memory state) of the whole app: sidebar nav, dashboard, import wizard, transactions, categories, analytics, investments + savings, dark/light theme. This spec turns that mockup into real Angular standalone components/routes, with the same screens, layout, and interactions — still backed by local mock data. Wiring to the real backend API is a separate spec (`05-frontend-backend-integration.md`) so UI structure and data plumbing aren't tangled into one giant change.

## Scope

Includes:
- App shell: sidebar (logo, 6 nav buttons, theme toggle) + top bar (screen title) + content area, per the mockup's layout.
- 6 routed screens as standalone lazy-loaded components under `features/`: Dashboard, Import Wizard, Transactions, Categories, Analytics, Investments (with Portfolio/Savings sub-tabs).
- Dark/light theme toggle (CSS custom properties / design tokens, not per-component conditionals).
- All interactions the mockup has as client-side state: month/range/year date-mode switch on dashboard, quick-add transaction modal, inline edit/delete-with-confirm on transactions/categories/investments/savings rows, 3-step import wizard (upload → preview/errors → success) with a "simulate outcome" control, analytics range switch, IOL connect/disconnect toggle (visual only).
- Seed/mock data for `categories` and `transactions` (copy the mockup's seed arrays) so screens render realistic content without a backend.

Does NOT include (this spec):
- Any real HTTP call — no `HttpClient` usage yet. All state lives in the component/service layer as signals, exactly like the mockup's in-memory state.
- Auth/login screen or guard behavior — routes are open for now.
- Real file parsing for the import wizard — "upload" stays a button that simulates picking a file, same as the mockup.
- Investments/savings persistence beyond this session's local state — there's no backend for it yet (see roadmap item 4).

## Data model

No backend entities touched. Frontend-only mock state, colocated per feature, typed against the existing `core/models/*.model.ts` where a matching backend DTO already exists (`TransactionResponse`, `CategoryResponse`) — reuse those interfaces instead of inventing parallel mock types, so swapping to real HTTP data in spec 05 doesn't require a type rewrite.

New frontend-only types (no backend equivalent yet, mark clearly as such):
- `Investment { id, ticker, name, qty, avgCost, price, currency }`
- `Saving { id, label, amount, currency }`

## Screen-by-screen behavior (from the mockup)

**Sidebar**: Dashboard / Import Excel / Transacciones / Categorías / Ahorros + Inversiones / Analytics. Active item highlighted. Theme toggle switch at the bottom.

**Dashboard**:
- Date-mode switch: Mes (prev/next arrows + month/year label + year select) / Rango (from-to date inputs) / Año (year select).
- "Ver combinado en" ARS/USD toggle + "+ Agregar movimiento" button opening a quick-add modal (type, amount, currency, conditional exchange-rate field when USD, category select, description, date).
- 3 stat cards: ARS totals (income/expense/balance), USD totals (income/expense/balance), combined-in-selected-currency warning card.
- Category breakdown: donut gauge (conic-gradient) + list with per-category color dot, name, tx count, amount, percentage bar. Type (income/expense) and currency toggles. Empty state when no movements match.
- Side panels: "Últimos movimientos" (last 5), "Alertas" (empty state when none).

**Import Wizard** (3 steps, step indicator at top):
1. Drag/drop area (visual only) + "Simular selección de archivo" button + template download link. "Continuar" enabled only once a file is "picked".
2. Demo mode switch (simulate ok/error/loading outcomes) → loading state, OR rejected-file error state (category-count-over-limit message), OR preview: 4 stat tiles (valid rows, error rows, new categories, distinct categories), detected-rows table, row-errors list (blocks confirm), new-categories chips, "Confirmar importación" (disabled while there are row errors).
3. Success state with counts and "Ver dashboard" button.

**Transactions**: type/category/currency filter selects, row count + period label. Table (date, category, description, amount+currency badge, exchange rate, actions). Inline edit turns a row into editable inputs; delete requires an inline "¿Borrar? Sí/No" confirm step. Empty state when filters match nothing.

**Categories**: list (avatar-initial, name, tx count, type badge, edit/delete) + inline edit; delete blocked with an inline error message when the category has transactions. Side panel: new-category form (name + type select), disabled until name is filled.

**Analytics**: range switch (e.g. 3m/6m/12m/YTD). 3 stat cards (income/expense/savings-rate). Income-vs-expense bar chart (inline SVG) + savings-rate donut gauge. Top-spending-categories list with percentage bars.

**Investments** (tab switch: Portfolio / Savings):
- Portfolio tab: IOL connect/disconnect banner (visual toggle only — no real IOL integration, see spec's "investments module" roadmap item), ARS/USD portfolio cards + a "simulated quotes" notice card, donut allocation chart + evolution line chart (inline SVG), holdings table with inline edit/delete-with-confirm.
- Savings tab: ARS/USD saved totals, list with inline edit/delete, new-saving form.

## Edge cases / business rules

- All amount formatting: `$ ` prefix for ARS, `US$ ` prefix for USD, thousands-grouped (`toLocaleString('es-AR')` equivalent) — implement as a shared `currency-format` pipe (already scaffolded at `shared/pipes/currency-format.pipe.ts`), not repeated inline logic per component.
- Disabled-button states (save quick-add without amount/category, confirm import with row errors, add category without a name, etc.) must match the mockup exactly — these encode real validation the backend will also enforce in spec 05, so getting them right now avoids rework.
- Theme tokens (bg, cardBg, divider, accent, income/expense colors, etc.) belong in `styles.scss` as CSS custom properties toggled by a `data-theme` attribute or class on `<body>`, not duplicated per component.

## Out of scope / future

- Backend wiring (spec `05-frontend-backend-integration.md`).
- Real Excel parsing/upload (already backed by `POST /api/transactions/import/preview` on the backend — spec 05 connects it, this spec only mocks the UI states).
- Real IOL integration, real investment/savings persistence (roadmap item 4, no backend yet).
- Auth screen / route guards (spec 05).
