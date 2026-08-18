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

## Running the project

Three ways to run it, depending on what you are working on:

| Mode | When to use it | Needs installed |
| --- | --- | --- |
| [Everything with Docker](#1-everything-at-once-docker) | Just want the app running, or a demo | Docker |
| [Backend only](#2-backend-only) | Working on the API | JDK 25, Docker (for Postgres) |
| [Frontend only](#3-frontend-only) | Working on the UI | Node 22+, plus a running API |

Ports used: **51840** frontend, **51841** API, **51842** Postgres. They sit in the private
range (49152-65535) on purpose, so nothing here collides with another project's Angular on
4200 or Spring Boot on 8080. The same three ports are used in every mode, Docker or local.

### 1. Everything at once (Docker)

Builds and starts Postgres, the API and the frontend. Nothing else needs to be installed.

```bash
docker compose up -d --build   # from the repo root
```

Then open **`http://localhost:51840`**. Nginx serves the Angular app and proxies `/api`,
`/oauth2` and `/login/oauth2` to the backend, so everything runs on one origin.

- App: `http://localhost:51840`
- API: `http://localhost:51841`
- Swagger UI: `http://localhost:51841/swagger-ui/index.html`

Everyday commands:

```bash
docker compose ps                     # container status
docker compose logs -f backend        # follow the API logs
docker compose up -d --build backend  # rebuild just one service after a change
docker compose restart backend        # restart without rebuilding
docker compose down                   # stop everything (database survives)
docker compose down -v                # stop and wipe the database volume
```

**Configuration**: Google credentials are read from `backend/.env` (the same file the local
backend already uses), so there is nothing to duplicate. Everything else — `JWT_SECRET`, the
`DB_*` variables, `FRONTEND_ORIGIN` — has a dev default, and can be overridden from the
environment or a `.env` file at the repo root.

```bash
# backend/.env (git-ignored)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

For Google login to work, register **`http://localhost:51840/login/oauth2/code/google`** as an
authorized redirect URI in the Google console. In Docker the browser talks to the app on port
51840 and nginx forwards the OAuth2 callback to the API, so the URI Google sees carries port
51840, not 51841. Running the backend standalone (option 2) it is `http://localhost:51841/login/oauth2/code/google`
instead — register both if you use both modes.

### 2. Backend only

Postgres in Docker, the API from your JDK so you get hot reload and a debugger.

```bash
cd backend
docker compose up -d          # only Postgres, on port 51842
./mvnw spring-boot:run        # needs JDK 25 active (see backend/AGENTS.md)
```

- API: `http://localhost:51841`
- Swagger UI: `http://localhost:51841/swagger-ui/index.html`

```bash
./mvnw test                   # run the tests
./mvnw clean package          # build the jar into target/
docker compose down           # stop Postgres (data survives)
```

### 3. Frontend only

Needs an API already running on port 51841 — either `docker compose up -d backend` from the
root, or option 2 above.

```bash
cd frontend
npm install                   # first time only
npm start                     # ng serve, http://localhost:51840
```

`ng serve` proxies `/api`, `/oauth2` and `/login/oauth2` to `http://localhost:51841`
(`frontend/proxy.conf.json`), matching what nginx does in Docker: the app always talks to the
API on its own origin, so there is no API URL to configure per environment.

```bash
npm test                      # run the tests (vitest)
npm run build                 # production build into dist/
```

## Documentation

- `backend/AGENTS.md` + `backend/.agentic-rules/` — backend code conventions per layer (entity, dto, repository, service, controller, testing).
- `frontend/AGENTS.md` + `frontend/.agentic-rules/` — frontend code conventions (components, services, routing, styling, testing).
- `docs/specs/` — specs for each feature. Before implementing anything non-trivial, a spec is written there first (see `_TEMPLATE.md`).
