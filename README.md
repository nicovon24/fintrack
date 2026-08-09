# FinTrack

Personal finance app: income/expense management (with import from existing excel files) and investment analysis (real-time quotes, ARS/USD). Learning project to practice Java/Spring Boot in depth and Angular, aimed at a role that combines both stacks.

## Structure

```text
fintrack/
├── backend/     # Java 25 + Spring Boot 4 + PostgreSQL (Maven)
└── frontend/    # Angular (not started yet)
```

Each subfolder has its own `AGENTS.md` with the code conventions for that part of the stack — read it before touching code there, whether you or an AI agent.

## Roadmap

1. ✅ **v1 backend**: income/expense and category CRUD, monthly summary, Swagger.
2. 🔜 Import existing excel files (Apache POI) — load a full year of expenses/income at once.
3. 🔜 Angular frontend: dashboard with charts over the backend data.
4. 🔜 Investment module: holdings, real-time quotes (dolar blue/oficial, IOL), ARS/USD toggle.

## Getting started (backend)

```bash
cd backend
docker compose up -d          # start local Postgres
./mvnw spring-boot:run        # requires an active JDK 25
```

- API: `http://localhost:8082`
- Swagger UI: `http://localhost:8082/swagger-ui/index.html`

```bash
./mvnw test                   # run the tests
```

## Documentation

- `backend/AGENTS.md` + `backend/.agentic-rules/` — code conventions per layer (entity, dto, repository, service, controller, testing).
- `backend/docs/specs/` — specs for each feature. Before implementing anything non-trivial, a spec is written there first (see `_TEMPLATE.md`).
