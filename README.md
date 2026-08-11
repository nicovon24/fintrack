# FinTrack

Personal finance app: income/expense management (with excel/CSV import), analytics, and investment tracking (live IOL brokerage holdings, dolar-blue-pesified ARS/USD totals, net worth). Learning project to practice Java/Spring Boot in depth and Angular, aimed at a role that combines both stacks.

## Structure

```text
fintrack/
├── backend/     # Java 21 (targets JDK 25 runtime) + Spring Boot 4 + PostgreSQL (Maven)
└── frontend/    # Angular 22, standalone components + signals (npm)
```

Each subfolder has its own `AGENTS.md` with the code conventions for that part of the stack — read it before touching code there, whether you or an AI agent.

## Features

- **Transactions**: income/expense CRUD, categories, monthly summary.
- **Import**: Excel (Apache POI) and CSV/TXT import wizards.
- **Auth**: Google OAuth2 login, JWT sessions.
- **Dashboard & Analytics**: combined ARS+USD totals (pesified at the dolar-blue rate), category breakdown, monthly bars, savings rate.
- **Investments** (`/investments`, "Mi capital" in the sidebar): three tabs —
  - *Inversiones*: live portfolio from the user's IOL (invertironline.com) account — holdings, cash, ARS/USD toggle. Nothing from IOL is persisted server-side (see `docs/specs/07-savings-investments-and-export.md`).
  - *Ahorros*: manual cash/bank entries, persisted in the browser's `localStorage` (no backend entity yet).
  - *Patrimonio*: consolidated net worth (investments + bank + cash) in a single number.
- **Privacy mode**: sidebar toggle that masks every displayed amount (`$ ••••`) for demos/screenshots, without touching descriptions, categories, or tickers.

## Roadmap

1. ✅ **v1 backend**: income/expense and category CRUD, monthly summary, Swagger.
2. ✅ Import existing excel/CSV files.
3. ✅ Angular frontend: dashboard, transactions, categories, analytics.
4. ✅ Investment module: live IOL holdings, ARS/USD toggle, net worth view.
5. 🔜 Backend-persisted savings (currently `localStorage`-only) and data export (CSV/XLSX/PDF) — see open items in `docs/specs/07-savings-investments-and-export.md`.

## Getting started (backend)

```bash
cd backend
docker compose up -d          # start local Postgres
./mvnw spring-boot:run        # requires an active JDK
```

- API: `http://localhost:8082`
- Swagger UI: `http://localhost:8082/swagger-ui/index.html`

```bash
./mvnw test                   # run the tests
```

## Getting started (frontend)

```bash
cd frontend
npm install
npm start                     # ng serve, http://localhost:4200
```

## Documentation

- `backend/AGENTS.md` + `backend/.agentic-rules/` — backend code conventions per layer (entity, dto, repository, service, controller, testing).
- `frontend/AGENTS.md` + `frontend/.agentic-rules/` — frontend code conventions (components, services, routing, styling, testing).
- `docs/specs/` — specs for each feature. Before implementing anything non-trivial, a spec is written there first (see `_TEMPLATE.md`).
